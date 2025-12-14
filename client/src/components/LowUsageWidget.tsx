import { AlertTriangle, ChevronRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tool } from "@/lib/mockData";

interface LowUsageWidgetProps {
  tools: Tool[];
  onViewAll?: () => void;
  onReviewTool?: (tool: Tool) => void;
}

export function LowUsageWidget({ tools, onViewAll, onReviewTool }: LowUsageWidgetProps) {
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

  const totalWasted = tools.reduce((sum, tool) => {
    if (!tool.billingAmount) return sum;
    return sum + (tool.billingCycle === "yearly" ? tool.billingAmount / 12 : tool.billingAmount);
  }, 0);

  return (
    <Card className="border-amber-200 dark:border-amber-800/50" data-testid="widget-low-usage">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Low Usage Alert
        </CardTitle>
        {tools.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onViewAll} data-testid="button-view-low-usage">
            Review all
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {tools.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">All your tools are being used well!</p>
          </div>
        ) : (
          <>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                You're spending approximately{" "}
                <span className="font-mono font-semibold">{formatCurrency(totalWasted)}/mo</span>{" "}
                on rarely used subscriptions.
              </p>
            </div>
            <div className="space-y-3">
              {tools.slice(0, 3).map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                  onClick={() => onReviewTool?.(tool)}
                  data-testid={`low-usage-item-${tool.id}`}
                >
                  <Avatar className="h-10 w-10 rounded-lg border border-border">
                    <AvatarImage src={tool.logoUrl} alt={tool.name} className="object-contain p-1" />
                    <AvatarFallback className="rounded-lg bg-background text-xs font-medium">
                      {getInitials(tool.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tool.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Rarely used</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-mono font-medium">
                      {formatCurrency(tool.billingAmount || 0)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      /{tool.billingCycle === "yearly" ? "yr" : "mo"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}



