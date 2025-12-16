import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { type Tool } from "@/lib/analytics";
import { useCurrency } from "@/context/CurrencyContext";
import { useLanguage } from "@/context/LanguageContext";

export function AnalyticsPage() {
  const { formatAmount } = useCurrency();
  const { t } = useLanguage();

  const { data: toolsData, isLoading } = useQuery<{ tools: Tool[] }>({
    queryKey: ["/api/tools"],
  });

  const tools = toolsData?.tools || [];
  
  const stats = useMemo(() => {
    const paid = tools.filter(t => t.isPaid);
    const monthlySpend = paid.reduce((sum, t) => sum + Number(t.billingAmount || 0), 0);
    return {
      totalTools: tools.length,
      paidTools: paid.length,
      freeTools: tools.length - paid.length,
      monthlySpend,
      yearlySpend: monthlySpend * 12,
    };
  }, [tools]);

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">{t("analytics")}</h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground">{t("insights")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("monthly_spend")}</p>
                <p className="text-2xl font-semibold font-mono" data-testid="text-monthly-spend">
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
                <p className="text-2xl font-semibold" data-testid="text-total-tools">{stats.totalTools}</p>
                <p className="text-xs text-muted-foreground">{stats.paidTools} paid, {stats.freeTools} free</p>
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
                <p className="text-sm text-muted-foreground">{t("yearly_projection")}</p>
                <p className="text-2xl font-semibold font-mono" data-testid="text-yearly-projection">
                  {formatAmount(stats.yearlySpend)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {tools.length === 0 && (
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No data available</h3>
            <p className="text-muted-foreground">
              Add tools to see analytics and insights
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}



