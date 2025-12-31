import { Router } from "express";
import { paddleClient, PADDLE_WEBHOOK_SECRET } from "../lib/paddle";
import { storage } from "../storage";
import { EventName } from "@paddle/paddle-node-sdk";

const router = Router();

// Map Paddle price IDs to internal plan names
// We check both backend-specific env vars and VITE_ prefixed vars in case they are shared
const PRICE_ID_TO_PLAN: Record<string, string> = {
  [process.env.PADDLE_PRICE_ID_PRO_MONTHLY || process.env.VITE_PADDLE_PRICE_ID_PRO || "pri_pro_monthly_placeholder"]: "pro",
  [process.env.PADDLE_PRICE_ID_PRO_YEARLY || "pri_pro_yearly_placeholder"]: "pro",
  [process.env.PADDLE_PRICE_ID_ENTERPRISE_MONTHLY || process.env.VITE_PADDLE_PRICE_ID_ENTERPRISE || "pri_enterprise_monthly_placeholder"]: "enterprise",
  [process.env.PADDLE_PRICE_ID_ENTERPRISE_YEARLY || "pri_enterprise_yearly_placeholder"]: "enterprise",
};

const PLAN_LIMITS: Record<string, string> = {
  free: "10",
  pro: "999999", // Unlimited
  enterprise: "999999",
};

router.post("/webhooks/paddle", async (req, res) => {
  const signature = req.headers["paddle-signature"] as string;

  if (!signature || !PADDLE_WEBHOOK_SECRET || !paddleClient) {
    console.error("[Paddle Webhook] Missing signature or config");
    return res.status(400).send("Webhook verification failed");
  }

  try {
    // Verify signature using the Paddle SDK
    const eventData = await paddleClient.webhooks.unmarshal(
      JSON.stringify(req.body),
      PADDLE_WEBHOOK_SECRET,
      signature
    );

    if (!eventData) {
      return res.status(400).send("Invalid webhook payload");
    }

    console.log(`[Paddle Webhook] Received event: ${eventData.eventType}`);

    switch (eventData.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated: {
        const subscription = eventData.data;
        const customerId = subscription.customerId;
        const status = subscription.status; // 'active', 'past_due', etc.

        // Find user by Paddle Customer ID (if we stored it previously)
        // Or we might need to rely on `customData` pass-through from checkout
        // Paddle allows passing `custom_data` object in checkout.
        let userId = subscription.customData?.userId as string;

        if (!userId && customerId) {
          // Fallback: try to find user by paddleCustomerId
          // Note: We need to implement getUserByPaddleCustomerId in storage if we rely on this
          // For now, let's assume we pass userId in customData
        }

        if (!userId) {
          console.error("[Paddle Webhook] No userId found in customData");
          return res.status(200).send("Ignored: No userId");
        }

        // Determine plan based on items
        const priceId = subscription.items[0]?.price?.id;
        const plan = priceId ? (PRICE_ID_TO_PLAN[priceId] || "free") : "free";

        console.log(`[Paddle Webhook] Debug - Received Price ID: ${priceId}`);
        console.log(`[Paddle Webhook] Debug - Mapped to Plan: ${plan}`);
        console.log(`[Paddle Webhook] Debug - Known Price IDs:`, Object.keys(PRICE_ID_TO_PLAN));
        console.log(`[Paddle Webhook] Updating user ${userId} to plan ${plan} (Status: ${status})`);

        // Update User
        await storage.updateUser(userId, {
          paddleCustomerId: customerId,
          paddleSubscriptionId: subscription.id,
          plan: status === 'active' ? plan : 'free' // Downgrade if not active? Or handle strictly
        });

        // Update Subscription Table
        const userSubscription = await storage.getUserSubscription(userId);
        if (userSubscription) {
          await storage.updateSubscription(userSubscription.id, {
            plan: status === 'active' ? plan : 'free',
            status: status,
            toolsLimit: PLAN_LIMITS[plan] || "8",
            renewalDate: subscription.nextBilledAt ? new Date(subscription.nextBilledAt) : null,
          });
        } else {
          await storage.createSubscription({
            userId,
            plan: status === 'active' ? plan : 'free',
            status: status,
            toolsLimit: PLAN_LIMITS[plan] || "8",
            startDate: new Date(),
            renewalDate: subscription.nextBilledAt ? new Date(subscription.nextBilledAt) : null,
          });
        }
        break;
      }

      case EventName.SubscriptionCanceled: {
        const subscription = eventData.data;
        const userId = subscription.customData?.userId as string;

        if (userId) {
          console.log(`[Paddle Webhook] Subscription cancelled for user ${userId}`);
          // We might want to keep them on the plan until the end of the period
          // But usually cancellation is "scheduled". If status is "canceled", it's done.
          // Check effectiveFrom?

          await storage.updateUser(userId, { plan: "free" });
          const userSub = await storage.getUserSubscription(userId);
          if (userSub) {
            await storage.updateSubscription(userSub.id, {
              plan: "free",
              status: "cancelled",
              toolsLimit: "8",
              cancelledAt: new Date(),
            });
          }
        }
        break;
      }

      // Handle one-off payments if needed, but we focus on subscriptions
      case EventName.TransactionCompleted: {
        // Log payment in payments table
        const txn = eventData.data;
        const userId = txn.customData?.userId as string;
        if (userId) {
           await storage.createPayment({
             userId,
             amount: txn.details?.totals?.total || "0",
             currency: txn.currencyCode,
             status: txn.status,
             paddlePaymentId: txn.id,
             description: `Paddle Transaction ${txn.id}`
           });
        }
        break;
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("[Paddle Webhook] Error processing webhook:", error);
    res.status(500).send("Server Error");
  }
});

export default router;
