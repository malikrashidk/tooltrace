import type { Tool } from "@/lib/analytics";

export const mockCategories: string[] = ["Productivity", "Design", "DevTools", "Utilities"];

export const mockTools: Tool[] = [
  {
    id: "t1",
    name: "Example Tool",
    websiteUrl: "https://example.com",
    logoUrl: null,
    notes: null,
    isPaid: true,
    billingAmount: 9.99,
    billingCycle: "monthly",
    nextRenewalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    categories: [mockCategories[0]],
    tags: ["team"],
    usageFrequency: "weekly",
  } as unknown as Tool,
];

export function getUpcomingRenewals(tools: Tool[], daysAhead = 30) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return tools
    .filter((t) => t.nextRenewalDate)
    .map((t) => ({ ...t, nextRenewalDate: new Date(t.nextRenewalDate as any) }))
    .filter((t) => (t.nextRenewalDate as Date) >= now && (t.nextRenewalDate as Date) <= cutoff)
    .sort((a, b) => ((a.nextRenewalDate as Date).getTime() - (b.nextRenewalDate as Date).getTime()));
}

export function getLowUsageTools(tools: Tool[], threshold = 5) {
  return tools.filter((t) => t.usageFrequency === "rarely" || (t.billingAmount !== null && Number(t.billingAmount) < threshold));
}

export function getCategorySpending(tools: Tool[]) {
  const result: { category: string; amount: number }[] = [];
  const map: Record<string, number> = {};
  for (const t of tools) {
    const amount = Number(t.billingAmount || 0);
    (t.categories || ["Uncategorized"]).forEach((c) => {
      map[c] = (map[c] || 0) + amount;
    });
  }
  for (const k of Object.keys(map)) {
    result.push({ category: k, amount: map[k] });
  }
  return result;
}

export default mockTools;
