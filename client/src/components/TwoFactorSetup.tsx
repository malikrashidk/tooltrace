import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldCheck, ShieldOff, Copy, Check, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TwoFactorStatus {
  enabled: boolean;
  hasBackupCodes: boolean;
  backupCodesRemaining: number;
}

interface SetupResponse {
  qrCode: string;
  manualCode: string;
}

interface VerifyResponse {
  success: boolean;
  backupCodes: string[];
  message: string;
}

export function TwoFactorSetup() {
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [backupCodesDialogOpen, setBackupCodesDialogOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery<TwoFactorStatus>({
    queryKey: ["/api/auth/2fa/status"],
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/2fa/setup");
      return res.json() as Promise<SetupResponse>;
    },
    onSuccess: (data) => {
      setSetupData(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/auth/2fa/verify", { code });
      return res.json() as Promise<VerifyResponse>;
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setBackupCodesDialogOpen(true);
      setSetupDialogOpen(false);
      setSetupData(null);
      setVerificationCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/2fa/status"] });
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication is now active on your account.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async ({ password, code }: { password: string; code: string }) => {
      const res = await apiRequest("POST", "/api/auth/2fa/disable", { password, code });
      return res.json();
    },
    onSuccess: () => {
      setDisableDialogOpen(false);
      setDisablePassword("");
      setDisableCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/2fa/status"] });
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been removed from your account.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Disable",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSetupClick = () => {
    setSetupDialogOpen(true);
    setupMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${status?.enabled ? "bg-green-100 dark:bg-green-900" : "bg-muted"}`}>
                {status?.enabled ? (
                  <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Shield className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </div>
            </div>
            <Badge variant={status?.enabled ? "default" : "secondary"}>
              {status?.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.enabled ? (
            <>
              <p className="text-sm text-muted-foreground">
                Your account is protected with two-factor authentication. You have{" "}
                <span className="font-medium">{status.backupCodesRemaining}</span> backup codes remaining.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDisableDialogOpen(true)}
                  data-testid="button-disable-2fa"
                >
                  <ShieldOff className="h-4 w-4 mr-2" />
                  Disable 2FA
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Protect your account by requiring a verification code from your authenticator app
                in addition to your password when signing in.
              </p>
              <Button onClick={handleSetupClick} data-testid="button-enable-2fa">
                <Shield className="h-4 w-4 mr-2" />
                Enable Two-Factor Authentication
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>
          
          {setupMutation.isPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : setupData ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={setupData.qrCode}
                  alt="2FA QR Code"
                  className="border rounded-lg"
                  data-testid="img-2fa-qrcode"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Or enter this code manually:
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                    {setupData.manualCode}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyCode(setupData.manualCode)}
                    data-testid="button-copy-manual-code"
                  >
                    {copiedCode === setupData.manualCode ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  data-testid="input-2fa-verification"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => verifyMutation.mutate(verificationCode)}
              disabled={verificationCode.length !== 6 || verifyMutation.isPending}
              data-testid="button-verify-2fa"
            >
              {verifyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Enter your password to confirm disabling 2FA. This will make your account less secure.
            </DialogDescription>
          </DialogHeader>
          
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Disabling 2FA removes an important security layer from your account.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">Password</Label>
              <Input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                data-testid="input-disable-2fa-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disable-code">2FA Code or Backup Code</Label>
              <Input
                id="disable-code"
                placeholder="Enter code from authenticator or backup"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/[^0-9A-Za-z-]/g, "").slice(0, 9))}
                maxLength={9}
                data-testid="input-disable-2fa-code"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disableMutation.mutate({ password: disablePassword, code: disableCode })}
              disabled={!disablePassword || !disableCode || disableMutation.isPending}
              data-testid="button-confirm-disable-2fa"
            >
              {disableMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={backupCodesDialogOpen} onOpenChange={setBackupCodesDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Your Backup Codes</DialogTitle>
            <DialogDescription>
              Store these codes in a safe place. You can use them to sign in if you lose access to your authenticator app.
            </DialogDescription>
          </DialogHeader>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Each code can only be used once. Keep them secure and accessible!
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted rounded font-mono text-sm"
              >
                <span>{code}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleCopyCode(code)}
                >
                  {copiedCode === code ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button onClick={() => setBackupCodesDialogOpen(false)} data-testid="button-close-backup-codes">
              I've Saved My Codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
