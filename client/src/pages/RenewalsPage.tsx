import { useMemo, useState } from "react";
import { Calendar, AlertCircle, DollarSign, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  mockTools,
  getUpcomingRenewals,
} from "@/lib/mockData";

export function RenewalsPage() {
  // todo: remove mock functionality - replace with real API data
  const tools = mockTools;
  const [selectedPeriod, setSelectedPeriod] = useState<"7" | "30" | "90">("30");

  const renewals7 = useMemo(() => getUpcomingRenewals(tools, 7), [tools]);
  const renewals30 = useMemo(() => getUpcomingRenewals(tools, 30), [tools]);
  const renewals90 = useMemo(() => getUpcomingRenewals(tools, 90), [tools]);

  const renewalsMap = {
    "7": renewals7,
    "30": renewals30,
    "90": renewals90,
  };

  const currentRenewals = renewalsMap[selectedPeriod];

  const totalAmount = currentRenewals.reduce((sum, tool) => {
    return sum + (tool.billingAmount || 0);
  }, 0);

  const getDaysUntil = (dateStr: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const renewalDate = new Date(dateStr);
    renewalDate.setHours(0, 0, 0, 0);
    const diffTime = renewalDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getUrgencyStyle = (days: number) => {
    if (days <= 3) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (days <= 7) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  const groupByMonth = (renewals: typeof currentRenewals) => {
    const groups: Record<string, typeof currentRenewals> = {};
    
    renewals.forEach((tool) => {
      const date = new Date(tool.nextRenewalDate!);
      const key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(tool);
    });

    return groups;
  };

  const groupedRenewals = groupByMonth(currentRenewals);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Upcoming Renewals</h1>
          <p className="text-muted-foreground">Track and manage your subscription renewals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={selectedPeriod === "7" ? "ring-2 ring-primary" : ""}>
          <CardContent className="pt-6 cursor-pointer" onClick={() => setSelectedPeriod("7")}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next 7 Days</p>
                <p className="text-2xl font-semibold">{renewals7.length}</p>
                <p className="text-sm font-mono text-muted-foreground">
                  {formatCurrency(renewals7.reduce((s, t) => s + (t.billingAmount || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={selectedPeriod === "30" ? "ring-2 ring-primary" : ""}>
          <CardContent className="pt-6 cursor-pointer" onClick={() => setSelectedPeriod("30")}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next 30 Days</p>
                <p className="text-2xl font-semibold">{renewals30.length}</p>
                <p className="text-sm font-mono text-muted-foreground">
                  {formatCurrency(renewals30.reduce((s, t) => s + (t.billingAmount || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={selectedPeriod === "90" ? "ring-2 ring-primary" : ""}>
          <CardContent className="pt-6 cursor-pointer" onClick={() => setSelectedPeriod("90")}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next 90 Days</p>
                <p className="text-2xl font-semibold">{renewals90.length}</p>
                <p className="text-sm font-mono text-muted-foreground">
                  {formatCurrency(renewals90.reduce((s, t) => s + (t.billingAmount || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Renewals in Next {selectedPeriod} Days
          </CardTitle>
          <CardDescription>
            {currentRenewals.length} subscriptions totaling {formatCurrency(totalAmount)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentRenewals.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-1">No upcoming renewals</h3>
              <p className="text-sm text-muted-foreground">
                No subscriptions are renewing in the next {selectedPeriod} days
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedRenewals).map(([month, tools]) => (
                <div key={month}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">{month}</h3>
                  <div className="space-y-3">
                    {tools.map((tool) => {
                      const daysUntil = getDaysUntil(tool.nextRenewalDate!);
                      return (
                        <div
                          key={tool.id}
                          className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg"
                          data-testid={`renewal-${tool.id}`}
                        >
                          <Avatar className="h-12 w-12 rounded-lg border border-border">
                            <AvatarImage src={tool.logoUrl} alt={tool.name} className="object-contain p-1" />
                            <AvatarFallback className="rounded-lg bg-background text-sm font-medium">
                              {getInitials(tool.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{tool.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(tool.nextRenewalDate!).toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-mono font-medium">{formatCurrency(tool.billingAmount || 0)}</p>
                              <p className="text-xs text-muted-foreground">
                                {tool.billingCycle === "yearly" ? "Yearly" : "Monthly"}
                              </p>
                            </div>
                            <Badge className={`text-xs ${getUrgencyStyle(daysUntil)}`}>
                              {daysUntil === 0 ? (
                                <>
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Today
                                </>
                              ) : daysUntil === 1 ? (
                                "Tomorrow"
                              ) : (
                                `${daysUntil} days`
                              )}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
