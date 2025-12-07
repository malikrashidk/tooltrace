import { FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";

export function ReceiptStoragePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isPaidPlan = user?.plan === "standard" || user?.plan === "premium";

  if (!isPaidPlan) {
    return (
      <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Invoice & Receipt Storage</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Upload and organize invoices and receipts for your subscriptions</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <div className="text-center space-y-4 max-w-md">
              <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                <Lock className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold">Upgrade for Receipt Storage</h2>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                Store and organize invoices and receipts with Standard and Premium plans.
              </p>
              <Button 
                onClick={() => setLocation("/pricing")}
                className="mt-4 w-full sm:w-auto"
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
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Invoice & Receipt Storage</h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Upload and organize invoices and receipts for your subscriptions</p>
      </div>

      <Card>
        <CardContent className="pt-6 pb-6 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Receipt Storage Coming Soon</h3>
          <p className="text-muted-foreground mb-6">
            Upload and organize invoices and receipts for all your SaaS subscriptions
          </p>
          <Button 
            onClick={() => setLocation("/dashboard")}
            variant="outline"
            data-testid="button-back-to-dashboard"
          >
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
