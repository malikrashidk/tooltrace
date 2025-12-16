import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, PieChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { type Tool } from "@/lib/analytics";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/context/LanguageContext";
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
  const { t } = useLanguage();

  const { data: toolsData, isLoading } = useQuery<{ tools: Tool[] }>({
    queryKey: ["/api/tools"],
  });

  const tools = toolsData?.tools || [];

  const stats = useMemo(() => {
    const paid = tools.filter((t) => t.isPaid);
    const monthlySpend = paid.reduce(
      (sum, t) => sum + Number(t.billingAmount || 0),
      0
    );

    // Calculate category spending
    const categorySpend: Record<string, number> = {};
    paid.forEach((tool) => {
      let amount = Number(tool.billingAmount || 0);
      // Normalize to monthly cost
      if (tool.billingCycle === 'yearly') {
        amount = amount / 12;
      }

      const categories = tool.categories?.length ? tool.categories : ["Uncategorized"];
      // Assign cost to the first category only to avoid double counting in pie chart
      const primaryCat = categories[0];
      categorySpend[primaryCat] = (categorySpend[primaryCat] || 0) + amount;
    });

    const categoryData = Object.entries(categorySpend)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Calculate daily/weekly/monthly/yearly breakdown
    const calculateFrequencySpend = (frequency: string) => {
      return paid
        .filter(t => t.usageFrequency === frequency)
        .reduce((sum, t) => {
          let amount = Number(t.billingAmount || 0);
          if (t.billingCycle === 'yearly') {
            amount = amount / 12;
          }
          return sum + amount;
        }, 0);
    };

    const frequencySpend = {
        Daily: calculateFrequencySpend('daily'),
        Weekly: calculateFrequencySpend('weekly'),
        Rarely: calculateFrequencySpend('rarely'),
    };

    const usageData = Object.entries(frequencySpend).map(([name, value]) => ({ name, value }));

    return {
      totalTools: tools.length,
      paidTools: paid.length,
      freeTools: tools.length - paid.length,
      monthlySpend,
      yearlySpend: monthlySpend * 12,
      categoryData,
      usageData
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
        <h1 className="text-2xl sm:text-3xl font-semibold">{t("analytics")}</h1>
        <p className="text-muted-foreground">{t("insights")}</p>
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
                  {t("monthly_spend")}
                </p>
                <p
                  className="text-2xl font-semibold font-mono"
                  data-testid="text-monthly-spend"
                >
                  {formatAmount(stats.monthlySpend)}
                </p>
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
                <p className="text-sm text-muted-foreground">{t("total_tools")}</p>
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
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("yearly_projection")}
                </p>
                <p
                  className="text-2xl font-semibold font-mono"
                  data-testid="text-yearly-projection"
                >
                  {formatAmount(stats.yearlySpend)}
                </p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category (Monthly)</CardTitle>
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

          <Card>
            <CardHeader>
              <CardTitle>Spending by Usage Frequency (Monthly)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {stats.usageData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.usageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatAmount(value)} />
                      <Bar dataKey="value" fill="#8884d8">
                        {stats.usageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                   <div className="h-full flex items-center justify-center text-muted-foreground">
                    No spending data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
