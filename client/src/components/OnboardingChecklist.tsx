import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

interface OnboardingChecklistProps {
  hasTools: boolean;
  hasCurrencySet: boolean;
  hasConnectedGmail: boolean;
}

export function OnboardingChecklist({ hasTools, hasCurrencySet, hasConnectedGmail }: OnboardingChecklistProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const steps = [
    {
      id: "add-tool",
      label: "Add your first tool",
      description: "Start tracking your subscriptions manually or via import.",
      completed: hasTools,
      action: () => setLocation("/tools"),
      actionLabel: "Add Tool"
    },
    {
      id: "currency",
      label: "Set currency preference",
      description: "Ensure your analytics match your bank account.",
      completed: hasCurrencySet,
      action: () => setLocation("/settings"),
      actionLabel: "Settings"
    },
    {
      id: "connect",
      label: "Connect Gmail (Smart Scan)",
      description: "Automate discovery of tools from your inbox.",
      completed: hasConnectedGmail,
      action: () => setLocation("/smart-scan"),
      actionLabel: "Connect"
    }
  ];

  const progress = Math.round((steps.filter(s => s.completed).length / steps.length) * 100);

  if (progress === 100) return null; // Hide when done

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Getting Started</CardTitle>
          <span className="text-sm font-medium text-muted-foreground">{progress}% Complete</span>
        </div>
        <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
          <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-3">
              {step.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className={`font-medium ${step.completed ? "text-muted-foreground line-through" : ""}`}>
                    {step.label}
                  </p>
                  {!step.completed && (
                    <Button variant="ghost" size="sm" onClick={step.action} className="h-auto p-0 text-primary underline">
                      {step.actionLabel}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
