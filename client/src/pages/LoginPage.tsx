import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Shield, Loader2, Check } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LoadingScreen } from "@/components/LoadingScreen";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onSwitchToSignup?: () => void;
  onForgotPassword?: () => void;
}

// Helper to sanitize returnTo path to prevent open redirects
const sanitizeReturnTo = (path: string | null): string => {
  if (!path) return "/";
  if (path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return "/";
};

export function LoginPage({ onSwitchToSignup, onForgotPassword }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingToken, setIsProcessingToken] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);
  const { login: _login, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle Logic: Plan parameter & OAuth Token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    // Capture plan intent (backup for global listener in App.tsx)
    const plan = urlParams.get("plan");
    const cycle = urlParams.get("cycle");
    if (plan) {
      sessionStorage.setItem("pending_plan", plan);
      if (cycle) {
        sessionStorage.setItem("pending_cycle", cycle);
      }
    }

    // Capture OAuth Code or Token (Legacy)
    const processAuth = async () => {
      const code = urlParams.get("code");
      const token = urlParams.get("token"); // Kept for legacy support during transition
      const error = urlParams.get("error");

      if (code) {
        setIsProcessingToken(true);
        console.log("[LoginPage] Handoff code found via OAuth");

        try {
          const res = await fetch("/api/auth/oauth/handoff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code }),
          });

          if (!res.ok) throw new Error("Handoff exchange failed");

          const data = await res.json();
          localStorage.setItem("token", data.token);
          await refreshUser();

          const returnTo = sanitizeReturnTo(urlParams.get("returnTo"));
          const dest = (returnTo === "/login" || returnTo.includes("/login?")) ? "/" : returnTo;

          console.log("[LoginPage] Auth success via handoff, navigating to:", dest);
          setLocation(dest);
        } catch (e) {
          console.error("[LoginPage] Failed to process handoff:", e);
          toast({
            title: "Authentication Failed",
            description: "Could not verify your social sign-in. Please try again.",
            variant: "destructive",
          });
          setIsProcessingToken(false);
        }
      } else if (token) {
        // Legacy fallback
        setIsProcessingToken(true);
        console.log("[LoginPage] Token found via legacy OAuth");
        try {
          localStorage.setItem("token", token);
          await refreshUser();
          const returnTo = sanitizeReturnTo(urlParams.get("returnTo"));
          const dest = (returnTo === "/login" || returnTo.includes("/login?")) ? "/" : returnTo;
          setLocation(dest);
        } catch (e) {
          console.error("[LoginPage] Failed to process legacy token:", e);
          setIsProcessingToken(false);
        }
      }

      if (error === "oauth_failed") {
        toast({
          title: "Sign-in Failed",
          description: "Unable to sign in with social account. Please try again.",
          variant: "destructive",
        });
        window.history.replaceState({}, "", "/login");
      }
    };

    processAuth();
  }, [refreshUser, setLocation, toast]);

  if (isProcessingToken) {
    return <LoadingScreen message="Completing sign in..." />;
  }

  const handleGoogleSignIn = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = sanitizeReturnTo(urlParams.get("returnTo"));
    const redirectUrl = returnTo !== "/" ? `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}` : "/api/auth/google";
    window.location.href = redirectUrl;
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      const result = await response.json();

      if (result.requiresTwoFactor) {
        setPendingCredentials({ email: data.email, password: data.password });
        setRequires2FA(true);
        return;
      }

      if (!response.ok || !result.token || !result.user) {
        throw new Error(result.error || "Login failed");
      }

      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      const urlParams = new URLSearchParams(window.location.search);
      const returnTo = sanitizeReturnTo(urlParams.get("returnTo"));
      window.location.href = returnTo;
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FAVerify = async () => {
    if (!pendingCredentials) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingCredentials.email,
          password: pendingCredentials.password,
          twoFactorCode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Invalid 2FA code");
      }

      localStorage.setItem("token", result.token);
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto mb-6">
              <img src="/tooltrace-logo.png" alt="ToolTrace Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">
              Sign in to manage your SaaS subscriptions
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        data-testid="input-email"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          data-testid="input-password"
                          className="h-11 pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {onForgotPassword && (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-sm font-medium text-primary hover:underline"
                    data-testid="link-forgot-password"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground font-medium uppercase">Or continue with</span>
              <Separator className="flex-1" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 gap-2 text-base font-normal"
              disabled={isLoading}
              data-testid="button-google-signin"
              onClick={handleGoogleSignIn}
            >
              <FcGoogle className="h-5 w-5" />
              Google
            </Button>
          </div>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <button
              onClick={onSwitchToSignup}
              className="font-semibold text-primary hover:underline"
              data-testid="link-signup"
            >
              Sign up
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex w-1/2 bg-[#0a0a0b] relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>

        <div className="relative z-10 max-w-lg space-y-10">
          <div className="space-y-6">
            <h2 className="text-4xl font-extrabold tracking-tight text-white leading-[1.2]">
              Your SaaS ecosystem, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">unified.</span>
            </h2>
            <p className="text-lg text-slate-400 font-light leading-relaxed">
              Track spending, manage credentials, and automate renewal alerts in one secure place.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-300">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 shadow-lg">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <span className="text-base font-medium">Auto-detect subscriptions</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 shadow-lg">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <span className="text-base font-medium">Smart renewal alerts</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/10 shadow-lg">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <span className="text-base font-medium">Secure credential vault</span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={requires2FA} onOpenChange={setRequires2FA}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Enter the 6-digit code from your authenticator app or a backup code.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="2fa-code">Verification Code</Label>
              <Input
                id="2fa-code"
                placeholder="Enter 6-digit code"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9A-Za-z-]/g, "").slice(0, 9))}
                maxLength={9}
                data-testid="input-2fa-login-code"
              />
              <p className="text-xs text-muted-foreground">
                You can also use a backup code (e.g., XXXX-XXXX)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRequires2FA(false);
                setTwoFactorCode("");
                setPendingCredentials(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handle2FAVerify}
              disabled={twoFactorCode.length < 6 || isLoading}
              data-testid="button-verify-2fa-login"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
