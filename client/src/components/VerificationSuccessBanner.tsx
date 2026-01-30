import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";

export function VerificationSuccessBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    // Check for query param manually since wouter's useSearch is a bit basic sometimes
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("verified") === "true") {
      setIsVisible(true);
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);

      // Force refresh user data to clear the warning banner
      if (user && !user.emailVerifiedAt) {
          refreshUser();
      }
    }
  }, [user, refreshUser]);

  if (!isVisible) return null;

  return (
    <div className="p-3 sm:p-4 md:p-6 pb-0">
      <Alert className="bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800 flex items-center gap-4">
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        <div className="flex-1">
          <AlertTitle className="font-semibold text-lg">Your email is verified!</AlertTitle>
          <AlertDescription>
            Enjoy full access to ToolTrace features.
          </AlertDescription>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
        >
          <X className="h-5 w-5" />
        </button>
      </Alert>
    </div>
  );
}
