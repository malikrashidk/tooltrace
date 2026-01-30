import { useMemo } from "react";
import { fromCents } from "../../../shared/money";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Package, TrendingUp, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { type Tool } from "@/lib/analytics";
import { useCurrency } from "@/context/CurrencyContext";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function AnalyticsPage() {
  const { formatAmount } = useCurrency();

  const { data: toolsData, isLoading } = useQuery<{ tools: Tool[] }>({
    queryKey: ["/api/tools"],
  });

  const tools = toolsData?.tools || [];

  const stats = useMemo(() => {
    const paid = tools.filter((t) => t.isPaid);

    // Normalize monthly spend
    const monthlySpend = paid.reduce((sum, t) => {
      const amount = fromCents(t.billingAmount);
      let monthlyAmount = amount;
      if (t.billingCycle === 'yearly') {
        monthlyAmount = amount / 12;
      }
      // one-time payments don't count towards monthly recurring revenue (MRR) typically,
      // or we could amortize them. Let's exclude or count as 0 for MRR to be safe, 
      // or maybe divide by 12/24? Let's just exclude one-time from MRR for now.
      if (t.billingCycle === 'one-time') {
        monthlyAmount = 0;
      }
      return sum + monthlyAmount;
    }, 0);

    // Calculate category spending
    const categorySpend: Record<string, number> = {};
    paid.forEach((tool) => {
      const amount = fromCents(tool.billingAmount);
      let monthlyAmount = amount;
      if (tool.billingCycle === 'yearly') monthlyAmount = amount / 12;
      if (tool.billingCycle === 'one-time') monthlyAmount = 0; // Exclude one-time from monthly pie

      if (monthlyAmount > 0) {
        const categories = tool.categories?.length ? tool.categories : ["Uncategorized"];
        categories.forEach((cat) => {
          // Assign full cost to primary category to avoid double counting in pie chart total
          // or split it? To keep it simple and accurate sum, usage: first category.
          if (cat === categories[0]) {
            categorySpend[cat] = (categorySpend[cat] || 0) + monthlyAmount;
          }
        });
      }
    });

    const categoryData = Object.entries(categorySpend)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Top 5 most expensive tools (monthly normalized)
    const expensiveTools = [...paid]
      .map(t => {
        let cost = fromCents(t.billingAmount);
        if (t.billingCycle === 'yearly') cost = cost / 12;
        return {
          name: t.name,
          cost: cost,
          cycle: t.billingCycle
        };
      })
      .filter(t => t.cost > 0 && t.cycle !== 'one-time')
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    // Calculate daily/weekly/monthly/yearly breakdown count
    const frequencySpend = {
      Daily: paid.filter(t => t.usageFrequency === 'daily').length,
      Weekly: paid.filter(t => t.usageFrequency === 'weekly').length,
      Rarely: paid.filter(t => t.usageFrequency === 'rarely').length,
    };

    const usageData = Object.entries(frequencySpend).map(([name, value]) => ({ name, value }));

    return {
      totalTools: tools.length,
      paidTools: paid.length,
      freeTools: tools.length - paid.length,
      monthlySpend,
      yearlySpend: monthlySpend * 12,
      categoryData,
      usageData,
      expensiveTools
    };
  }, [tools]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3 sm:p-4 md:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">Insights into your spending and tool usage</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Monthly Spend
                </p>
                <p
                  className="text-2xl font-semibold font-mono"
                  data-testid="text-monthly-spend"
                >
                  {formatAmount(stats.monthlySpend)}
                </p>
                <p className="text-xs text-muted-foreground">Approx. monthly recurring</p>
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
                <p
                  className="text-2xl font-semibold"
                  data-testid="text-total-tools"
                >
                  {stats.totalTools}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.paidTools} paid, {stats.freeTools} free
                </p>
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
                <p className="text-sm text-muted-foreground">
                  Yearly Projection
                </p>
                <p
                  className="text-2xl font-semibold font-mono"
                  data-testid="text-yearly-projection"
                >
                  {formatAmount(stats.yearlySpend)}
                </p>
                <p className="text-xs text-muted-foreground">Based on current MRR</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {tools.length === 0 ? (
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No data available</h3>
            <p className="text-muted-foreground">
              Add tools to see analytics and insights
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Spending by Category Pie Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Spending by Category</CardTitle>
              <CardDescription>Monthly distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {stats.categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={stats.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.categoryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatAmount(value)}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No spending data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top 5 Expensive Tools Bar Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Top 5 Most Expensive</CardTitle>
              <CardDescription>Monthly cost normalized</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {stats.expensiveTools.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={stats.expensiveTools} margin={{ left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: number) => formatAmount(value)} cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="cost" fill="#8884d8" radius={[0, 4, 4, 0]}>
                        {stats.expensiveTools.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No paid tools found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tool Count by Usage Freq */}
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Tool Usage Frequency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.usageData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} name="Number of Tools">
                      {stats.usageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
