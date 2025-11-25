import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Package, Clock } from "lucide-react";
import {
  mockTools,
  getMonthlySpend,
  getYearlySpend,
  getCategorySpending,
  getLowUsageTools,
} from "@/lib/mockData";

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 76%, 36%)",
  "hsl(271, 91%, 65%)",
  "hsl(32, 95%, 44%)",
  "hsl(197, 37%, 36%)",
  "hsl(340, 82%, 52%)",
];

export function AnalyticsPage() {
  // todo: remove mock functionality - replace with real API data
  const tools = mockTools;
  
  const monthlySpend = useMemo(() => getMonthlySpend(tools), [tools]);
  const yearlySpend = useMemo(() => getYearlySpend(tools), [tools]);
  const categorySpending = useMemo(() => getCategorySpending(tools), [tools]);
  const lowUsageTools = useMemo(() => getLowUsageTools(tools), [tools]);

  const paidTools = tools.filter((t) => t.isPaid);
  const freeTools = tools.filter((t) => !t.isPaid);

  const usageDistribution = [
    { name: "Daily", value: tools.filter((t) => t.usageFrequency === "daily").length },
    { name: "Weekly", value: tools.filter((t) => t.usageFrequency === "weekly").length },
    { name: "Rarely", value: tools.filter((t) => t.usageFrequency === "rarely").length },
  ];

  const topExpensiveTools = [...paidTools]
    .sort((a, b) => (b.billingAmount || 0) - (a.billingAmount || 0))
    .slice(0, 5);

  const potentialSavings = lowUsageTools.reduce((sum, tool) => {
    if (!tool.billingAmount) return sum;
    return sum + (tool.billingCycle === "yearly" ? tool.billingAmount / 12 : tool.billingAmount);
  }, 0);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const monthlyTrend = [
    { month: "Jul", amount: monthlySpend * 0.85 },
    { month: "Aug", amount: monthlySpend * 0.9 },
    { month: "Sep", amount: monthlySpend * 0.88 },
    { month: "Oct", amount: monthlySpend * 0.95 },
    { month: "Nov", amount: monthlySpend },
    { month: "Dec", amount: monthlySpend * 1.02 },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">Insights into your SaaS spending and usage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Spend</p>
                <p className="text-2xl font-semibold font-mono">{formatCurrency(monthlySpend)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Yearly Spend</p>
                <p className="text-2xl font-semibold font-mono">{formatCurrency(yearlySpend)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tools</p>
                <p className="text-2xl font-semibold">{tools.length}</p>
                <p className="text-xs text-muted-foreground">{paidTools.length} paid, {freeTools.length} free</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Potential Savings</p>
                <p className="text-2xl font-semibold font-mono">{formatCurrency(potentialSavings)}</p>
                <p className="text-xs text-muted-foreground">from {lowUsageTools.length} low-use tools</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending Trend</CardTitle>
            <CardDescription>Monthly subscription costs over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Spend"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(217, 91%, 60%)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Monthly cost breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorySpending} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `$${value}`} />
                  <YAxis type="category" dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value) + "/mo", "Spend"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Bar dataKey="amount" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Usage Distribution</CardTitle>
            <CardDescription>How frequently you use your tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={usageDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {usageDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Expensive Tools</CardTitle>
            <CardDescription>Your highest cost subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topExpensiveTools.map((tool, index) => (
                <div key={tool.id} className="flex items-center gap-4" data-testid={`expensive-tool-${tool.id}`}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{tool.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {tool.billingCycle === "yearly" ? "Yearly" : "Monthly"} billing
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-medium">
                      {formatCurrency(tool.billingAmount || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      /{tool.billingCycle === "yearly" ? "yr" : "mo"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {lowUsageTools.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Optimization Opportunities
            </CardTitle>
            <CardDescription>
              Review these rarely used subscriptions to potentially save {formatCurrency(potentialSavings)}/month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowUsageTools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  data-testid={`low-usage-opportunity-${tool.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{tool.name}</p>
                    <p className="text-sm text-muted-foreground">Rarely used</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-medium text-amber-600 dark:text-amber-400">
                      {formatCurrency(tool.billingAmount || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      /{tool.billingCycle === "yearly" ? "yr" : "mo"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
