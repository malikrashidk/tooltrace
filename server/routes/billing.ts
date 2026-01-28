import { Router } from "express";
import { polarClient, verifyPolarWebhook } from "../lib/polar";
import { storage } from "../storage";
import { toCents } from "../../shared/money";
import { authMiddleware } from "../middleware";
import { syncUserSubscription } from "../lib/sync-utils";

import { resolvePlanFromIds, PLAN_LIMITS, getPolarIdToPlanMap } from "../lib/polar-constants";

const router = Router();

// Log Polar ID mapping information (count only for security/clarity in production)
const currentMap = getPolarIdToPlanMap();
console.log(`[Billing] Polar ID Mapping Initialized with ${Object.keys(currentMap).length} active IDs`);

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
  console.log(`[Polar Webhook] Request received: ${req.method} ${req.url}`);
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
      const userId = data.metadata?.userId as string;
      if (userId) {
        console.log(`[Polar Webhook] Attempting lookup by userId in metadata: ${userId}`);
        const user = await storage.getUser(userId);
        if (user) return user;
      }

      // 2. Try customer external_id (which we set to our userId)
      const externalId = data.customer?.external_id || data.customer_external_id;
      if (externalId && typeof externalId === 'string') {
        console.log(`[Polar Webhook] Attempting lookup by externalId: ${externalId}`);
        const user = await storage.getUser(externalId);
        if (user) return user;
      }

      // 3. Try lookup by polarCustomerId
      const polarCustomerId = data.customer_id;
      if (polarCustomerId) {
        console.log(`[Polar Webhook] Attempting lookup by polarCustomerId: ${polarCustomerId}`);
        const user = await storage.getUserByPolarCustomerId(polarCustomerId);
        if (user) return user;
      }

      // 4. Try email from customer object as last resort
      const email = data.customer?.email || data.customer_email;
      if (email) {
        console.log(`[Polar Webhook] Attempting lookup by email: ${email}`);
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

        // Proactively update plan from order if possible (important for 100% discounts)
        const plan = resolvePlanFromIds(order.product_price_id, order.product_id);
        if (plan && plan !== "free") {
          console.log(`[Polar Webhook] Order ${order.id} resolved to plan: ${plan}. Updating user...`);

          // Use a generic subscription update since we might not have a full sub object yet
          await storage.updateUserSubscription(
            user.id,
            { plan: plan as any },
            {
              plan: plan as any,
              status: "active",
              toolsLimit: PLAN_LIMITS[plan] || "10",
              // For orders, we might not have a renewal date yet, but sync will fill it later
            }
          );
        }

        console.log(`[Polar Webhook] Order logged and plan updated (if applicable) for user ${user.id}`);
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
        const plan = resolvePlanFromIds(priceId, productId);
        const status = subscription.status; // 'active', 'canceled', 'incomplete', etc.

        console.log(`[Polar Webhook] Subscription Event Data:`, {
          priceId,
          productId,
          resolvedPlan: plan,
          status,
          userId: user.id,
          mappingKeys: Object.keys(getPolarIdToPlanMap())
        });

        // Update user and subscription
        const isActive = status === "active" || status === "trialing";

        if (!isActive) {
          console.warn(`[Polar Webhook] Subscription for ${user.email} is NOT active (Status: ${status}). Plan update skipped.`);
        }

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
 * POST /api/billing/sync
 * Manually trigger a sync of the current user's subscription from Polar
 * Useful for post-payment UI updates to avoid webhook latency
 */
router.post("/sync", authMiddleware, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = req.user as any;
    console.log(`[Billing Sync] Proactive sync requested for ${user.email}`);

    const syncResult = await syncUserSubscription(user.id, user.email);

    if (syncResult) {
      console.log(`[Billing Sync] Sync successful. New plan: ${syncResult.plan}`);
      return res.json({
        success: true,
        plan: syncResult.plan,
        subscriptionId: syncResult.subscriptionId
      });
    }

    res.json({ success: false, message: "No active subscription found on Polar" });
  } catch (error: any) {
    console.error("[Billing Sync] Error during manual sync:", error);
    res.status(500).json({ error: "Sync failed", message: error.message });
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

    console.log(`[Checkout] ========== CHECKOUT REQUEST FOR ${user.email} ==========`);
    console.log(`[Checkout] Current State:`, {
      userId: user.id,
      currentPlan: user.plan,
      polarSubId: user.polarSubscriptionId,
      requestedProductId: productPriceId
    });

    // --- PROACTIVE SYNC: Use centralized helper ---
    let polarSubscriptionId = user.polarSubscriptionId;

    if (!polarSubscriptionId) {
      console.log(`[Checkout] No local subscription ID found, attempting sync...`);
      const syncResult = await syncUserSubscription(user.id, user.email);
      if (syncResult) {
        console.log(`[Checkout] Sync found subscription: ${syncResult.subscriptionId} with plan: ${syncResult.plan}`);
        polarSubscriptionId = syncResult.subscriptionId;
        // Re-fetch user to get updated plan
        const updatedUser = await storage.getUser(user.id);
        if (updatedUser) {
          user.plan = updatedUser.plan;
          console.log(`[Checkout] User plan updated to: ${user.plan}`);
        }
      } else {
        console.log(`[Checkout] Sync returned no subscription`);
      }
    }

    // Create a checkout session using the SDK
    const currentPlan = (user.plan || "").toString().toLowerCase();
    const isFree = currentPlan === "free" || currentPlan === "starter" || !currentPlan;

    // --- PAID USER UPGRADE FLOW (Instant Update) ---
    if (!isFree && polarSubscriptionId) {
      console.log(`[Checkout] User ${user.email} has active paid sub ${polarSubscriptionId}. Executing direct API update.`);
      try {
        let targetProductId: string | undefined = undefined;

        // 1. Direct environment check (Fastest)
        const targetPlan = resolvePlanFromIds(productPriceId);

        // If 'productPriceId' is already present in our mapping, it means it's a valid ID for that plan.
        // The user confirmed their "Price IDs" are actually Product IDs, so we can use it directly.
        if (targetPlan) {
          targetProductId = productPriceId;
          console.log(`[Checkout] Using provided ID ${productPriceId} as target Product ID for plan ${targetPlan}`);
        }

        // 2. SDK lookup (Fallback - only if still not resolved)
        if (!targetProductId) {
          console.log(`[Checkout] ID ${productPriceId} not in local map. Attempting SDK lookup...`);
          try {
            const productsResponse = await polarClient.products.list({});
            for await (const page of productsResponse) {
              const products = (page as any).items || [];
              for (const product of products) {
                // Check if the input ID matches the Product ID directly OR any of its Price IDs
                const isProductMatch = product.id === productPriceId;
                const isPriceMatch = product.prices?.some((p: any) => p.id === productPriceId);

                if (isProductMatch || isPriceMatch) {
                  console.log(`[Checkout] Resolved ${productPriceId} to Product ID ${product.id} via SDK (${isProductMatch ? 'Direct' : 'Price'} match)`);
                  targetProductId = product.id;
                  break;
                }
              }
              if (targetProductId) break;
            }
          } catch (lookupErr) {
            console.warn('[Checkout] Product lookup failed:', lookupErr);
          }
        }

        if (targetProductId) {
          const { updateSubscription } = await import("../lib/polar");
          await updateSubscription(polarSubscriptionId, targetProductId);

          console.log(`[Checkout] Successfully updated subscription ${polarSubscriptionId} to product ${targetProductId}`);

          // Sync immediately so the user record is updated before they redirect back
          await syncUserSubscription(user.id, user.email);

          const successUrl = `${process.env.VITE_APP_URL || 'https://app.tooltrace.io'}/dashboard?checkout=upgrade_success`;
          return res.json({ url: successUrl });
        } else {
          console.warn(`[Checkout] Could not resolve ${productPriceId} to a Product ID.`);
          // CRITICAL: For paid users, if we can't resolve the ID, redirect to Customer Portal
          // NEVER fall back to a standard checkout which will conflict.
          const { getPolarCustomerPortalUrl } = await import("../lib/polar");
          return res.json({ url: getPolarCustomerPortalUrl() });
        }

      } catch (err: any) {
        console.error("[Checkout] Instant update failed. Redirecting to Customer Portal for safety.", err);
        // Fall back to Customer Portal instead of a new checkout
        const { getPolarCustomerPortalUrl } = await import("../lib/polar");
        return res.json({ url: getPolarCustomerPortalUrl() });
      }
    }

    // --- SAFETY NET: NEVER send a paid user to a fresh checkout if they have no sub ID locally ---
    // If the code reached here it means isFree is true OR (!isFree but polarSubscriptionId was somehow undefined)
    // If they aren't free, something is wrong with their sub record, Portal is the only safe place.
    if (!isFree) {
      console.warn(`[Checkout] Paid user ${user.email} reached standard checkout path (Sub ID missing). Forcing Portal redirect.`);
      const { getPolarCustomerPortalUrl } = await import("../lib/polar");
      return res.json({ url: getPolarCustomerPortalUrl() });
    }

    // --- DEFAULT: STANDARD CHECKOUT SESSION (ONLY FOR NEW/FREE USERS) ---
    const checkout = await polarClient.checkouts.create({
      products: [productPriceId],
      successUrl: `${process.env.VITE_APP_URL || 'https://app.tooltrace.io'}/dashboard?checkout=success`,
      customerEmail: user.email,
      // Polar: Only pass subscriptionId for upgrades FROM a free plan
      subscriptionId: isFree ? (polarSubscriptionId || undefined) : undefined,
      externalCustomerId: user.id,
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
