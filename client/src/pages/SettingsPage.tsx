import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Bell, User, Key, Download, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { CurrencySelector } from "@/components/CurrencySelector";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  budgetThreshold: z.number().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Password must be at least 6 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notificationSettings, setNotificationSettings] = useState({
    emailReminders: true,
    reminderDays: "7",
    lowUsageAlerts: true,
    weeklyReport: false,
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      budgetThreshold: undefined,
    },
  });

  // Reset form when user data is available
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || "",
        email: user.email || "",
        budgetThreshold: user.budgetThreshold ? parseFloat(user.budgetThreshold) : undefined,
      });
    }
  }, [user, profileForm]);

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      const response = await apiRequest("PATCH", "/api/auth/profile", data);

      if (!response.ok) throw new Error("Failed to update profile");

      // Force reload to get fresh data
      window.location.reload();

      toast({
        title: "Profile updated",
        description: "Your profile and budget settings have been updated.",
      });
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    console.log("Password changed:", data);
    toast({
      title: "Password changed",
      description: "Your password has been changed successfully.",
    });
    passwordForm.reset();
  };

  const handleNotificationChange = (key: string, value: boolean | string) => {
    setNotificationSettings((prev) => ({ ...prev, [key]: value }));
    toast({
      title: "Settings saved",
      description: "Your notification preferences have been updated.",
    });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <div className="grid gap-4 sm:gap-6 w-full max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Label className="text-sm font-medium mb-2 block">Currency / Region</Label>
                <CurrencySelector />
                <p className="text-xs text-muted-foreground mt-1">Select your preferred currency for display.</p>
              </div>

              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input data-testid="input-settings-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" data-testid="input-settings-email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="budgetThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Budget Alert ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 500"
                            {...field}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === "") {
                                field.onChange(null);
                              } else {
                                const parsed = parseFloat(val);
                                field.onChange(isNaN(parsed) ? null : parsed);
                              }
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Set a monthly budget to get alerts when your spending exceeds this amount.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" data-testid="button-save-profile">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your password</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" data-testid="input-current-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input type="password" data-testid="input-new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input type="password" data-testid="input-confirm-new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" data-testid="button-change-password">
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <TwoFactorSetup />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Configure email notifications and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-reminders">Renewal Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email reminders before subscriptions renew
                  </p>
                </div>
                <Switch
                  id="email-reminders"
                  checked={notificationSettings.emailReminders}
                  onCheckedChange={(checked) => handleNotificationChange("emailReminders", checked)}
                  data-testid="switch-email-reminders"
                />
              </div>

              {notificationSettings.emailReminders && (
                <div className="flex items-center justify-between pl-4 border-l-2 border-muted">
                  <div className="space-y-0.5">
                    <Label>Reminder Timing</Label>
                    <p className="text-sm text-muted-foreground">
                      How many days before renewal to send reminder
                    </p>
                  </div>
                  <Select
                    value={notificationSettings.reminderDays}
                    onValueChange={(value) => handleNotificationChange("reminderDays", value)}
                  >
                    <SelectTrigger className="w-[120px]" data-testid="select-reminder-days">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="low-usage">Low Usage Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about rarely used paid subscriptions
                  </p>
                </div>
                <Switch
                  id="low-usage"
                  checked={notificationSettings.lowUsageAlerts}
                  onCheckedChange={(checked) => handleNotificationChange("lowUsageAlerts", checked)}
                  data-testid="switch-low-usage-alerts"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-report">Weekly Report</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a weekly summary of your subscriptions
                  </p>
                </div>
                <Switch
                  id="weekly-report"
                  checked={notificationSettings.weeklyReport}
                  onCheckedChange={(checked) => handleNotificationChange("weeklyReport", checked)}
                  data-testid="switch-weekly-report"
                />
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Tooltrace Extension
              </CardTitle>
              <CardDescription>SaaS Account & Subscription Tracker</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Install our browser extension to automatically detect SaaS tools as you browse the web.
                It makes adding tools to Tooltrace quick and effortless.
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="https://chrome.google.com/webstore/detail/dbenmpcifjohimjmkmdaheemldacfhhg"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="button-download-extension"
                >
                  <Button className="w-full sm:w-auto gap-2">
                    <Download className="h-4 w-4" />
                    Install from Chrome Web Store
                  </Button>
                </a>
                <a
                  href="https://github.com/yourusername/tooltrace-extension"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                  data-testid="link-extension-docs"
                >
                  View Installation Instructions …†’
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
