import { useQuery } from "@tanstack/react-query";
import { Clock, AlertTriangle, TrendingDown, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { type Tool } from "@/lib/analytics";

export function LowUsagePage() {
  const { data: toolsData, isLoading } = useQuery<{ tools: Tool[] }>({
    queryKey: ["/api/tools"],
  });

  const tools = toolsData?.tools || [];
  
  const paidTools = tools.filter(t => t.isPaid);
  const rarelyUsedPaid = paidTools.filter(t => t.usageFrequency === "rarely");
  const weeklyUsedPaid = paidTools.filter(t => t.usageFrequency === "weekly");
  
  const potentialMonthlySavings = rarelyUsedPaid.reduce((sum, t) => {
    const amount = parseFloat(t.billingAmount || "0");
    if (t.billingCycle === "yearly") {
      return sum + amount / 12;
    }
    return sum + amount;
  }, 0);

  const weeklyPotentialSavings = weeklyUsedPaid.reduce((sum, t) => {
    const amount = parseFloat(t.billingAmount || "0");
    if (t.billingCycle === "yearly") {
      return sum + amount / 12;
    }
    return sum + amount;
  }, 0);

  const totalMonthlySpend = paidTools.reduce((sum, t) => {
    const amount = parseFloat(t.billingAmount || "0");
    if (t.billingCycle === "yearly") {
      return sum + amount / 12;
    }
    return sum + amount;
  }, 0);

  const usageDistribution = {
    daily: paidTools.filter(t => t.usageFrequency === "daily").length,
    weekly: weeklyUsedPaid.length,
    rarely: rarelyUsedPaid.length,
  };

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Low Usage Subscriptions</h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Identify tools you're paying for but rarely using</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Potential Monthly Savings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              ${potentialMonthlySavings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">from rarely used tools</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Usage Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rarelyUsedPaid.length}</div>
            <p className="text-xs text-muted-foreground mt-1">of {paidTools.length} paid subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                {usageDistribution.daily} Daily
              </Badge>
              <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                {usageDistribution.weekly} Weekly
              </Badge>
              <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                {usageDistribution.rarely} Rarely
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {rarelyUsedPaid.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-lg">Rarely Used Paid Tools</CardTitle>
            </div>
            <CardDescription>These tools are marked as "rarely used" but you're still paying for them</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rarelyUsedPaid.map((tool) => {
                const monthlyAmount = tool.billingCycle === "yearly" 
                  ? parseFloat(tool.billingAmount || "0") / 12 
                  : parseFloat(tool.billingAmount || "0");
                
                return (
                  <div key={tool.id} className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg" data-testid={`tool-rarely-used-${tool.id}`}>
                    <div className="flex items-center gap-3">
                      {tool.logoUrl ? (
                        <img src={tool.logoUrl} alt={tool.name} className="w-10 h-10 rounded-lg object-contain bg-white p-1" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <TrendingDown className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{tool.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tool.billingCycle === "yearly" ? "Yearly billing" : "Monthly billing"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-orange-600 dark:text-orange-400">
                        ${monthlyAmount.toFixed(2)}/mo
                      </p>
                      <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                        Rarely Used
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {weeklyUsedPaid.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-lg">Weekly Used Tools</CardTitle>
            </div>
            <CardDescription>Consider if these tools provide enough value for their cost</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyUsedPaid.map((tool) => {
                const monthlyAmount = tool.billingCycle === "yearly" 
                  ? parseFloat(tool.billingAmount || "0") / 12 
                  : parseFloat(tool.billingAmount || "0");
                
                return (
                  <div key={tool.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`tool-weekly-${tool.id}`}>
                    <div className="flex items-center gap-3">
                      {tool.logoUrl ? (
                        <img src={tool.logoUrl} alt={tool.name} className="w-8 h-8 rounded-lg object-contain bg-white p-0.5" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium">{tool.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">${monthlyAmount.toFixed(2)}/mo</span>
                      <Badge variant="secondary">Weekly</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {paidTools.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Spending Breakdown by Usage</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Daily use tools</span>
                <span className="text-green-600 dark:text-green-400">
                  ${paidTools.filter(t => t.usageFrequency === "daily").reduce((sum, t) => {
                    const amount = parseFloat(t.billingAmount || "0");
                    return sum + (t.billingCycle === "yearly" ? amount / 12 : amount);
                  }, 0).toFixed(2)}/mo
                </span>
              </div>
              <Progress 
                value={totalMonthlySpend > 0 ? (paidTools.filter(t => t.usageFrequency === "daily").reduce((sum, t) => {
                  const amount = parseFloat(t.billingAmount || "0");
                  return sum + (t.billingCycle === "yearly" ? amount / 12 : amount);
                }, 0) / totalMonthlySpend) * 100 : 0} 
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Weekly use tools</span>
                <span className="text-yellow-600 dark:text-yellow-400">${weeklyPotentialSavings.toFixed(2)}/mo</span>
              </div>
              <Progress 
                value={totalMonthlySpend > 0 ? (weeklyPotentialSavings / totalMonthlySpend) * 100 : 0} 
                className="h-2"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Rarely use tools</span>
                <span className="text-orange-600 dark:text-orange-400">${potentialMonthlySavings.toFixed(2)}/mo</span>
              </div>
              <Progress 
                value={totalMonthlySpend > 0 ? (potentialMonthlySavings / totalMonthlySpend) * 100 : 0} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {paidTools.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingDown className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Paid Subscriptions</h3>
            <p className="text-muted-foreground">
              Add paid tools to your collection to start tracking usage and identifying savings opportunities
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
