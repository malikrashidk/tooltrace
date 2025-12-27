import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";

interface ToolLogoProps {
    url?: string | null;
    name: string;
    websiteUrl?: string | null;
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
}

export function ToolLogo({ url, name, websiteUrl, size = "md", className }: ToolLogoProps) {
    // Size mapping
    const sizeClasses = {
        sm: "h-8 w-8 text-xs", // bump small size slightly for visibility
        md: "h-10 w-10 text-sm",
        lg: "h-16 w-16 text-lg",
        xl: "h-24 w-24 text-2xl",
    };

    // Helper to extract domain for logo services
    const getDomain = (url: string) => {
        try {
            if (!url) return null;
            // Handle cases where url might not have protocol
            const safeUrl = url.startsWith("http") ? url : `https://${url}`;
            const domain = new URL(safeUrl).hostname;
            return domain.replace("www.", "");
        } catch {
            return null;
        }
    };

    const domain = websiteUrl ? getDomain(websiteUrl) : null;

    // Generate initials (max 2 chars)
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
    };

    // Generate a deterministic background color based on the name
    const getBgColor = (name: string) => {
        const colors = [
            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
            "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
            "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
            "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
            "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
            "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
            "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
            "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
            "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
            "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-400",
            "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
            "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <Avatar className={cn(sizeClasses[size], "border border-border/10 bg-white dark:bg-zinc-900 shrink-0", className)}>
            {/* Priority 1: User provided URL or explicit logo URL */}
            {url && <AvatarImage src={url} alt={`${name} logo`} className="object-contain p-1" />}

            {/* Priority 2: Clearbit Logo (Often better quality/transparent) */}
            {domain && (
                <AvatarImage
                    src={`https://logo.clearbit.com/${domain}`}
                    alt={`${name} logo`}
                    className="object-contain p-1.5"
                />
            )}

            {/* Priority 3: Google Favicon High-Res (High reliability fallback) */}
            {domain && (
                <AvatarImage
                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
                    alt={`${name} favicon`}
                    className="object-contain p-1.5"
                />
            )}

            {/* Fallback: Initials */}
            <AvatarFallback className={cn("font-bold", getBgColor(name))}>
                {name ? getInitials(name) : <HelpCircle className="h-1/2 w-1/2 opacity-50" />}
            </AvatarFallback>
        </Avatar>
    );
}
