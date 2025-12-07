import { ArrowLeft, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";

export function AdvancedToolsManagement() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isPaidPlan = user?.plan === "standard" || user?.plan === "premium";

  if (!isPaidPlan) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold">Advanced Tools Management</h1>
          <p className="text-muted-foreground">Bulk operations, detailed management, and tool intelligence</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4 max-w-md">
              <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                <Wrench className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold">Upgrade for Advanced Management</h2>
              <p className="text-muted-foreground">
                Advanced tools management with bulk operations and inline editing is available on Standard and Premium plans.
              </p>
              <Button 
                onClick={() => setLocation("/pricing")}
                className="mt-4"
                data-testid="button-upgrade"
              >
                View Pricing Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">Advanced Tools Management</h1>
        <p className="text-muted-foreground">Bulk operations and tool intelligence</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="text-center space-y-6 max-w-md">
            <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
              <Wrench className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Coming Soon</h2>
              <p className="text-muted-foreground">
                Advanced bulk operations and tool intelligence coming soon
              </p>
            </div>
            <Button 
              onClick={() => setLocation("/tools")}
              variant="outline"
              className="mt-4"
              data-testid="button-back-to-tools"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tools
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
