import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, TrendingUp, DollarSign, AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { type Tool } from "@/lib/analytics";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
import { VerificationSuccessBanner } from "@/components/VerificationSuccessBanner";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { useEffect, useState, useRef } from "react";
import { openPolarCheckout } from "@/lib/polar";
import { getPriceIdForPlan } from "@/lib/plans";
import { Loader2 } from "lucide-react";
import { fromCents } from "../../../shared/money";

export function Dashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { formatAmount } = useCurrency();
  const { user, refreshUser } = useAuth();
  const hasHandledSuccess = useRef(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(() => {
    return !!sessionStorage.getItem("pending_plan");
  });
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>("Connecting to Polar...");

  // Handle Polar Checkout Success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutType = params.get("checkout");

    if ((checkoutType === "success" || checkoutType === "upgrade_success") && !hasHandledSuccess.current) {
      console.log("[Dashboard] Payment success detected via URL:", checkoutType);
      hasHandledSuccess.current = true;
      setPaymentSuccess(true);

      // Clean up URL immediately to prevent loops on re-mount
      window.history.replaceState({}, "", window.location.pathname);

      // Handle refresh with a retry loop to account for webhook latency
      const attemptRefresh = async (retries = 8) => {
        const oldPlan = (user as any)?.plan;

        try {
          setSyncStatus("Syncing your account status...");
          // Proactively ask the server to check Polar for updates
          const syncResponse = await fetch("/api/billing/sync", { method: "POST" });
          const syncData = await syncResponse.json();
          console.log("[Dashboard] Proactive sync result:", syncData);

          if (syncData.success) {
            setSyncStatus("Account synced! Updating dashboard...");
          }
        } catch (syncErr) {
          console.warn("[Dashboard] Proactive sync failed (ignoring, falling back to polling):", syncErr);
        }

        const updatedUser = await refreshUser(true) as any;

        // If plan is still the same, retry after a delay.
        if (updatedUser?.plan === oldPlan && retries > 0) {
          console.log(`[Dashboard] Plan still ${oldPlan}, retrying in 2.5s...`);
          setSyncStatus(`Finalizing setup (Step ${9 - retries}/8)...`);
          setTimeout(() => attemptRefresh(retries - 1), 2500);
        } else {
          console.log("[Dashboard] Plan update confirmed:", updatedUser?.plan);
          setSyncStatus("Welcome to your new plan!");

          // Invalidate all queries to refresh spending stats and tool lists
          queryClient.invalidateQueries();

          // Auto-refresh page after 1.5 seconds to show updated UI
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      };

      if (checkoutType === "upgrade_success") {
        setSyncStatus("Upgrade complete. Syncing your new features...");
      }

      attemptRefresh();

      // Clear the overlay after 10 seconds safety timeout
      const timer = setTimeout(() => {
        setPaymentSuccess(false);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [refreshUser, queryClient, user]);

  // Handle pending plan upgrade from Signup/Login (Branding Site flow)
  useEffect(() => {
    const pendingPlan = sessionStorage.getItem("pending_plan");
    const pendingCycle = sessionStorage.getItem("pending_cycle") as "monthly" | "yearly" || "monthly";

    if (pendingPlan && user) {
      console.log("[Dashboard] Found pending plan choice:", { pendingPlan, pendingCycle });

      const priceId = getPriceIdForPlan(pendingPlan, pendingCycle);

      if (priceId) {
        setIsProcessingPayment(true);
        // Clear them immediately to avoid loops
        sessionStorage.removeItem("pending_plan");
        sessionStorage.removeItem("pending_cycle");

        // Open checkout automatically
        console.log("[Dashboard] Triggering auto-checkout for:", pendingPlan);
        openPolarCheckout({
          productPriceId: priceId,
          email: user.email,
          userId: user.id,
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
        });
      } else {
        sessionStorage.removeItem("pending_plan");
        sessionStorage.removeItem("pending_cycle");
      }
    }
  }, [user]);

  const { data: analyticsData, isLoading } = useQuery<{
    tools: Tool[];
    monthlyTotal: string;
    budgetStatus?: {
      threshold: number;
      isOverBudget: boolean;
      percentageUsed: number
    }
  }>({
    queryKey: ["/api/v1/analytics/spending"],
  });

  const { data: toolsData } = useQuery<{ tools: Tool[] }>({
    queryKey: ["/api/tools"],
  });

  const { data: inboxStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/inbox/connection-status"],
  });

  const tools = toolsData?.tools || [];
  const paidTools = tools.filter(t => t.isPaid);
  const monthlySpend = parseFloat(analyticsData?.monthlyTotal || "0");
  const budgetStatus = analyticsData?.budgetStatus;

  // Calculate Next Month's Forecast
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(today.getMonth() + 1);

  const nextMonthForecast = paidTools.reduce((acc, tool) => {
    // If billing is monthly, always add
    if (tool.billingCycle === "monthly" && tool.billingAmount) {
      return acc + fromCents(tool.billingAmount);
    }
    // If yearly, only add if renewal is in the next 30 days
    if (tool.billingCycle === "yearly" && tool.billingAmount && tool.nextRenewalDate) {
      const renewalDate = new Date(tool.nextRenewalDate);
      if (renewalDate <= nextMonth && renewalDate >= today) {
        return acc + fromCents(tool.billingAmount);
      }
    }
    return acc;
  }, 0);

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (isProcessingPayment || paymentSuccess) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
        <div className="bg-card border shadow-lg rounded-lg p-8 max-w-md w-full text-center space-y-4">
          {paymentSuccess ? (
            <Package className="h-12 w-12 text-green-500 mx-auto" />
          ) : (
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          )}
          <h2 className="text-2xl font-semibold">
            {paymentSuccess ? "Payment Successful!" : "Finalizing your subscription..."}
          </h2>
          <p className="text-muted-foreground">
            {paymentSuccess
              ? syncStatus
              : "Please complete the payment in the popup window. Your dashboard will be ready momentarily."}
          </p>
          {paymentSuccess && (
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 w-full"
            >
              Reload Dashboard
            </Button>
          )}
          {!paymentSuccess && (
            <Button
              variant="outline"
              onClick={() => setIsProcessingPayment(false)}
              className="mt-4"
            >
              Cancel and View Dashboard
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
      <VerificationSuccessBanner />

      <OnboardingChecklist
        hasTools={tools.length > 0}
        hasCurrencySet={!!(user && (user as any).currency && (user as any).currency !== "USD")} // Assuming default is USD, check if changed
      />

      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Dashboard</h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Overview of your tools and subscriptions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tools</p>
                <p className="text-xl sm:text-2xl font-semibold" data-testid="text-total-tools">{tools.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {paidTools.length} paid
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${budgetStatus?.isOverBudget
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-green-100 dark:bg-green-900/30"
                }`}>
                {budgetStatus?.isOverBudget ? (
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                ) : (
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Monthly Spend</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-xl sm:text-2xl font-semibold font-mono ${budgetStatus?.isOverBudget ? "text-red-600 dark:text-red-400" : ""
                    }`} data-testid="text-monthly-spend">
                    {formatAmount(monthlySpend)}
                  </p>
                  {budgetStatus && (
                    <span className="text-xs text-muted-foreground">
                      / {formatAmount(budgetStatus.threshold)}
                    </span>
                  )}
                </div>
                {budgetStatus && (
                  <div className="w-full h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${budgetStatus.isOverBudget ? "bg-red-500" : "bg-green-500"
                        }`}
                      style={{ width: `${Math.min(budgetStatus.percentageUsed, 100)}%` }}
                    />
                  </div>
                )}
                {!budgetStatus && <p className="text-xs text-muted-foreground mt-1">Current subscriptions</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next 30 Days Forecast</p>
                <p className="text-xl sm:text-2xl font-semibold font-mono" data-testid="text-forecast-projection">
                  {formatAmount(nextMonthForecast)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Upcoming renewals & bills</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {tools.length === 0 ? (
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">No tools yet</h3>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-4">
              Start tracking your SaaS tools and subscriptions
            </p>
            <Button onClick={() => setLocation("/tools")} data-testid="button-add-first-tool">
              Add Tool
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Tools</CardTitle>
            <CardDescription>Your recently added tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tools.slice(0, 5).map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between p-3 border rounded-md hover-elevate cursor-pointer"
                  onClick={() => setLocation("/tools")}
                  data-testid={`tool-${tool.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{tool.name}</p>
                      {tool.notes && (
                        <p className="text-sm text-muted-foreground">{tool.notes}</p>
                      )}
                    </div>
                  </div>
                  {tool.isPaid && tool.billingAmount && (
                    <div className="text-right">
                      <p className="font-mono font-medium">{formatAmount(fromCents(tool.billingAmount))}/mo</p>
                      {tool.nextRenewalDate && (
                        <p className="text-xs text-muted-foreground">
                          Renews {new Date(tool.nextRenewalDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {tools.length > 5 && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setLocation("/tools")}
                data-testid="button-view-all-tools"
              >
                View All ({tools.length})
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
