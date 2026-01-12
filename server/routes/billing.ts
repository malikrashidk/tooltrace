import { Router } from "express";
import { polarClient, verifyPolarWebhook } from "../lib/polar";
import { storage } from "../storage";
import { toCents } from "../../shared/money";

const router = Router();

// Map Polar product price IDs to internal plan names
const POLAR_PRICE_ID_TO_PLAN: Record<string, string> = {
  [process.env.POLAR_PRICE_ID_PRO_MONTHLY || process.env.VITE_POLAR_PRICE_ID_PRO || "pri_pro_monthly_placeholder"]: "pro",
  [process.env.POLAR_PRICE_ID_PRO_YEARLY || process.env.VITE_POLAR_PRICE_ID_PRO_YEARLY || "pri_pro_yearly_placeholder"]: "pro",
  [process.env.POLAR_PRICE_ID_ENTERPRISE_MONTHLY || process.env.VITE_POLAR_PRICE_ID_ENTERPRISE || "pri_enterprise_monthly_placeholder"]: "enterprise",
  [process.env.POLAR_PRICE_ID_ENTERPRISE_YEARLY || process.env.VITE_POLAR_PRICE_ID_ENTERPRISE_YEARLY || "pri_enterprise_yearly_placeholder"]: "enterprise",
};

console.log("[Billing] Polar Price ID Mapping Initialized:", JSON.stringify(POLAR_PRICE_ID_TO_PLAN, null, 2));

const PLAN_LIMITS: Record<string, string> = {
  free: "10",
  pro: "999999", // Unlimited
  enterprise: "999999",
};

/**
 * Polar Webhook Handler
 * 
 * Handles webhooks from Polar.sh for subscription and order events
 * Docs: https://docs.polar.sh/api/webhooks
 * 
 * Key events:
 * - order.created: New one-time purchase or first subscription payment
 * - subscription.created: New subscription started
 * - subscription.updated: Subscription status changed
 * - subscription.active: Subscription is now active
 * - subscription.canceled: Subscription canceled
 */
