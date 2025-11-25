import { Calendar, AlertCircle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tool } from "@/lib/mockData";

interface RenewalsWidgetProps {
  renewals: Tool[];
  title?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export function RenewalsWidget({
  renewals,
  title = "Upcoming Renewals",
  showViewAll = true,
  onViewAll,
}: RenewalsWidgetProps) {
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

  return (
    <Card data-testid="widget-renewals">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          {title}
        </CardTitle>
        {showViewAll && renewals.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onViewAll} data-testid="button-view-all-renewals">
            View all
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {renewals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming renewals</p>
          </div>
        ) : (
          <div className="space-y-3">
            {renewals.slice(0, 5).map((tool) => {
              const daysUntil = getDaysUntil(tool.nextRenewalDate!);
              return (
                <div
                  key={tool.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover-elevate"
                  data-testid={`renewal-item-${tool.id}`}
                >
                  <Avatar className="h-10 w-10 rounded-lg border border-border">
                    <AvatarImage src={tool.logoUrl} alt={tool.name} className="object-contain p-1" />
                    <AvatarFallback className="rounded-lg bg-background text-xs font-medium">
                      {getInitials(tool.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tool.nextRenewalDate!).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-sm font-mono font-medium">
                      {formatCurrency(tool.billingAmount || 0)}
                    </span>
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
        )}
      </CardContent>
    </Card>
  );
}
