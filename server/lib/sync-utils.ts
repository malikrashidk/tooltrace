import { storage } from "../storage";
import { listSubscriptionsByEmail, polarClient } from "./polar";
import { resolvePlanFromIds, PLAN_LIMITS } from "./polar-constants";

/**
 * Syncs a user's subscription status from Polar.sh
 * This is useful for:
 * 1. Users who buy from branding site before signing up (claim on signup)
 * 2. Fixing sync issues after payment
 * 3. Ensuring upgrade/downgrade status is correct
 */
export async function syncUserSubscription(userId: string, email: string) {
    if (!polarClient) {
        console.warn(`[Sync] Polar client not initialized, cannot sync for ${email}`);
        return null;
    }

    try {
        console.log(`[Sync] ========== STARTING SYNC FOR ${email} (User: ${userId}) ==========`);
        const existingSubs = await listSubscriptionsByEmail(email);

        console.log(`[Sync] Found ${existingSubs?.length || 0} subscription(s) for ${email}`);

        if (existingSubs && existingSubs.length > 0) {
            // Find the most relevant active subscription (prefer Pro/Enterprise over Free)
            const activeSub = existingSubs[0];

            const subData = activeSub as any;
            const priceId = subData.priceId || subData.price_id || "";
            const productId = activeSub.productId;

            console.log(`[Sync] Subscription Details:`, {
                subscriptionId: activeSub.id,
                priceId,
                productId,
                status: activeSub.status,
                customerId: activeSub.customerId
            });

            const plan = resolvePlanFromIds(priceId, productId);
            const isActive = activeSub.status === "active" || activeSub.status === "trialing";

            console.log(`[Sync] Resolved plan: ${plan} | Is Active: ${isActive}`);

            if (!isActive) {
                console.warn(`[Sync] Subscription status is "${activeSub.status}", not updating to paid plan`);
            }

            // Update user record
            console.log(`[Sync] Updating user record with plan: ${isActive ? plan : "free"}`);
            await storage.updateUser(userId, {
                polarSubscriptionId: activeSub.id,
                polarCustomerId: activeSub.customerId,
                plan: (isActive ? plan : "free") as any
            });

            // Update subscription record
            const userSub = await storage.getUserSubscription(userId);
            if (userSub) {
                console.log(`[Sync] Updating existing subscription record ${userSub.id}`);
                await storage.updateSubscription(userSub.id, {
                    plan: (isActive ? plan : "free") as any,
                    status: activeSub.status as any,
                    renewalDate: activeSub.currentPeriodEnd ? new Date(activeSub.currentPeriodEnd) : null,
                    toolsLimit: PLAN_LIMITS[plan] || "10"
                });
            } else {
                console.log(`[Sync] Creating new subscription record`);
                await storage.createSubscription({
                    userId,
                    plan: (isActive ? plan : "free") as any,
                    status: activeSub.status as any,
                    renewalDate: activeSub.currentPeriodEnd ? new Date(activeSub.currentPeriodEnd) : null,
                    toolsLimit: PLAN_LIMITS[plan] || "10"
                });
            }

            console.log(`[Sync] ========== SYNC COMPLETE: Plan set to ${isActive ? plan : "free"} ==========`);
            return { plan, subscriptionId: activeSub.id };
        }

        console.log(`[Sync] No active subscriptions found for ${email}`);
        return null;
    } catch (error) {
        console.error(`[Sync] ========== ERROR syncing ${email}:`, error);
        return null;
    }
}
