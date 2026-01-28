import { CheckCircle2, Circle, Chrome, ArrowRight, Settings, Plus, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const CHROME_STORE_URL = "https://chrome.google.com/webstore/detail/dbenmpcifjohimjmkmdaheemldacfhhg";

interface OnboardingChecklistProps {
  hasTools: boolean;
  hasCurrencySet: boolean;
}

export function OnboardingChecklist({ hasTools, hasCurrencySet }: OnboardingChecklistProps) {
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const onboardingStatus = user?.onboardingStatus || {};

  const handleToggleComplete = async (stepId: string, currentState: boolean) => {
    if (!user) return;

    setIsUpdating(stepId);
    try {
      const newStatus = { ...onboardingStatus, [stepId]: !currentState };
      const response = await apiRequest("PATCH", "/api/auth/profile", {
        onboardingStatus: newStatus
      });

      if (!response.ok) throw new Error("Failed to update status");

      await refreshUser(true);
      toast({
        title: !currentState ? "Step completed!" : "Step unmarked",
        description: "Your progress has been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not save progress. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const steps = [
    {
      id: "add-tool",
      label: "Add your first tool",
      description: "Start tracking your subscriptions manually or import from CSV.",
      completed: hasTools || onboardingStatus["add-tool"],
      isAuto: hasTools,
      action: () => setLocation("/tools"),
      actionLabel: "Add Tool",
      icon: <Plus className="h-4 w-4" />
    },
    {
      id: "currency",
      label: "Set currency preference",
      description: "Ensure your spending calculations match your location.",
      completed: hasCurrencySet || onboardingStatus["currency"],
      isAuto: hasCurrencySet,
      action: () => setLocation("/settings"),
      actionLabel: "Settings",
      icon: <Settings className="h-4 w-4" />
    },
    {
      id: "install-extension",
      label: "Install Chrome Extension",
      description: "Auto-detect subscriptions as you browse the web.",
      completed: onboardingStatus["install-extension"],
      isAuto: false,
      action: () => window.open(CHROME_STORE_URL, "_blank"),
      actionLabel: "View in Store",
      icon: <Chrome className="h-4 w-4" />
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  // If everything is done, we could hide it, but maybe show a "You're all set!" message first
  // The user said "they doesn't complete ever", so let's make sure it hides when truly done.
  if (progress === 100) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <CheckCircle2 className="h-24 w-24 text-primary" />
      </div>

      <CardHeader className="pb-3 border-b border-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              🚀 Getting Started
            </CardTitle>
            <CardDescription>Complete these steps to unlock the full power of Tooltrace</CardDescription>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-primary">{completedCount} / {steps.length} Done</span>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Progress</p>
          </div>
        </div>
        <div className="w-full bg-secondary h-2.5 rounded-full mt-4 overflow-hidden border border-primary/5">
          <div
            className="bg-primary h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid gap-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 border ${step.completed
                  ? "bg-muted/30 border-transparent opacity-75"
                  : "bg-background border-border shadow-sm hover:border-primary/30"
                }`}
            >
              <button
                onClick={() => handleToggleComplete(step.id, !!step.completed)}
                disabled={isUpdating === step.id}
                className="mt-1 transition-transform active:scale-95 group"
              >
                {step.completed ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 fill-green-50" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </button>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold ${step.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {step.label}
                    </p>
                    {step.isAuto && !onboardingStatus[step.id] && (
                      <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">
                        Auto-detected
                      </span>
                    )}
                  </div>

                  {!step.completed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={step.action}
                      className="h-8 gap-1.5 text-xs font-bold border-primary/20 hover:bg-primary/5"
                    >
                      {step.icon}
                      {step.actionLabel}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>

                {step.id === "install-extension" && !step.completed && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                    <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <p className="text-xs text-blue-800 dark:text-blue-300">
                      Already installed? Click the circle to mark it as done.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <span className="text-lg">💡</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-orange-900 dark:text-orange-200">Pro Tip</h4>
              <p className="text-xs text-orange-800/70 dark:text-orange-300/70">Adding at least 3 tools gives you a full spending forecast!</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/tools")} className="text-orange-900 dark:text-orange-200 hover:bg-orange-100/50">
            Add more →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
