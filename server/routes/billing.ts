import { Router } from "express";
import { polarClient, verifyPolarWebhook, listSubscriptionsByEmail } from "../lib/polar";
import { storage } from "../storage";
import { toCents } from "../../shared/money";
import { authMiddleware } from "../middleware";
import { syncUserSubscription } from "../lib/sync-utils";

const router = Router();

// Map Polar product or price IDs to internal plan names
// We use both VITE_ and standard env vars to be resilient
const POLAR_ID_TO_PLAN: Record<string, string> = {
  [process.env.POLAR_PRICE_ID_PRO_MONTHLY || process.env.VITE_POLAR_PRICE_ID_PRO || ""]: "pro",
  [process.env.POLAR_PRICE_ID_PRO_YEARLY || process.env.VITE_POLAR_PRICE_ID_PRO_YEARLY || ""]: "pro",
  [process.env.POLAR_PRICE_ID_ENTERPRISE_MONTHLY || process.env.VITE_POLAR_PRICE_ID_ENTERPRISE || ""]: "enterprise",
  [process.env.POLAR_PRICE_ID_ENTERPRISE_YEARLY || process.env.VITE_POLAR_PRICE_ID_ENTERPRISE_YEARLY || ""]: "enterprise",
};

// Aliases for compatibility if needed
const PLAN_ALIASES: Record<string, string> = {
  pro: "pro",
  enterprise: "enterprise",
  standard: "pro",
  premium: "enterprise"
};

// Remove empty keys
Object.keys(POLAR_ID_TO_PLAN).forEach(key => {
  if (key === "" || key === "undefined") delete POLAR_ID_TO_PLAN[key];
});

