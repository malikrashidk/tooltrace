import { Lock, Zap, Building } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface FeaturePaywallProps {
    title: string;
    description: string;
    requiredPlan: "pro" | "enterprise";
    icon?: React.ReactNode;
}

export function FeaturePaywall({ title, description, requiredPlan, icon }: FeaturePaywallProps) {
    const [, setLocation] = useLocation();

    const isEnterprise = requiredPlan === "enterprise";
    const planName = isEnterprise ? "Enterprise" : "Pro";
    const PlanIcon = isEnterprise ? Building : Zap;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl h-[80vh] flex flex-col items-center justify-center">
            <Card className="w-full max-w-xl border-dashed border-2 bg-gradient-to-b from-background to-muted/30 shadow-2xl">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 ring-8 ring-primary/5">
                        {icon || <Lock className="h-8 w-8 text-primary animate-pulse" />}
                    </div>
                    <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</CardTitle>
                    <CardDescription className="text-base sm:text-lg mt-2 font-medium bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                        Available on {planName} Plans
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    <div className="relative p-6 bg-background/50 rounded-xl border border-primary/10 space-y-4">
                        <p className="text-sm sm:text-base text-muted-foreground text-center leading-relaxed">
                            {description}
                        </p>

                        <div className="pt-2">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                                <div className="p-1.5 bg-primary/10 rounded-md">
                                    <PlanIcon className="h-4 w-4 text-primary" />
                                </div>
                                <div className="text-xs sm:text-sm">
                                    <span className="font-semibold text-foreground">Unlock this feature</span> and more by upgrading to the <span className="font-bold text-primary">{planName}</span> plan today.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button
                            className="w-full py-6 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all"
                            onClick={() => setLocation("/pricing")}
                        >
                            <Zap className="mr-2 h-5 w-5 fill-current" />
                            Upgrade to {planName}
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full py-6 text-lg font-medium"
                            onClick={() => setLocation("/")}
                        >
                            Back to Dashboard
                        </Button>
                    </div>

                    <p className="text-[10px] sm:text-xs text-center text-muted-foreground/60 uppercase tracking-widest font-semibold pt-2">
                        Includes 14-day money-back guarantee
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
