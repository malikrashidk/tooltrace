import { useState } from "react";
import { Check, Zap, Crown, Building, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { openPolarCheckout } from "@/lib/polar";
import { getPriceIdForPlan } from "@/lib/plans";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function PricingPage() {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Upgrade Dialog State
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const userPlan = user ? (user as any).plan || "free" : "free";

  const plans = [
    {
      id: "free",
      name: "Starter",
      description: "For individuals getting organized",
      price: 0,
      tools: 10,
      features: [
        "Up to 10 tools",
        "Dashboard & Tracking",
        "Spending Analytics",
        "Renewal Alerts & Tracking",
        "Receipt & Invoice Storage",
        "Notes & Labels per tool",
        "Extension Access (Basic)",
        "Currency Selection",
        "Dark/Light Theme",
        "Two-Factor Authentication",
        "Email Support"
      ],
      cta: userPlan === "free" ? "Current Plan" : null,
      ctaVariant: userPlan === "free" ? ("outline" as const) : ("default" as const),
      disabled: true,
    },
    {
      id: "pro",
      name: "Pro",
      description: "For founders and growing teams",
      price: billingCycle === "monthly" ? 9.99 : 8.33,
      originalPrice: 9.99,
      yearlyPrice: 100,
      tools: "Unlimited",
      features: [
        "Unlimited tools",
        "Smart Tracker (Auto-Detection)",
        "Advanced Analytics & Insights",
        "Cost by Category Analysis",
        "Receipt & Invoice Storage",
        "CSV & Excel Export",
        "Priority Email Support",
        "Everything in Starter"
      ],
      cta: userPlan === "pro" ? "Current Plan" : (userPlan === "enterprise" ? null : "Upgrade to Pro"),
      ctaVariant: userPlan === "pro" ? ("outline" as const) : ("default" as const),
      disabled: userPlan === "pro" || (userPlan === "enterprise" && true),
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For teams and agencies",
      price: billingCycle === "monthly" ? 24.99 : 20.83,
      originalPrice: 24.99,
      yearlyPrice: 250,
      tools: "Unlimited",
      features: [
        "Everything in Pro",
        "Team Collaboration (Multi-user)",
        "Role-based Access Control",
        "Admin Dashboard & Controls",
        "Receipt & Invoice Storage",
        "Audit Logs & Tracking",
        "API Keys & REST API",
        "Custom Webhooks",
        "Dedicated Support"
      ],
      cta: userPlan === "enterprise" ? "Current Plan" : "Upgrade to Enterprise",
      ctaVariant: userPlan === "enterprise" ? ("outline" as const) : ("default" as const),
      disabled: userPlan === "enterprise",
    },
  ];

  const processUpgrade = async (planId: string) => {
    setIsProcessing(true);
    try {
      const priceId = getPriceIdForPlan(planId, billingCycle);

      if (!priceId) {
        alert('Configuration Error: Price ID not found for this plan. Please contact support.');
        setIsProcessing(false);
        return;
      }

      // Note: openPolarCheckout handles the error alert internally
      await openPolarCheckout({
        productPriceId: priceId,
        email: user?.email,
        userId: user?.id,
        successUrl: `${window.location.origin}/dashboard?checkout=success`,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
      setUpgradeDialogOpen(false);
    }
  };

  const handleUpgrade = (planId: string) => {
    // If user is not logged in, redirect to signup with plan intent
    if (!user) {
      window.location.href = `/signup?plan=${planId}&cycle=${billingCycle}`;
      return;
    }

    // Safety Check: If user is already on a paid plan (updating), confirm intent
    // because this will charge their card immediately.
    const normalizedUserPlan = userPlan ? userPlan.toLowerCase() : 'free';
    console.log('[Pricing] handleUpgrade clicked', { planId, userPlan, normalizedUserPlan });

    if (normalizedUserPlan !== 'free' && normalizedUserPlan !== 'starter' && normalizedUserPlan !== planId) {
      setSelectedPlanId(planId);
      setUpgradeDialogOpen(true);
      return;
    }

    processUpgrade(planId);
  };

  return (
    <div className="space-y-6 md:space-y-8 p-3 sm:p-4 md:p-6">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 sm:p-6 md:p-8 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Simple, Transparent Pricing</h1>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
          Choose the perfect plan for managing your SaaS subscriptions.
        </p>
        <p className="text-xs sm:text-sm text-primary/80 font-medium max-w-xl mx-auto mb-6">
          💡 Save hundreds per year by cutting unused subscriptions • Track everything in one place • Cancel anytime
        </p>

        <div className="flex items-center justify-center gap-4">
          <Label htmlFor="billing-toggle" className={`text-sm ${billingCycle === "monthly" ? "font-bold text-foreground" : "text-muted-foreground"}`}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={billingCycle === "yearly"}
            onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
          />
          <Label htmlFor="billing-toggle" className={`text-sm ${billingCycle === "yearly" ? "font-bold text-foreground" : "text-muted-foreground"}`}>
            Yearly <Badge variant="secondary" className="ml-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">Save up to $50/year</Badge>
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 max-w-6xl mx-auto w-full">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col transition-all duration-300 ${plan.popular ? "md:scale-105 ring-2 ring-primary shadow-lg z-10" : "border-border/60"
              }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground animate-pulse">Most Popular</Badge>
              </div>
            )}
            <CardHeader className={`space-y-3 pb-4 ${plan.popular ? "bg-primary/5" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="mt-1 text-xs sm:text-sm">{plan.description}</CardDescription>
                </div>
                {plan.id === "pro" && <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 flex-shrink-0 mt-1" />}
                {plan.id === "enterprise" && <Building className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0 mt-1" />}
              </div>
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-baseline gap-1 mb-1 relative">
                  {billingCycle === "yearly" && plan.price > 0 && (
                    <span className="text-sm text-muted-foreground line-through decoration-destructive/50 absolute -top-4 left-1">
                      ${plan.originalPrice}
                    </span>
                  )}
                  <span className="text-3xl sm:text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground text-xs sm:text-sm">/month</span>
                </div>
                {billingCycle === "yearly" && plan.price > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Billed ${(plan as any).yearlyPrice} yearly
                  </p>
                )}
                {billingCycle === "monthly" && (
                  <p className="text-xs text-muted-foreground">
                    {typeof plan.tools === "number" ? `Up to ${plan.tools} tools` : "Unlimited tools"}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {plan.cta ? (
                <Button
                  onClick={() => handleUpgrade(plan.id)}
                  variant={plan.ctaVariant}
                  size="lg"
                  className="w-full mb-6"
                  disabled={plan.disabled}
                >
                  {plan.cta}
                </Button>
              ) : (
                <div className="h-[44px] mb-6 flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
                  Included in your plan
                </div>
              )}

              <div className="space-y-3 flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Features included</p>
                <div className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 group">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm leading-snug">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto mt-16 pb-8">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Can I cancel anytime?</h3>
              <p className="text-muted-foreground text-sm">
                Yes, you can cancel your subscription at any time. Your plan will remain active until the end of the billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Is my data secure?</h3>
              <p className="text-muted-foreground text-sm">
                Absolutely. We use industry-standard encryption for all data and never sell your information to third parties.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">What happens to my data if I downgrade?</h3>
              <p className="text-muted-foreground text-sm">
                Your data is preserved. If you exceed the tool limit for the free plan, you'll just need to upgrade to add more tools.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Do you offer refunds?</h3>
              <p className="text-muted-foreground text-sm">
                We offer a 14-day money-back guarantee if you're not satisfied with your Pro or Enterprise subscription.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 p-6 bg-primary/5 rounded-xl border border-primary/10 text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Zap className="h-6 w-6 text-primary fill-primary/20" />
            <span className="font-bold text-lg">Satisfaction Guaranteed</span>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
            Not happy with your plan? We offer a no-questions-asked refund within the first 14 days of your subscription.
            Join hundreds of founders managing their SaaS smarter.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-muted-foreground">Secure, encrypted payments processed by Polar.sh. We never store your credit card information.</p>
          <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-all">
            <svg className="h-6" viewBox="0 0 120 30" fill="currentColor">
              <text x="0" y="20" className="font-bold text-lg">Polar.sh</text>
            </svg>
          </div>
        </div>
      </div>

      <AlertDialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Upgrade</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to upgrade to <span className="font-semibold text-foreground capitalize">{selectedPlanId}</span>?
              Your saved payment method will be charged for the difference immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (selectedPlanId) processUpgrade(selectedPlanId);
              }}
              disabled={isProcessing}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Upgrade"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
