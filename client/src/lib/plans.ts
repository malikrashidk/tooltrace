export const PRICE_IDS = {
  pro: import.meta.env.VITE_PADDLE_PRICE_ID_PRO || "pri_pro_placeholder",
  enterprise: import.meta.env.VITE_PADDLE_PRICE_ID_ENTERPRISE || "pri_enterprise_placeholder"
};

export const PLANS = {
  FREE: "free",
  PRO: "pro",
  ENTERPRISE: "enterprise",
} as const;

export type PlanType = typeof PLANS[keyof typeof PLANS];

export function getPriceIdForPlan(plan: string): string | null {
  switch (plan.toLowerCase()) {
    case PLANS.PRO:
      return PRICE_IDS.pro;
    case PLANS.ENTERPRISE:
      return PRICE_IDS.enterprise;
    default:
      return null;
  }
}
