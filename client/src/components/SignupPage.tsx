import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Check } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupPageProps {
  onSwitchToLogin?: () => void;
}

// Helper to sanitize returnTo path to prevent open redirects
const sanitizeReturnTo = (path: string | null): string => {
  if (!path) return "/";
  if (path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return "/";
};

export function SignupPage({ onSwitchToLogin }: SignupPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();

  // Capture plan intent on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get("plan");
    if (plan) {
      sessionStorage.setItem("pending_plan", plan);
    }
  }, []);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleGoogleSignIn = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const returnTo = sanitizeReturnTo(urlParams.get("returnTo"));
    const redirectUrl = returnTo !== "/" ? `/api/auth/google?returnTo=${encodeURIComponent(returnTo)}` : "/api/auth/google";
    window.location.href = redirectUrl;
  };

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      await signup(data.email, data.password, data.name);
      // The signup function typically redirects or updates state.
      // If successful, the Dashboard will load and handle the pending_plan.
    } catch (error) {
      console.error("Signup failed:", error);
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
            <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
            <p className="text-muted-foreground">
              Start managing your SaaS subscriptions today
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        data-testid="input-name"
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
                          placeholder="Create a password"
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
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        data-testid="input-confirm-password"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 text-base"
                disabled={isLoading}
                data-testid="button-signup"
              >
                {isLoading ? "Creating account..." : "Create Account"}
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
              data-testid="button-google-signup"
              onClick={handleGoogleSignIn}
            >
              <FcGoogle className="h-5 w-5" />
              Google
            </Button>
          </div>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <button
              onClick={onSwitchToLogin}
              className="font-semibold text-primary hover:underline"
              data-testid="link-login"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>

      {/* Right Side: Branding */}
      <div className="hidden lg:flex w-1/2 bg-muted relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/10 to-muted z-0" />
        <div className="relative z-10 max-w-lg space-y-8">
           <div className="space-y-4">
             <h2 className="text-4xl font-bold tracking-tight text-foreground">
              Master your SaaS stack.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Join thousands of founders and teams who use ToolTrace to track subscriptions, manage costs, and discover savings opportunities.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">Track all your tools in one place</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">Get alerted before renewals</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">Identify unused subscriptions</span>
            </div>
          </div>

          <div className="pt-8">
             <div className="rounded-xl border bg-card/50 p-6 backdrop-blur-sm shadow-sm">
                <p className="text-sm text-muted-foreground italic">
                  "ToolTrace helped us cut our monthly SaaS spend by 25% in just the first week. It's an essential tool for any growing business."
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
                  <div>
                    <p className="text-sm font-semibold">Sarah Jenkins</p>
                    <p className="text-xs text-muted-foreground">CTO, TechStart Inc.</p>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
