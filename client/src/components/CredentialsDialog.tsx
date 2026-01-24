import { useState, useEffect } from "react";
import { Eye, EyeOff, Copy, Check, Lock, AlertCircle, RefreshCw } from "lucide-react";
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
import { generateSecurePassword } from "@/lib/encryption";
import { validatePasswordStrength, sanitizeInput, auditLogger } from "@/lib/security";
import type { Tool } from "@/lib/analytics";

interface CredentialsDialogProps {
  tool: Tool;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (tool: Tool) => void;
}

export function CredentialsDialog({ tool, open, onOpenChange, onSave }: CredentialsDialogProps) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showForm, setShowForm] = useState(!(tool as any).hasCredentials);
  const [copied, setCopied] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [decryptedData, setDecryptedData] = useState<{ username?: string; email?: string; password?: string; notes?: string } | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<{ isStrong: boolean; errors: string[] }>({
    isStrong: false,
    errors: [],
  });

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    notes: "",
  });

  // Fetch decrypted credentials from server when dialog opens
  useEffect(() => {
    if (open && (tool as any).hasCredentials) {
      setIsLoading(true);
      fetch(`/api/tools/${tool.id}/reveal`)
        .then(res => res.json())
        .then(data => {
          if (data.credentials) {
            setDecryptedData(data.credentials);
            setFormData({
              username: data.credentials.username || "",
              email: data.credentials.email || "",
              password: data.credentials.password || "",
              notes: data.credentials.notes || "",
            });
            setShowForm(false);
          }
        })
        .catch(err => {
          console.error("Reveal error:", err);
          toast({ description: "Failed to reveal credentials", variant: "destructive" });
        })
        .finally(() => setIsLoading(false));
    } else if (open && !(tool as any).hasCredentials) {
      setShowForm(true);
      setFormData({ username: "", email: "", password: "", notes: "" });
    }
  }, [open, tool.id, (tool as any).hasCredentials, toast]);

  // Validate password strength on change
  useEffect(() => {
    if (formData.password) {
      const strength = validatePasswordStrength(formData.password);
      setPasswordStrength(strength);
    }
  }, [formData.password]);

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword();
    setFormData({ ...formData, password: newPassword });
    toast({ description: "Secure password generated" });
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      auditLogger.log("credential_copied", undefined, tool.id, label);
      toast({ description: `${label} copied to clipboard` });

      // Clear clipboard after 2 minutes for security
      setTimeout(() => {
        navigator.clipboard.writeText("");
        setCopied(null);
      }, 120000);
    });
  };

  const handleSave = async () => {
    if (!formData.username && !formData.password) {
      toast({ description: "Please enter at least a username and password", variant: "destructive" });
      return;
    }

    if (formData.password && !passwordStrength.isStrong) {
      toast({
        description: "Password is weak. " + passwordStrength.errors[0],
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Send plaintext to server; server will encrypt it
      const response = await fetch(`/api/tools/${tool.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: sanitizeInput(formData.username),
          email: sanitizeInput(formData.email),
          password: formData.password,
          notes: sanitizeInput(formData.notes)
        })
      });

      if (!response.ok) throw new Error("Failed to save");

      const { tool: updatedTool } = await response.json();

      auditLogger.log("credentials_saved", undefined, tool.id);
      // We need to tell the parent that we have credentials now
      onSave?.({ ...updatedTool, hasCredentials: true } as any);
      setShowForm(false);
      setDecryptedData({ username: formData.username, email: formData.email, password: formData.password, notes: formData.notes });
      toast({ description: "Credentials saved securely on server" });
    } catch (_error) {
      toast({
        description: "Failed to save credentials. Please try again.",
        variant: "destructive",
      });
      console.error("Save error:", _error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tools/${tool.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: null })
      });
      if (!response.ok) throw new Error("Delete failed");

      auditLogger.log("credentials_deleted", undefined, tool.id);
      onSave?.({ ...tool, hasCredentials: false } as any);
      setShowForm(true);
      setDecryptedData(null);
      setFormData({ username: "", email: "", password: "", notes: "" });
      toast({ description: "Login info deleted securely" });
    } catch (_e) {
      toast({ description: "Failed to delete login info", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Login Information</DialogTitle>
          <DialogDescription>{tool.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary/50" />
            </div>
          )}

          {!isLoading && !showForm && decryptedData ? (
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Saved Credentials</CardTitle>
                <CardDescription className="text-xs">
                  Revealed from secure vault
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {decryptedData.username && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Username</Label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={decryptedData.username}
                        className="flex-1 text-sm px-3 py-2 rounded-md border border-border bg-background"
                        data-testid={`input-username-display-${tool.id}`}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(decryptedData.username || "", "Username")}
                        data-testid={`button-copy-username-${tool.id}`}
                      >
                        {copied === "Username" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {decryptedData.password && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Password</Label>
                    <div className="flex gap-2">
                      <input
                        type={showPassword ? "text" : "password"}
                        readOnly
                        value={decryptedData.password}
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
                        onClick={() => handleCopy(decryptedData.password || "", "Password")}
                        data-testid={`button-copy-password-${tool.id}`}
                      >
                        {copied === "Password" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {decryptedData.notes && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Notes</Label>
                    <p className="text-xs text-muted-foreground bg-background rounded-md p-2">
                      {decryptedData.notes}
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm">
                    Password
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleGeneratePassword}
                    data-testid={`button-generate-password-${tool.id}`}
                    className="h-auto p-1 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Generate
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
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
                {formData.password && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      <span className={`text-xs font-medium ${passwordStrength.isStrong ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {passwordStrength.isStrong ? "Strong password" : "Weak password"}
                      </span>
                    </div>
                    {passwordStrength.errors.length > 0 && (
                      <ul className="space-y-0.5">
                        {passwordStrength.errors.map((error) => (
                          <li key={error} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1">
                            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {error}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
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
                      username: decryptedData?.username || "",
                      email: decryptedData?.email || "",
                      password: decryptedData?.password || "",
                      notes: decryptedData?.notes || "",
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




