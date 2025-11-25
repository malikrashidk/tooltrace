import { useState } from "react";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Tool } from "@/lib/mockData";

interface CredentialsDialogProps {
  tool: Tool;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (tool: Tool) => void;
}

export function CredentialsDialog({ tool, open, onOpenChange, onSave }: CredentialsDialogProps) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showForm, setShowForm] = useState(!tool.credentials?.username);
  const [copied, setCopied] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: tool.credentials?.username || "",
    email: tool.credentials?.email || "",
    password: tool.credentials?.password || "",
    notes: tool.credentials?.notes || "",
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ description: `${label} copied to clipboard` });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = () => {
    if (!formData.username && !formData.email) {
      toast({ description: "Please enter at least a username or email", variant: "destructive" });
      return;
    }

    const updatedTool: Tool = {
      ...tool,
      credentials: {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        notes: formData.notes,
        lastUpdated: new Date().toISOString(),
      },
    };

    onSave?.(updatedTool);
    setShowForm(false);
  };

  const handleDelete = () => {
    const updatedTool: Tool = {
      ...tool,
      credentials: undefined,
    };
    onSave?.(updatedTool);
    toast({ description: "Login info deleted" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Login Information</DialogTitle>
          <DialogDescription>{tool.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showForm && tool.credentials && tool.credentials.username ? (
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Saved Credentials</CardTitle>
                {tool.credentials.lastUpdated && (
                  <CardDescription className="text-xs">
                    Last updated: {new Date(tool.credentials.lastUpdated).toLocaleDateString()}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {tool.credentials && tool.credentials.username && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Username</Label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={tool.credentials.username}
                        className="flex-1 text-sm px-3 py-2 rounded-md border border-border bg-background"
                        data-testid={`input-username-display-${tool.id}`}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(tool.credentials.username!, "Username")}
                        data-testid={`button-copy-username-${tool.id}`}
                      >
                        {copied === "Username" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {tool.credentials && tool.credentials.email && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Email</Label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={tool.credentials.email}
                        className="flex-1 text-sm px-3 py-2 rounded-md border border-border bg-background"
                        data-testid={`input-email-display-${tool.id}`}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(tool.credentials.email!, "Email")}
                        data-testid={`button-copy-email-${tool.id}`}
                      >
                        {copied === "Email" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {tool.credentials && tool.credentials.password && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Password</Label>
                    <div className="flex gap-2">
                      <input
                        type={showPassword ? "text" : "password"}
                        readOnly
                        value={tool.credentials.password}
                        className="flex-1 text-sm px-3 py-2 rounded-md border border-border bg-background"
                        data-testid={`input-password-display-${tool.id}`}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPassword(!showPassword)}
                        data-testid={`button-toggle-password-${tool.id}`}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(tool.credentials.password!, "Password")}
                        data-testid={`button-copy-password-${tool.id}`}
                      >
                        {copied === "Password" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {tool.credentials && tool.credentials.notes && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Notes</Label>
                    <p className="text-xs text-muted-foreground bg-background rounded-md p-2">
                      {tool.credentials.notes}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowForm(true)}
                    data-testid={`button-edit-credentials-${tool.id}`}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={handleDelete}
                    data-testid={`button-delete-credentials-${tool.id}`}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="username" className="text-sm">
                  Username
                </Label>
                <Input
                  id="username"
                  placeholder="your_username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  data-testid={`input-username-edit-${tool.id}`}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid={`input-email-edit-${tool.id}`}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-sm">
                  Password
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    data-testid={`input-password-edit-${tool.id}`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid={`button-toggle-show-password-${tool.id}`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes" className="text-sm">
                  Notes (2FA, security questions, etc.)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="e.g., 2FA enabled with authenticator app..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="min-h-20"
                  data-testid={`input-notes-edit-${tool.id}`}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      username: tool.credentials?.username || "",
                      email: tool.credentials?.email || "",
                      password: tool.credentials?.password || "",
                      notes: tool.credentials?.notes || "",
                    });
                  }}
                  data-testid={`button-cancel-credentials-${tool.id}`}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  data-testid={`button-save-credentials-${tool.id}`}
                >
                  Save Credentials
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-md p-3">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Security Note:</strong> Your login credentials are stored securely in your account. For maximum security, use a password manager instead.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
