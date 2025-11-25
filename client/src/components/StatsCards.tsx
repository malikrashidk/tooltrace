import { DollarSign, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  monthlySpend: number;
  yearlySpend: number;
  totalTools: number;
  paidTools: number;
  freeTools: number;
  lowUsageCount: number;
}

export function StatsCards({
  monthlySpend,
  yearlySpend,
  totalTools,
  paidTools,
  freeTools,
  lowUsageCount,
}: StatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const stats = [
    {
      label: "Monthly Spend",
      value: formatCurrency(monthlySpend),
      icon: DollarSign,
      description: "Current monthly cost",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Yearly Spend",
      value: formatCurrency(yearlySpend),
      icon: TrendingUp,
      description: "Projected annual cost",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: "Active Tools",
      value: totalTools.toString(),
      icon: Package,
      description: `${paidTools} paid, ${freeTools} free`,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      label: "Low Usage",
      value: lowUsageCount.toString(),
      icon: AlertTriangle,
      description: "Rarely used paid tools",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} data-testid={`stat-card-${stat.label.toLowerCase().replace(" ", "-")}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-semibold font-mono" data-testid={`text-stat-value-${stat.label.toLowerCase().replace(" ", "-")}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
