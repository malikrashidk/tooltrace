import { X, Chrome, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";

const CHROME_STORE_URL = "https://chrome.google.com/webstore/detail/dbenmpcifjohimjmkmdaheemldacfhhg";
const DISMISSED_KEY = "tooltrace_extension_promo_dismissed";

interface ExtensionPromoBannerProps {
    variant?: "compact" | "full" | "card";
    dismissible?: boolean;
    className?: string;
}

export function ExtensionPromoBanner({
    variant = "full",
    dismissible = true,
    className = ""
}: ExtensionPromoBannerProps) {
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const isDismissed = localStorage.getItem(DISMISSED_KEY);
        if (isDismissed) {
            setDismissed(true);
        }
    }, []);

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem(DISMISSED_KEY, "true");
    };

    if (dismissed) return null;

    if (variant === "compact") {
        return (
            <div className={`bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between ${className}`}>
                <div className="flex items-center gap-3">
                    <Chrome className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <p className="text-sm font-medium">
                        Install our Chrome extension to auto-detect subscriptions
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" asChild>
                        <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer">
                            Install Now
                        </a>
                    </Button>
                    {dismissible && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={handleDismiss}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    if (variant === "card") {
        return (
            <Card className={`relative overflow-hidden ${className}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
                {dismissible && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 z-10"
                        onClick={handleDismiss}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
                <div className="relative p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Chrome className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Get the Chrome Extension</h3>
                            <p className="text-sm text-muted-foreground">Auto-detect subscriptions while you browse</p>
                        </div>
                    </div>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-blue-500" />
                            <span>Automatically detect SaaS subscriptions</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-blue-500" />
                            <span>Track billing page visits</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-blue-500" />
                            <span>Get subscription probability scores</span>
                        </li>
                    </ul>
                    <Button className="w-full" asChild>
                        <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer">
                            <Chrome className="h-4 w-4 mr-2" />
                            Install from Chrome Web Store
                        </a>
                    </Button>
                </div>
            </Card>
        );
    }

    // Full variant (default)
    return (
        <div className={`relative overflow-hidden rounded-lg border bg-card ${className}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-gradient" />
            {dismissible && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 h-8 w-8 z-10"
                    onClick={handleDismiss}
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
            <div className="relative p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                        <Chrome className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                            Install our Chrome Extension
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Automatically discover subscriptions from your browsing activity. We'll detect when you visit SaaS tools, track billing page visits, and calculate subscription probabilities — all while you browse normally.
                        </p>
                    </div>
                    <Button size="lg" asChild className="flex-shrink-0">
                        <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer">
                            <Chrome className="h-5 w-5 mr-2" />
                            Install Extension
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}