router.post("/webhooks/polar", async (req, res) => {
  try {
    // Get the raw body for signature verification
    const rawBody = JSON.stringify(req.body);

    // Verify webhook signature
    const isValid = await verifyPolarWebhook(rawBody, req.headers);

    if (!isValid) {
      console.error("[Polar Webhook] Signature verification failed");
      return res.status(401).send("Unauthorized");
    }

    const event = req.body;
    const eventType = event.type;

    console.log(`[Polar Webhook] Received event: ${eventType}`);
    console.log(`[Polar Webhook] Event data:`, JSON.stringify(event, null, 2));

    // Handle different event types
    switch (eventType) {
      case "order.created": {
        // New order (one-time or first subscription payment)
        const order = event.data;
        const userId = order.metadata?.userId as string;

        if (!userId) {
          console.warn("[Polar Webhook] No userId in order metadata");
          return res.status(200).send("OK - No userId");
        }

        // Log payment
        await storage.createPayment({
          userId,
          amount: String(toCents(order.amount)),
          currency: order.currency,
          status: "completed",
          polarOrderId: order.id,
          description: `Polar Order ${order.id}`,
        });

        console.log(`[Polar Webhook] Order logged for user ${userId}`);
        break;
      }

      case "subscription.created":
      case "subscription.active":
      case "subscription.updated": {
        // Subscription created or updated
        const subscription = event.data;
        const userId = subscription.metadata?.userId as string;

        if (!userId) {
          console.warn("[Polar Webhook] No userId in subscription metadata");
          return res.status(200).send("OK - No userId");
        }

        // Determine plan from product price ID
        const priceId = subscription.price_id;
        const plan = POLAR_PRICE_ID_TO_PLAN[priceId] || "free";
        const status = subscription.status; // 'active', 'canceled', 'incomplete', etc.

        console.log(`[Polar Webhook] Subscription for user ${userId}`);
        console.log(`[Polar Webhook] Price ID: ${priceId} -> Plan: ${plan}`);
        console.log(`[Polar Webhook] Status: ${status}`);

        // Update user and subscription
        const isActive = status === "active" || status === "trialing";

        await storage.updateUserSubscription(
          userId,
          {
            polarCustomerId: subscription.customer_id,
            polarSubscriptionId: subscription.id,
            plan: isActive ? plan : "free",
          },
          {
            plan: isActive ? plan : "free",
            status: status,
            toolsLimit: PLAN_LIMITS[plan] || "10",
            renewalDate: subscription.current_period_end
              ? new Date(subscription.current_period_end)
              : null,
          }
        );

        console.log(`[Polar Webhook] Updated user ${userId} to plan ${plan} (Status: ${status})`);
        break;
      }

      case "subscription.canceled": {
        // Subscription canceled
        const subscription = event.data;
        const userId = subscription.metadata?.userId as string;

        if (!userId) {
          console.warn("[Polar Webhook] No userId in canceled subscription");
          return res.status(200).send("OK - No userId");
        }

        console.log(`[Polar Webhook] Subscription canceled for user ${userId}`);

        // Mark subscription as canceled
        const userSub = await storage.getUserSubscription(userId);
        if (userSub) {
          await storage.updateSubscription(userSub.id, {
            status: "cancelled",
            cancelledAt: new Date(),
            // Keep renewalDate to show when access ends
            renewalDate: subscription.current_period_end
              ? new Date(subscription.current_period_end)
              : userSub.renewalDate,
          });

          // Note: Don't downgrade plan immediately - let them use until period end
          console.log(`[Polar Webhook] Subscription ${userSub.id} marked as cancelled`);
        }
        break;
      }

      case "subscription.revoked": {
        // Subscription revoked (immediate cancellation, e.g., refund)
        const subscription = event.data;
        const userId = subscription.metadata?.userId as string;

        if (!userId) {
          console.warn("[Polar Webhook] No userId in revoked subscription");
          return res.status(200).send("OK - No userId");
        }

        console.log(`[Polar Webhook] Subscription REVOKED for user ${userId}`);

        // Immediately downgrade to free
        await storage.updateUserSubscription(
          userId,
          {
            plan: "free",
            polarSubscriptionId: null,
          },
          {
            plan: "free",
            status: "cancelled",
            toolsLimit: "10",
            cancelledAt: new Date(),
          }
        );

        console.log(`[Polar Webhook] User ${userId} immediately downgraded to free`);
        break;
      }

      default:
        console.log(`[Polar Webhook] Unhandled event type: ${eventType}`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("[Polar Webhook] Error processing webhook:", error);
    res.status(500).send("Server Error");
  }
});

/**
 * Optional: Create a checkout session endpoint
 * This can be used by the frontend to create checkout sessions via API
 * 
 * NOTE: Currently using popup-based checkout in frontend (client/src/lib/polar.ts)
 * This endpoint is optional and can be implemented if needed for backend-initiated checkouts
 */
/*
router.post("/create-checkout", async (req, res) => {
  try {
    const { productPriceId, email, userId } = req.body;

    if (!polarClient) {
      return res.status(500).json({ error: "Polar not configured" });
    }

    if (!productPriceId) {
      return res.status(400).json({ error: "productPriceId required" });
    }

    // Create checkout session using Polar SDK
    // Refer to Polar SDK documentation for exact API
    const checkout = await polarClient.checkouts.create({
      // Polar checkout creation parameters
      // Check SDK docs: https://docs.polar.sh
    });

    res.json({ 
      checkoutUrl: checkout.url,
      checkoutId: checkout.id,
    });
  } catch (error) {
    console.error("[Billing] Failed to create checkout:", error);
    res.status(500).json({ error: "Failed to create checkout" });
  }
});
*/

export default router;
