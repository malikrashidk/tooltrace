import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserPlus, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function AcceptInvitePage() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");
  const { toast } = useToast();
  const { user, login } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<{ email: string; inviterName: string; teamId: string } | null>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!token) {
      setError("Missing invitation token");
      setLoading(false);
      return;
    }

    // Verify token validity
    fetch(`/api/team/verify-invite?token=${token}`)
      .then(res => {
        if (!res.ok) throw new Error("Invalid or expired invitation");
        return res.json();
      })
      .then(data => {
        setInviteData(data);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/team/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept invitation");
      }

      toast({
        title: "Invitation Accepted",
        description: "You have joined the team successfully.",
      });

      setLocation("/");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    try {
      setLoading(true);
      // Register new user AND accept invite in one go
      const res = await fetch("/api/team/register-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: data.name,
          password: data.password,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Registration failed");
      }

      // Auto-login after registration
      await login(inviteData!.email, data.password);

      toast({
        title: "Welcome!",
        description: "Account created and invitation accepted.",
      });

      setLocation("/");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  if (loading && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Invitation Error
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => setLocation("/login")}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Join Team</CardTitle>
          <CardDescription className="text-center">
            You&apos;ve been invited to join a team on ToolTrace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-primary/5 rounded-lg p-4 mb-6 flex flex-col items-center text-center gap-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{inviteData?.inviterName} invited you</p>
              <p className="text-sm text-muted-foreground">{inviteData?.email}</p>
            </div>
          </div>

          {user ? (
            // User is already logged in
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                You are currently logged in as <strong>{user.email}</strong>.
                {user.email !== inviteData?.email && (
                  <span className="block mt-2 text-amber-600">
                    Warning: This invitation was sent to {inviteData?.email}.
                  </span>
                )}
              </p>
              <Button className="w-full" onClick={handleAccept} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Accept Invitation
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
                Cancel
              </Button>
            </div>
          ) : (
            // New user registration
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
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
                      <FormLabel>Create Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
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
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating Account..." : "Create Account & Join Team"}
                </Button>
                <div className="text-center text-sm">
                   Already have an account? <a href={`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="underline">Log in first</a>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
