import { AlertTriangle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  if (!user || user.emailVerifiedAt) {
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
    } catch (error) {
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
    <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-900 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5 sm:mt-0" />
        <div className="text-sm text-amber-800 dark:text-amber-200 break-words">
          Your email address (<strong className="break-all">{user.email}</strong>) is not verified.
          <span className="block sm:inline"> Some features like adding tools are restricted.</span>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleResend}
        disabled={isLoading}
        className="w-full sm:w-auto shrink-0 border-amber-300 hover:bg-amber-200 text-amber-900 dark:border-amber-700 dark:hover:bg-amber-900 dark:text-amber-100"
      >
        <Mail className="h-3 w-3 mr-2" />
        {isLoading ? "Sending..." : "Resend Email"}
      </Button>
    </div>
  );
}
