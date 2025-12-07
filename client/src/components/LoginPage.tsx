import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Layers, Shield, Loader2 } from "lucide-react";
import { SiFacebook } from "react-icons/si";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onSwitchToSignup?: () => void;
}

export function LoginPage({ onSwitchToSignup }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);
  const { login } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const error = urlParams.get("error");
    
    if (token) {
      localStorage.setItem("token", token);
      window.location.href = "/";
    }
    
    if (error === "oauth_failed") {
      toast({
        title: "Sign-in Failed",
        description: "Unable to sign in with social account. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/");
    }
  }, [toast]);

  const handleGoogleSignIn = () => {
    window.location.href = "/api/auth/google";
  };

  const handleFacebookSignIn = () => {
    window.location.href = "/api/auth/facebook";
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
      
      if (!response.ok) {
        throw new Error(result.error || "Login failed");
      }
      
      if (result.token && result.user) {
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.user));
        window.location.href = "/";
      }
    } catch (error: any) {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-6 pb-8">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
            <Layers className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Welcome back</CardTitle>
            <CardDescription className="mt-2 text-base">
              Sign in to manage your SaaS subscriptions
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        data-testid="input-email"
                        className="h-10"
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
                    <FormLabel className="text-sm font-medium">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          data-testid="input-password"
                          className="h-10 pr-10"
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
              <Button
                type="submit"
                className="w-full h-10 font-semibold"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground font-medium">OR</span>
              <Separator className="flex-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2"
                disabled={isLoading}
                data-testid="button-google-signin"
                onClick={handleGoogleSignIn}
              >
                <FcGoogle className="h-4 w-4" />
                <span className="text-xs">Google</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2"
                disabled={isLoading}
                data-testid="button-facebook-signin"
                onClick={handleFacebookSignIn}
              >
                <SiFacebook className="h-4 w-4" style={{ color: '#1877F2' }} />
                <span className="text-xs">Facebook</span>
              </Button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                onClick={onSwitchToSignup}
                className="text-primary hover:underline font-semibold"
                data-testid="link-signup"
              >
                Sign up
              </button>
            </p>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/30">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-3">
              Demo Accounts for Testing:
            </p>
            <div className="space-y-2 text-xs text-blue-800 dark:text-blue-300">
              <div className="flex justify-between items-center p-2 bg-white dark:bg-blue-950/50 rounded">
                <div>
                  <div className="font-medium">Admin</div>
                  <div className="text-blue-600 dark:text-blue-400">admin@demo.com</div>
                </div>
                <div className="text-right text-blue-600 dark:text-blue-400">Demo@123456</div>
              </div>
              <div className="flex justify-between items-center p-2 bg-white dark:bg-blue-950/50 rounded">
                <div>
                  <div className="font-medium">Free Tier</div>
                  <div className="text-blue-600 dark:text-blue-400">free@demo.com</div>
                </div>
                <div className="text-right text-blue-600 dark:text-blue-400">Demo@123456</div>
              </div>
              <div className="flex justify-between items-center p-2 bg-white dark:bg-blue-950/50 rounded">
                <div>
                  <div className="font-medium">Standard Tier</div>
                  <div className="text-blue-600 dark:text-blue-400">standard@demo.com</div>
                </div>
                <div className="text-right text-blue-600 dark:text-blue-400">Demo@123456</div>
              </div>
              <div className="flex justify-between items-center p-2 bg-white dark:bg-blue-950/50 rounded">
                <div>
                  <div className="font-medium">Premium Tier</div>
                  <div className="text-blue-600 dark:text-blue-400">premium@demo.com</div>
                </div>
                <div className="text-right text-blue-600 dark:text-blue-400">Demo@123456</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
