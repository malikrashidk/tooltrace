import { Check, Zap, Crown, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { openCheckout } from "@/lib/paddle";
import { PRICE_IDS } from "@/lib/plans";

export function PricingPage() {
  const { user } = useAuth();

  const userPlan = user ? (user as any).plan || "free" : "free";
  const userToolsCount = user ? (user as any).toolsCount || 0 : 0;

  const plans = [
    {
      id: "free",
      name: "Starter",
      description: "For individuals getting organized",
      price: 0,
      tools: 10,
      features: [
        "Up to 10 tools",
        "Core Dashboard & Tracking",
        "Notes per tool",
        "Basic Receipts Storage",
        "Renewal Alerts",
        "Basic Cost Analytics",
        "Smart Scan (5 scans/mo)"
      ],
      cta: "Current Plan",
      ctaVariant: "outline" as const,
      disabled: userPlan === "free",
    },
    {
      id: "pro",
      name: "Pro",
      description: "For founders and growing teams",
      price: 9.99,
      tools: "Unlimited",
      features: [
        "Unlimited tools",
        "Smart Scan (30 scans/mo)",
        "Advanced Analytics & Forecasting",
        "Low Usage Detection",
        "Data Export (CSV/PDF)",
        "Priority Support",
        "Everything in Starter"
      ],
      cta: userPlan === "pro" ? "Current Plan" : "Upgrade to Pro",
      ctaVariant: userPlan === "pro" ? ("outline" as const) : ("default" as const),
      disabled: userPlan === "pro",
      popular: true,
      priceId: PRICE_IDS.pro
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For teams and agencies",
      price: 24.99,
      tools: "Unlimited",
      features: [
        "Everything in Pro",
        "Unlimited Smart Scans",
        "Team Collaboration",
        "Role-based Access",
        "Admin Controls",
        "API Access",
        "Audit Logs"
      ],
      cta: userPlan === "enterprise" ? "Current Plan" : "Upgrade to Enterprise",
      ctaVariant: userPlan === "enterprise" ? ("outline" as const) : ("default" as const),
      disabled: userPlan === "enterprise",
      priceId: PRICE_IDS.enterprise
    },
  ];

  const handleUpgrade = (plan: typeof plans[0]) => {
    if (plan.priceId) {
      openCheckout(plan.priceId, user?.email, user?.id);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 p-3 sm:p-4 md:p-6">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 sm:p-6 md:p-8 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Simple, Transparent Pricing</h1>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the perfect plan for managing your SaaS subscriptions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 max-w-6xl mx-auto w-full">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col transition-all duration-300 ${plan.popular ? "md:scale-105 ring-2 ring-primary shadow-lg" : ""
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
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl sm:text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground text-xs sm:text-sm">/month</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {typeof plan.tools === "number" ? `Up to ${plan.tools} tools` : "Unlimited tools"}
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Button
                onClick={() => handleUpgrade(plan)}
                variant={plan.ctaVariant}
                size="lg"
                className="w-full mb-6"
                disabled={plan.disabled}
              >
                {plan.cta}
              </Button>

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
    </div>
  );
}
