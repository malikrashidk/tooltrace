import { useMemo } from "react";
import { AlertTriangle, Clock, DollarSign, ExternalLink, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  mockTools,
  getLowUsageTools,
} from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

export function LowUsagePage() {
  const { toast } = useToast();
  // todo: remove mock functionality - replace with real API data
  const tools = mockTools;
  const lowUsageTools = useMemo(() => getLowUsageTools(tools), [tools]);

  const totalWasted = lowUsageTools.reduce((sum, tool) => {
    if (!tool.billingAmount) return sum;
    return sum + (tool.billingCycle === "yearly" ? tool.billingAmount / 12 : tool.billingAmount);
  }, 0);

  const yearlyWasted = totalWasted * 12;

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

  const handleCancel = (toolName: string) => {
    toast({
      title: "Review subscription",
      description: `Consider canceling ${toolName} to save money.`,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Low Usage Subscriptions</h1>
        <p className="text-muted-foreground">Review tools you're paying for but rarely using</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-amber-200 dark:border-amber-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rarely Used Tools</p>
                <p className="text-2xl font-semibold">{lowUsageTools.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Waste</p>
                <p className="text-2xl font-semibold font-mono">{formatCurrency(totalWasted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Yearly Waste</p>
                <p className="text-2xl font-semibold font-mono">{formatCurrency(yearlyWasted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {lowUsageTools.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-medium mb-1">All tools are being used well!</h3>
              <p className="text-sm text-muted-foreground">
                You don't have any rarely used paid subscriptions.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Rarely Used Subscriptions
            </CardTitle>
            <CardDescription>
              These tools are marked as "rarely used" but you're still paying for them
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowUsageTools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-muted/50 rounded-lg"
                  data-testid={`low-usage-tool-${tool.id}`}
                >
                  <Avatar className="h-14 w-14 rounded-lg border border-border">
                    <AvatarImage src={tool.logoUrl} alt={tool.name} className="object-contain p-1" />
                    <AvatarFallback className="rounded-lg bg-background font-medium">
                      {getInitials(tool.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{tool.name}</h3>
                      <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Clock className="h-3 w-3 mr-1" />
                        Rarely used
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{tool.notes}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tool.categories.map((cat) => (
                        <Badge key={cat} variant="outline" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 sm:min-w-[150px]">
                    <div className="text-right">
                      <p className="text-lg font-mono font-semibold text-amber-600 dark:text-amber-400">
                        {formatCurrency(tool.billingAmount || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        per {tool.billingCycle === "yearly" ? "year" : "month"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(tool.websiteUrl, "_blank")}
                        data-testid={`button-visit-${tool.id}`}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Visit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancel(tool.name)}
                        data-testid={`button-cancel-${tool.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/30">
        <CardContent className="py-6">
          <h3 className="font-medium mb-2">Tips for managing unused subscriptions</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">1.</span>
              <span>Set a reminder to check on rarely used tools monthly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">2.</span>
              <span>Consider downgrading to free tiers if available</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">3.</span>
              <span>Cancel subscriptions you haven't used in 3+ months</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">4.</span>
              <span>Look for annual plans with better pricing for tools you use regularly</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
