import { storage } from "../storage";
import { listSubscriptionsByEmail, polarClient } from "./polar";

/**
 * Syncs a user's subscription status from Polar.sh
 * This is useful for:
 * 1. Users who buy from branding site before signing up (claim on signup)
 * 2. Fixing sync issues after payment
 * 3. Ensuring upgrade/downgrade status is correct
 */
export async function syncUserSubscription(userId: string, email: string) {
    if (!polarClient) return null;

    try {
        console.log(`[Sync] Syncing Polar subscription for ${email} (User: ${userId})`);
        const existingSubs = await listSubscriptionsByEmail(email);

        if (existingSubs && existingSubs.length > 0) {
            // Find the most relevant active subscription (prefer Pro/Enterprise over Free)
            // Actually, listSubscriptionsByEmail only returns active ones.
            const activeSub = existingSubs[0];

            // Map Polar IDs to plans (re-using mapping logic)
            // We use both VITE_ and standard env vars to be resilient
            // Now including Product IDs for robust resolution
            const POLAR_ID_TO_PLAN: Record<string, string> = {
                [process.env.POLAR_PRICE_ID_PRO_MONTHLY || process.env.VITE_POLAR_PRICE_ID_PRO || ""]: "pro",
                [process.env.POLAR_PRICE_ID_PRO_YEARLY || process.env.VITE_POLAR_PRICE_ID_PRO_YEARLY || ""]: "pro",
                [process.env.POLAR_PRICE_ID_ENTERPRISE_MONTHLY || process.env.VITE_POLAR_PRICE_ID_ENTERPRISE || ""]: "enterprise",
                [process.env.POLAR_PRICE_ID_ENTERPRISE_YEARLY || process.env.VITE_POLAR_PRICE_ID_ENTERPRISE_YEARLY || ""]: "enterprise",

                // Add support for Product IDs directly if available in env
                [process.env.POLAR_PRODUCT_ID_PRO || ""]: "pro",
                [process.env.POLAR_PRODUCT_ID_ENTERPRISE || ""]: "enterprise"
            };

            const subData = activeSub as any;
            const priceId = subData.priceId || subData.price_id || "";
            const productId = activeSub.productId;

            const plan = POLAR_ID_TO_PLAN[priceId] || POLAR_ID_TO_PLAN[productId] || "free";
            const isActive = activeSub.status === "active" || activeSub.status === "trialing";

            console.log(`[Sync] Found active sub ${activeSub.id} for plan ${plan}. Updating DB...`);

            // Update user record
            await storage.updateUser(userId, {
                polarSubscriptionId: activeSub.id,
                polarCustomerId: activeSub.customerId,
                plan: (isActive ? plan : "free") as any
            });

            // Update subscription record
            const userSub = await storage.getUserSubscription(userId);
            if (userSub) {
                await storage.updateSubscription(userSub.id, {
                    plan: (isActive ? plan : "free") as any,
                    status: activeSub.status as any,
                    renewalDate: activeSub.currentPeriodEnd ? new Date(activeSub.currentPeriodEnd) : null,
                    toolsLimit: (plan === "pro" || plan === "enterprise") ? "999999" : "10"
                });
            } else {
                // Create if missing
                await storage.createSubscription({
                    userId,
                    plan: (isActive ? plan : "free") as any,
                    status: activeSub.status as any,
                    renewalDate: activeSub.currentPeriodEnd ? new Date(activeSub.currentPeriodEnd) : null,
                    toolsLimit: (plan === "pro" || plan === "enterprise") ? "999999" : "10"
                });
            }

            return { plan, subscriptionId: activeSub.id };
        }

        return null;
    } catch (error) {
        console.error(`[Sync] Error syncing ${email}:`, error);
        return null;
    }
}