console.log("[Billing] Polar ID Mapping Initialized:", JSON.stringify(POLAR_ID_TO_PLAN, null, 2));

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
    // For signature verification, we MUST use the exact raw body string/buffer
    // We captured this in server/app.ts as req.rawBody
    const payload = (req as any).rawBody || JSON.stringify(req.body);

    // Verify webhook signature
    const isValid = await verifyPolarWebhook(payload, req.headers);

    if (!isValid) {
      console.error("[Polar Webhook] Signature verification failed");
      return res.status(401).send("Unauthorized");
    }

    const event = req.body;
    const eventType = event.type;

    console.log(`[Polar Webhook] Received event: ${eventType}`);
    // console.log(`[Polar Webhook] Event data:`, JSON.stringify(event, null, 2));

    /**
     * Helper to find a user from a Polar event
     */
    const findUserFromPolarEvent = async (data: any) => {
      // 1. Try userId in metadata
      let userId = data.metadata?.userId as string;
      if (userId) {
        console.log(`[Polar Webhook] Found userId in metadata: ${userId}`);
        const user = await storage.getUser(userId);
        if (user) return user;
      }

      // 2. Try customer external_id (which we set to our userId)
      const externalId = data.customer?.external_id || data.customer_external_id;
      if (externalId && typeof externalId === 'string') {
        console.log(`[Polar Webhook] Found externalId: ${externalId}`);
        const user = await storage.getUser(externalId);
        if (user) return user;
      }

      // 3. Try lookup by polarCustomerId
      const polarCustomerId = data.customer_id;
      if (polarCustomerId) {
        console.log(`[Polar Webhook] Looking up by polarCustomerId: ${polarCustomerId}`);
        const user = await storage.getUserByPolarCustomerId(polarCustomerId);
        if (user) return user;
      }

      // 4. Try email from customer object as last resort
      const email = data.customer?.email || data.customer_email;
      if (email) {
        console.log(`[Polar Webhook] Looking up by email: ${email}`);
        const user = await storage.getUserByEmail(email);
        if (user) return user;
      }

      console.warn(`[Polar Webhook] Could not find user for event: ${eventType}`, JSON.stringify({
        metadata: data.metadata,
        customerId: data.customer_id,
        externalId: externalId
      }));
      return null;
    };

    // Handle different event types
    switch (eventType) {
      case "order.created": {
        // New order (one-time or first subscription payment)
        const order = event.data;
        const user = await findUserFromPolarEvent(order);

        if (!user) {
          return res.status(200).send("OK - No user found");
        }

        // Log payment
        await storage.createPayment({
          userId: user.id,
          amount: String(toCents(order.amount)),
          currency: order.currency,
          status: "completed",
          polarOrderId: order.id,
          description: `Polar Order ${order.id}`,
        });

        console.log(`[Polar Webhook] Order logged for user ${user.id}`);
        break;
      }

      case "subscription.created":
      case "subscription.active":
      case "subscription.updated": {
        // Subscription created or updated
        const subscription = event.data;
        const user = await findUserFromPolarEvent(subscription);

        if (!user) {
          return res.status(200).send("OK - No user found");
        }

        // Determine plan from product ID OR price ID
        const priceId = subscription.price_id;
        const productId = subscription.product_id;
        const plan = POLAR_ID_TO_PLAN[priceId] || POLAR_ID_TO_PLAN[productId] || "free";
        const status = subscription.status; // 'active', 'canceled', 'incomplete', etc.

        console.log(`[Polar Webhook] Subscription for user ${user.id}`);
        console.log(`[Polar Webhook] Price ID: ${priceId}, Product ID: ${productId} -> Plan: ${plan}`);
        console.log(`[Polar Webhook] Status: ${status}`);

        // Update user and subscription
        const isActive = status === "active" || status === "trialing";

        await storage.updateUserSubscription(
          user.id,
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

        // --- UPGRADE CLEANUP ---
        // If they just got a new subscription and it's different from the old one,
        // we should cancel the old one in Polar to avoid double billing.
        const oldSubId = user.polarSubscriptionId;
        if (isActive && oldSubId && oldSubId !== subscription.id) {
          console.log(`[Polar Webhook] New subscription ${subscription.id} is different from old ${oldSubId}. Revoking old one...`);
          const { cancelSubscription } = await import("../lib/polar");
          try {
            await cancelSubscription(oldSubId);
            console.log(`[Polar Webhook] Successfully revoked old sub ${oldSubId}`);
          } catch (err) {
            console.error(`[Polar Webhook] Failed to revoke old sub ${oldSubId}:`, err);
          }
        }

        console.log(`[Polar Webhook] Updated user ${user.id} (${user.email}) to plan ${plan} (Status: ${status})`);
        break;
      }

      case "subscription.canceled": {
        // Subscription canceled
        const subscription = event.data;
        const user = await findUserFromPolarEvent(subscription);

        if (!user) {
          return res.status(200).send("OK - No user found");
        }

        console.log(`[Polar Webhook] Subscription canceled for user ${user.id}`);

        // Mark subscription as canceled
        const userSub = await storage.getUserSubscription(user.id);
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
        const user = await findUserFromPolarEvent(subscription);

        if (!user) {
          return res.status(200).send("OK - No user found");
        }

        console.log(`[Polar Webhook] Subscription REVOKED for user ${user.id}`);

        // Immediately downgrade to free
        await storage.updateUserSubscription(
          user.id,
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

        console.log(`[Polar Webhook] User ${user.id} immediately downgraded to free`);
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
 * POST /api/billing/checkout
 * Create a Polar checkout session and return the URL
 */
router.post("/checkout", authMiddleware, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized", message: "Please log in to continue" });
  }

  const { productPriceId } = req.body;
  if (!productPriceId) {
    return res.status(400).send("Product Price ID is required");
  }

  if (!polarClient) {
    return res.status(503).send("Billing system not configured");
  }

  try {
    const user = req.user as any;

    // --- PROACTIVE SYNC: Use centralized helper ---
    let polarSubscriptionId = user.polarSubscriptionId;

    if (!polarSubscriptionId) {
      const syncResult = await syncUserSubscription(user.id, user.email);
      if (syncResult) {
        polarSubscriptionId = syncResult.subscriptionId;
      }
    }

    // Create a checkout session using the SDK
    const currentPlan = (user.plan || "").toString().toLowerCase();
    const isFree = currentPlan === "free" || !currentPlan;

    // --- PAID USER UPGRADE FLOW ---
    if (!isFree && polarSubscriptionId) {
      console.log(`[Checkout] User ${user.email} has active paid sub ${polarSubscriptionId}. Attempting direct update.`);
      try {
        // Since we have 4 separate Products (Pro Monthly, Pro Yearly, Ent Monthly, Ent Yearly),
        // the id sent from frontend IS the target Product ID (or mapped directly to it).
        // No need to look up which product contains a price.
        const targetProductId = productPriceId;

        if (targetProductId) {
          const { updateSubscription } = await import("../lib/polar");
          await updateSubscription(polarSubscriptionId, targetProductId);

          console.log(`[Checkout] Successfully updated subscription ${polarSubscriptionId} to product ${targetProductId}`);

          // Return success URL immediately to trigger dashboard refresh logic
          const successUrl = `${process.env.VITE_APP_URL || 'https://app.tooltrace.io'}/dashboard?checkout=success`;
          return res.json({ url: successUrl });
        }

      } catch (err: any) {
        console.error("[Checkout] Update attempted but failed:", err);
        return res.status(500).json({
          error: "Upgrade failed",
          message: "Could not update your subscription automatically. Please contact support."
        });
      }
    }

    const checkout = await polarClient.checkouts.create({
      products: [productPriceId],
      successUrl: `${process.env.VITE_APP_URL || 'https://app.tooltrace.io'}/dashboard?checkout=success`,
      customerEmail: user.email,
      // Polar: Only pass subscriptionId for upgrades FROM a free plan
      // Passing it for paid-to-paid causes "Only free subscriptions can be upgraded" error
      subscriptionId: isFree ? (polarSubscriptionId || undefined) : undefined,
      // Link to our internal user ID
      externalCustomerId: user.id,
      // Pass metadata so we can identify the user in the webhook
      metadata: {
        userId: user.id
      }
    });

    res.json({ url: checkout.url });
  } catch (error: any) {
    console.error("[Polar Checkout] Error creating session:", error);
    res.status(500).json({
      error: "Failed to create checkout session",
      message: error.message
    });
  }
});

export default router;
