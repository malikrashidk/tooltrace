export const PRICE_IDS = {
  pro: {
    monthly: import.meta.env.VITE_POLAR_PRICE_ID_PRO || "pri_pro_placeholder",
    yearly: import.meta.env.VITE_POLAR_PRICE_ID_PRO_YEARLY || "pri_pro_yearly_placeholder",
  },
  enterprise: {
    monthly: import.meta.env.VITE_POLAR_PRICE_ID_ENTERPRISE || "pri_enterprise_placeholder",
    yearly: import.meta.env.VITE_POLAR_PRICE_ID_ENTERPRISE_YEARLY || "pri_enterprise_yearly_placeholder",
  }
};

export const PLANS = {
  FREE: "free",
  PRO: "pro",
  ENTERPRISE: "enterprise",
} as const;

export type PlanType = typeof PLANS[keyof typeof PLANS];

export function getPriceIdForPlan(plan: string, cycle: "monthly" | "yearly" = "monthly"): string | null {
  switch (plan.toLowerCase()) {
    case PLANS.PRO:
      return cycle === "monthly" ? PRICE_IDS.pro.monthly : PRICE_IDS.pro.yearly;
    case PLANS.ENTERPRISE:
      return cycle === "monthly" ? PRICE_IDS.enterprise.monthly : PRICE_IDS.enterprise.yearly;
    default:
      return null;
  }
}
