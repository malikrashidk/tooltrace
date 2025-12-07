import { useQuery } from "@tanstack/react-query";
import { Clock, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { type Tool } from "@/lib/analytics";

export function LowUsagePage() {
  const { data: toolsData, isLoading } = useQuery<{ tools: Tool[] }>({
    queryKey: ["/api/tools"],
  });

  const tools = toolsData?.tools || [];
  
  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Low Usage Subscriptions</h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Identify tools you're paying for but rarely using</p>
      </div>

      <Card>
        <CardContent className="pt-6 pb-6 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-base sm:text-lg font-semibold mb-2">Usage Tracking Coming Soon</h3>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
            We're building smart usage tracking to help you identify underutilized subscriptions
          </p>
        </CardContent>
      </Card>

      {tools.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              You have {tools.filter(t => t.isPaid).length} paid subscriptions totaling $
              {tools.filter(t => t.isPaid).reduce((sum, t) => sum + Number(t.billingAmount || 0), 0).toFixed(2)}/month
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
