import { Check, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

export function PricingPage() {
  const { user } = useAuth();

  // todo: remove mock functionality - replace with real API call to fetch user subscription
  const userPlan = user ? (user as any).plan || "free" : "free";
  const userToolsCount = user ? (user as any).toolsCount || 0 : 0;

  const plans = [
    {
      id: "free",
      name: "Free",
      description: "Get started with SaaS tracking",
      price: 0,
      tools: 8,
      features: [
        "Up to 8 tools",
        "Basic tool management",
        "Grid & list view",
        "Email reminders",
        "CSV export",
        "Basic analytics",
        "Invoice & Receipt storage",
        "Tool notes & tags",
      ],
      cta: "Current Plan",
      ctaVariant: "outline" as const,
      disabled: userPlan === "free",
    },
    {
      id: "standard",
      name: "Standard",
      description: "For growing freelancers",
      price: 9.99,
      tools: 15,
      features: [
        "Up to 15 tools",
        "Advanced tool management",
        "Bulk operations & inline editing",
        "Budget tracking & alerts",
        "Renewal calendar view",
        "Email reminders (7, 3, 1 day before)",
        "Multi-format export (CSV, PDF, JSON)",
        "Advanced analytics & insights",
        "Invoice & Receipt storage (500MB)",
        "Usage tracking & optimization tips",
        "Team collaboration",
        "API Keys access",
        "Priority support",
      ],
      cta: userPlan === "standard" ? "Current Plan" : "Upgrade to Standard",
      ctaVariant: userPlan === "standard" ? ("outline" as const) : ("default" as const),
      disabled: userPlan === "standard",
      popular: true,
    },
    {
      id: "premium",
      name: "Premium",
      description: "Unlimited tool management",
      price: 19.99,
      tools: "unlimited",
      features: [
        "Unlimited tools",
        "Everything in Standard",
        "Cost optimization engine",
        "Duplicate tool detection",
        "Smart savings recommendations",
        "Integrations Hub (Slack, Zapier, Make)",
        "Browser extension",
        "Webhooks for automation",
        "Unlimited invoice storage",
        "Custom ROI reports",
        "Accounting software sync",
        "Dedicated account manager",
        "Priority support 24/7",
        "Early access to new features",
      ],
      cta: userPlan === "premium" ? "Current Plan" : "Upgrade to Premium",
      ctaVariant: userPlan === "premium" ? ("outline" as const) : ("default" as const),
      disabled: userPlan === "premium",
    },
  ];

  const handleUpgrade = (planId: string) => {
    console.log("Upgrade to", planId);
    // todo: remove mock functionality - implement Stripe integration
  };

  return (
    <div className="space-y-6 md:space-y-8 p-3 sm:p-4 md:p-6">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 sm:p-6 md:p-8 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Simple, Transparent Pricing</h1>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the perfect plan for managing your SaaS subscriptions. Upgrade anytime, no hidden fees.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 max-w-6xl mx-auto w-full">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col transition-all duration-300 ${
              plan.popular ? "md:scale-105 ring-2 ring-primary shadow-lg" : ""
            }`}
            data-testid={`pricing-card-${plan.id}`}
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
                {plan.id === "standard" && <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 flex-shrink-0 mt-1" />}
                {plan.id === "premium" && <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 flex-shrink-0 mt-1" />}
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
                onClick={() => handleUpgrade(plan.id)}
                variant={plan.ctaVariant}
                size="lg"
                className="w-full mb-6"
                disabled={plan.disabled}
                data-testid={`button-plan-${plan.id}`}
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

      {userPlan !== "free" && userToolsCount > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 sm:p-6 max-w-2xl mx-auto w-full">
          <div className="text-center">
            <p className="text-xs sm:text-sm font-medium text-foreground mb-1">Current Plan Usage</p>
            <p className="text-sm sm:text-base">
              You're using <span className="font-bold text-primary">{userToolsCount}</span> of{" "}
              <span className="font-bold">{userPlan === "standard" ? "15" : "unlimited"}</span> available tools
            </p>
            <p className="text-xs text-muted-foreground mt-2 capitalize">
              {userPlan} Plan
            </p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto w-full">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">Quick Comparison</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <Card className="hover-elevate">
            <CardContent className="pt-6 sm:pt-8">
              <div className="text-center space-y-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Free Plan</p>
                <p className="text-3xl sm:text-4xl font-bold text-primary">8</p>
                <p className="text-xs text-muted-foreground">tools limit</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-elevate border-primary/30 bg-primary/5">
            <CardContent className="pt-6 sm:pt-8">
              <div className="text-center space-y-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Standard Plan</p>
                <p className="text-3xl sm:text-4xl font-bold text-primary">15</p>
                <p className="text-xs text-muted-foreground">tools limit</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover-elevate">
            <CardContent className="pt-6 sm:pt-8">
              <div className="text-center space-y-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Premium Plan</p>
                <p className="text-3xl sm:text-4xl font-bold text-primary">…ˆž</p>
                <p className="text-xs text-muted-foreground">unlimited tools</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}




