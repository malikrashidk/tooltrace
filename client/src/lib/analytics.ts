import type { tools } from "@shared/schema";

// Use the canonical Tool type from schema
export type Tool = typeof tools.$inferSelect;

export function getMonthlySpend(tools: Tool[]): number {
  return tools
    .filter(t => t.isPaid)
    .reduce((sum, t) => sum + Number(t.billingAmount || 0), 0);
}

export function getYearlySpend(tools: Tool[]): number {
  return getMonthlySpend(tools) * 12;
}

export function getUpcomingRenewals(tools: Tool[], days: number): Tool[] {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + days);

  return tools.filter(t => {
    if (!t.isPaid || !t.nextRenewalDate) return false;
    const renewalDate = new Date(t.nextRenewalDate);
    return renewalDate >= now && renewalDate <= futureDate;
  }).sort((a, b) => {
    const dateA = new Date(a.nextRenewalDate!);
    const dateB = new Date(b.nextRenewalDate!);
    return dateA.getTime() - dateB.getTime();
  });
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
