// todo: remove mock functionality - this file contains mock data for the prototype

export interface Credentials {
  username?: string;
  email?: string;
  password?: string;
  notes?: string;
  lastUpdated?: string;
}

export interface Tool {
  id: string;
  name: string;
  logoUrl?: string;
  websiteUrl: string;
  notes: string;
  isPaid: boolean;
  categories: string[];
  tags: string[];
  usageFrequency: "daily" | "weekly" | "rarely";
  billingAmount?: number;
  billingCycle?: "monthly" | "yearly" | "one-time";
  nextRenewalDate?: string;
  paymentMethod?: string;
  receipts?: { id: string; name: string; uploadDate: string }[];
  credentials?: Credentials;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export const mockCategories: Category[] = [
  { id: "1", name: "Design", color: "bg-purple-500" },
  { id: "2", name: "Development", color: "bg-blue-500" },
  { id: "3", name: "AI", color: "bg-green-500" },
  { id: "4", name: "Cloud", color: "bg-orange-500" },
  { id: "5", name: "Marketing", color: "bg-pink-500" },
  { id: "6", name: "Communication", color: "bg-cyan-500" },
  { id: "7", name: "Productivity", color: "bg-yellow-500" },
  { id: "8", name: "Analytics", color: "bg-red-500" },
];

export const mockTools: Tool[] = [
  {
    id: "1",
    name: "Figma",
    logoUrl: "https://cdn.brandfetch.io/idZAyF9rlg/w/400/h/400/theme/dark/icon.png",
    websiteUrl: "https://figma.com",
    notes: "Main design tool for UI/UX work",
    isPaid: true,
    categories: ["Design"],
    tags: ["ui", "prototyping", "collaboration"],
    usageFrequency: "daily",
    billingAmount: 15,
    billingCycle: "monthly",
    nextRenewalDate: "2025-12-01",
    paymentMethod: "Credit Card",
  },
  {
    id: "2",
    name: "GitHub",
    logoUrl: "https://cdn.brandfetch.io/idZHcZ_i7F/w/400/h/400/theme/dark/icon.png",
    websiteUrl: "https://github.com",
    notes: "Code repository and version control",
    isPaid: true,
    categories: ["Development"],
    tags: ["git", "code", "collaboration"],
    usageFrequency: "daily",
    billingAmount: 4,
    billingCycle: "monthly",
    nextRenewalDate: "2025-11-28",
    paymentMethod: "Credit Card",
  },
  {
    id: "3",
    name: "ChatGPT Plus",
    logoUrl: "https://cdn.brandfetch.io/idR3duQxYl/w/400/h/400/theme/dark/icon.png",
    websiteUrl: "https://chat.openai.com",
    notes: "AI assistant for coding and writing",
    isPaid: true,
    categories: ["AI"],
    tags: ["ai", "writing", "coding"],
    usageFrequency: "daily",
    billingAmount: 20,
    billingCycle: "monthly",
    nextRenewalDate: "2025-12-05",
    paymentMethod: "Credit Card",
  },
  {
    id: "4",
    name: "AWS",
    logoUrl: "https://cdn.brandfetch.io/idkuX7bPkl/w/400/h/400/theme/dark/icon.png",
    websiteUrl: "https://aws.amazon.com",
    notes: "Cloud infrastructure for projects",
    isPaid: true,
    categories: ["Cloud"],
    tags: ["hosting", "infrastructure", "serverless"],
    usageFrequency: "weekly",
    billingAmount: 85,
    billingCycle: "monthly",
    nextRenewalDate: "2025-12-15",
    paymentMethod: "Credit Card",
  },
  {
    id: "5",
    name: "Notion",
    logoUrl: "https://cdn.brandfetch.io/idD_GVmz5A/w/400/h/400/theme/dark/icon.png",
    websiteUrl: "https://notion.so",
    notes: "Project management and documentation",
    isPaid: true,
    categories: ["Productivity"],
    tags: ["notes", "wiki", "planning"],
    usageFrequency: "daily",
    billingAmount: 10,
    billingCycle: "monthly",
    nextRenewalDate: "2025-12-10",
    paymentMethod: "PayPal",
  },
  {
    id: "6",
    name: "Slack",
    logoUrl: "https://cdn.brandfetch.io/id1LFSLYpI/w/400/h/400/theme/dark/icon.png",
    websiteUrl: "https://slack.com",
    notes: "Team communication",
    isPaid: true,
    categories: ["Communication"],
    tags: ["chat", "team", "messaging"],
    usageFrequency: "daily",
    billingAmount: 8.75,
    billingCycle: "monthly",
    nextRenewalDate: "2025-11-30",
    paymentMethod: "Credit Card",
  },
  {
    id: "7",
    name: "Canva",
    logoUrl: "https://cdn.brandfetch.io/id4nKz3VyP/w/400/h/400/theme/dark/icon.png",
    websiteUrl: "https://canva.com",
    notes: "Quick graphics and social media posts",
    isPaid: true,
    categories: ["Design", "Marketing"],
    tags: ["graphics", "social", "templates"],
    usageFrequency: "weekly",
    billingAmount: 120,
    billingCycle: "yearly",
    nextRenewalDate: "2026-03-15",
    paymentMethod: "Credit Card",
  },
  {
    id: "8",
    name: "VS Code",
    logoUrl: "https://cdn.brandfetch.io/idJPVzG17b/w/400/h/400/theme/dark/icon.png",
    websiteUrl: "https://code.visualstudio.com",
    notes: "Primary code editor",
    isPaid: false,
    categories: ["Development"],
    tags: ["editor", "code", "ide"],
    usageFrequency: "daily",
  },
  {
    id: "9",
    name: "Vercel",
    logoUrl: "https://cdn.brandfetch.io/idMNSiM6FD/w/400/h/400/theme/dark/icon.png",
    websiteUrl: "https://vercel.com",
    notes: "Frontend deployments",
    isPaid: true,
    categories: ["Cloud", "Development"],
    tags: ["hosting", "deployment", "nextjs"],
    usageFrequency: "weekly",
    billingAmount: 20,
    billingCycle: "monthly",
    nextRenewalDate: "2025-12-03",
    paymentMethod: "Credit Card",
  },
  {
    id: "10",
    name: "Linear",
    logoUrl: "https://cdn.brandfetch.io/idrEIPwxmk/w/400/h/400/theme/dark/icon.png",
    websiteUrl: "https://linear.app",
    notes: "Issue tracking for development projects",
    isPaid: true,
    categories: ["Productivity", "Development"],
    tags: ["issues", "tracking", "agile"],
    usageFrequency: "rarely",
    billingAmount: 8,
    billingCycle: "monthly",
    nextRenewalDate: "2025-12-08",
    paymentMethod: "Credit Card",
  },
  {
    id: "11",
    name: "Postman",
    logoUrl: "https://cdn.brandfetch.io/id2Bxe2m8d/w/400/h/400/theme/dark/icon.png",
    websiteUrl: "https://postman.com",
    notes: "API testing and documentation",
    isPaid: false,
    categories: ["Development"],
    tags: ["api", "testing", "docs"],
    usageFrequency: "weekly",
  },
  {
    id: "12",
    name: "Grammarly",
    logoUrl: "https://cdn.brandfetch.io/idvzJr1K1l/w/400/h/400/theme/dark/icon.png",
    websiteUrl: "https://grammarly.com",
    notes: "Writing assistant - rarely used now",
    isPaid: true,
    categories: ["Productivity"],
    tags: ["writing", "grammar", "editing"],
    usageFrequency: "rarely",
    billingAmount: 144,
    billingCycle: "yearly",
    nextRenewalDate: "2026-02-20",
    paymentMethod: "Credit Card",
  },
];

export function getMonthlySpend(tools: Tool[]): number {
  return tools.reduce((total, tool) => {
    if (!tool.isPaid || !tool.billingAmount) return total;
    if (tool.billingCycle === "monthly") return total + tool.billingAmount;
    if (tool.billingCycle === "yearly") return total + tool.billingAmount / 12;
    return total;
  }, 0);
}

export function getYearlySpend(tools: Tool[]): number {
  return tools.reduce((total, tool) => {
    if (!tool.isPaid || !tool.billingAmount) return total;
    if (tool.billingCycle === "monthly") return total + tool.billingAmount * 12;
    if (tool.billingCycle === "yearly") return total + tool.billingAmount;
    if (tool.billingCycle === "one-time") return total + tool.billingAmount;
    return total;
  }, 0);
}

export function getUpcomingRenewals(tools: Tool[], days: number): Tool[] {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + days);

  return tools.filter((tool) => {
    if (!tool.isPaid || !tool.nextRenewalDate) return false;
    const renewalDate = new Date(tool.nextRenewalDate);
    return renewalDate >= now && renewalDate <= futureDate;
  }).sort((a, b) => {
    return new Date(a.nextRenewalDate!).getTime() - new Date(b.nextRenewalDate!).getTime();
  });
}

export function getLowUsageTools(tools: Tool[]): Tool[] {
  return tools.filter((tool) => tool.isPaid && tool.usageFrequency === "rarely");
}

export function getCategorySpending(tools: Tool[]): { category: string; amount: number }[] {
  const spending: Record<string, number> = {};
  
  tools.forEach((tool) => {
    if (!tool.isPaid || !tool.billingAmount) return;
    const monthlyAmount = tool.billingCycle === "yearly" 
      ? tool.billingAmount / 12 
      : tool.billingAmount;
    
    tool.categories.forEach((category) => {
      spending[category] = (spending[category] || 0) + monthlyAmount;
    });
  });

  return Object.entries(spending)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}
