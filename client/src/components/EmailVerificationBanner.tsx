import { AlertTriangle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Hide warning if we are on the success page to avoid double banners
  const isVerifiedPage = window.location.search.includes("verified=true");

  if (!user || user.emailVerifiedAt || isVerifiedPage) {
    return null;
  }

  const handleResend = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });

      if (res.ok) {
        toast({
          title: "Email Sent",
          description: "A new verification link has been sent to your email.",
        });
      } else {
        throw new Error("Failed to send");
      }
    } catch (_error) {
      toast({
        title: "Error",
        description: "Could not send verification email. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-primary/5 backdrop-blur-sm border-b border-primary/10 px-4 py-2 flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-top duration-500">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary animate-pulse" />
        <div className="text-xs font-medium text-foreground/80">
          Check your inbox (<span className="text-primary">{user.email}</span>) to verify your account and unlock all features.
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleResend}
        disabled={isLoading}
        className="h-auto p-0 text-xs font-semibold text-primary hover:no-underline hover:text-primary/80 underline underline-offset-4"
      >
        {isLoading ? "Sending..." : "Resend Link"}
      </Button>
    </div>
  );
}
