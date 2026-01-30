import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
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
import { ExtensionPromoBanner } from "@/components/ExtensionPromoBanner";

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

      const isUpgrade = checkoutType === "upgrade_success";
      setSyncStatus(isUpgrade ? "Upgrading your plan..." : "Finalizing account setup...");

      // Clean up URL immediately to prevent loops on re-mount
      window.history.replaceState({}, "", window.location.pathname);

      // Robust Polling Mechanism: Poll every 2s for up to 60s
      const POLL_INTERVAL = 2000;
      const MAX_ATTEMPTS = 30; // 60 seconds total
      let attempts = 0;

      const pollForPlanUpdate = async () => {
        const currentUser = user as any;
        const currentPlan = currentUser?.plan;

        try {
          // 1. Trigger sync on backend (idempotent)
          const token = localStorage.getItem("token");
          await fetch("/api/billing/sync", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });

          // 2. Fetch fresh user profile
          const updatedUser = await refreshUser(true) as any;

          attempts++;

          // Check if plan changed or if we just want to ensure sync happened (for non-upgrades)
          // For upgrades, we strictly wait for plan change.
          // For initial checkout, we also wait for plan change from 'free' if possible.

          const hasPlanChanged = updatedUser?.plan !== currentPlan;
          const isPaidPlan = updatedUser?.plan === 'pro' || updatedUser?.plan === 'enterprise';

          console.log(`[Dashboard] Polling attempt ${attempts}/${MAX_ATTEMPTS}: Plan=${updatedUser?.plan} (Was=${currentPlan})`);

          if (hasPlanChanged || (attempts > 1 && isPaidPlan)) {
            // Success!
            setSyncStatus("Plan updated successfully!");
            // Wait a moment for user to see success message
            setTimeout(() => {
              queryClient.invalidateQueries();
              window.location.reload();
            }, 1500);
            return;
          }

          if (attempts >= MAX_ATTEMPTS) {
            // Timeout - connection might be slow, but let user into dashboard anyway
            console.warn("[Dashboard] Polling timed out. Plan might verify in background.");
            setSyncStatus("Taking longer than expected...");
            setTimeout(() => {
              setPaymentSuccess(false);
              queryClient.invalidateQueries();
            }, 2000);
            return;
          }

          // Continue polling
          setTimeout(pollForPlanUpdate, POLL_INTERVAL);

        } catch (error) {
          console.error("[Dashboard] Polling error:", error);
          // Retry anyway unless max attempts reached
          if (attempts < MAX_ATTEMPTS) {
            setTimeout(pollForPlanUpdate, POLL_INTERVAL);
          } else {
            setPaymentSuccess(false);
          }
        }
      };

      // Start polling
      pollForPlanUpdate();
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

  useQuery<{ connected: boolean }>({
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

      <ExtensionPromoBanner variant="full" />

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
