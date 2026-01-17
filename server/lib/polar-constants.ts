/**
 * Polar ID Mapping Constants
 * Consolidates Price and Product IDs to plan names
 */

export function getPolarIdToPlanMap(): Record<string, string> {
    const map: Record<string, string> = {
        // Price IDs
        [process.env.POLAR_PRICE_ID_PRO_MONTHLY || ""]: "pro",
        [process.env.POLAR_PRICE_ID_PRO_YEARLY || ""]: "pro",
        [process.env.POLAR_PRICE_ID_ENTERPRISE_MONTHLY || ""]: "enterprise",
        [process.env.POLAR_PRICE_ID_ENTERPRISE_YEARLY || ""]: "enterprise",

        // Legacy / VITE prefixed Fallbacks
        [process.env.VITE_POLAR_PRICE_ID_PRO || ""]: "pro",
        [process.env.VITE_POLAR_PRICE_ID_PRO_YEARLY || ""]: "pro",
        [process.env.VITE_POLAR_PRICE_ID_ENTERPRISE || ""]: "enterprise",
        [process.env.VITE_POLAR_PRICE_ID_ENTERPRISE_YEARLY || ""]: "enterprise",

        // Product IDs
        [process.env.POLAR_PRODUCT_ID_PRO || ""]: "pro",
        [process.env.POLAR_PRODUCT_ID_ENTERPRISE || ""]: "enterprise",
    };

    // Remove empty keys
    Object.keys(map).forEach(key => {
        if (key === "" || key === "undefined") delete map[key];
    });

    return map;
}

export function resolvePlanFromIds(priceId?: string | null, productId?: string | null): string {
    const map = getPolarIdToPlanMap();

    if (priceId && map[priceId]) return map[priceId];
    if (productId && map[productId]) return map[productId];

    return "free";
}

export const PLAN_LIMITS: Record<string, string> = {
    free: "10",
    pro: "999999",
    enterprise: "999999",
};
