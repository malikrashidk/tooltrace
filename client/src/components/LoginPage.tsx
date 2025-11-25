import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/context/AuthContext";

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
  const { login } = useAuth();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
            <CardDescription className="mt-2">
              Sign in to manage your SaaS tools
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        data-testid="input-email"
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
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <button
                onClick={onSwitchToSignup}
                className="text-primary hover:underline font-medium"
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
    </div>
  );
}
