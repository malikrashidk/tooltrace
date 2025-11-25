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
      tools: 5,
      features: [
        "Up to 5 tools",
        "Basic tool management",
        "Email reminders",
        "CSV export",
        "Basic analytics",
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
      tools: 12,
      features: [
        "Up to 12 tools",
        "Advanced tool management",
        "Email reminders (7 and 1 day before)",
        "CSV import/export",
        "Advanced analytics",
        "Receipt storage",
        "Usage tracking",
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
        "Team collaboration (coming soon)",
        "API access",
        "Advanced integrations",
        "Dedicated support",
        "Custom reports",
        "Priority feature requests",
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
    <div className="space-y-8 p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-semibold">Simple, Transparent Pricing</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the perfect plan for managing your SaaS subscriptions. Upgrade anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col ${
              plan.popular ? "md:scale-105 ring-2 ring-primary" : ""
            }`}
            data-testid={`pricing-card-${plan.id}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
              </div>
            )}
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                {plan.id === "standard" && <Zap className="h-5 w-5 text-amber-500" />}
                {plan.id === "premium" && <Crown className="h-5 w-5 text-purple-500" />}
              </div>
              <CardDescription>{plan.description}</CardDescription>
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Up to {plan.tools} {typeof plan.tools === "number" ? "tools" : "tools"}
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Button
                onClick={() => handleUpgrade(plan.id)}
                variant={plan.ctaVariant}
                className="w-full mb-6"
                disabled={plan.disabled}
                data-testid={`button-plan-${plan.id}`}
              >
                {plan.cta}
              </Button>

              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">FEATURES</p>
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {userPlan !== "free" && userToolsCount > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-2xl mx-auto text-center">
          <p className="text-sm text-blue-900 dark:text-blue-300">
            You're currently using <span className="font-semibold">{userToolsCount}</span> of{" "}
            {userPlan === "standard" ? "12" : "unlimited"} available tools on the{" "}
            <span className="font-semibold capitalize">{userPlan}</span> plan.
          </p>
        </div>
      )}

      <div className="max-w-2xl mx-auto grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Free Plan</p>
              <p className="text-2xl font-semibold">5</p>
              <p className="text-xs text-muted-foreground">tools limit</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Standard Plan</p>
              <p className="text-2xl font-semibold">12</p>
              <p className="text-xs text-muted-foreground">tools limit</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Premium Plan</p>
              <p className="text-2xl font-semibold">∞</p>
              <p className="text-xs text-muted-foreground">unlimited tools</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
