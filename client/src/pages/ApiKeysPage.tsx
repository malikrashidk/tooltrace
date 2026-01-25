import { useState } from "react";
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FeaturePaywall } from "@/components/FeaturePaywall";
import { Code2 } from "lucide-react";
import type { ApiKey } from "@shared/schema";

export function ApiKeysPage() {
  const { user } = useAuth();
  const [, _setLocation] = useLocation();
  const { toast } = useToast();
  const isPaidPlan = user?.plan === "enterprise";

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ key: string; secret: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const { data: apiKeysData, isLoading } = useQuery<{ apiKeys: ApiKey[] }>({
    queryKey: ['/api/api-keys'],
    enabled: isPaidPlan,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/api-keys", { name });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
      setNewlyCreatedKey({ key: data.apiKey.key, secret: data.apiKey.secret });
      setNewKeyName("");
      toast({ title: "Success", description: "API key created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create API key", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/api-keys/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
      toast({ title: "Success", description: "API key deleted successfully" });
      setDeleteDialogOpen(false);
      setKeyToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete API key", variant: "destructive" });
    },
  });

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ description: "Copied to clipboard" });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      toast({ title: "Error", description: "Please enter a name for the API key", variant: "destructive" });
      return;
    }
    createMutation.mutate(newKeyName.trim());
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewKeyName("");
    setNewlyCreatedKey(null);
    setShowSecret(false);
  };

  if (!isPaidPlan) {
    return (
      <FeaturePaywall
        title="API Keys & Integrations"
        description="Generate API keys to build custom integrations with Tooltrace. Access to the REST API and developer tools is restricted to Enterprise plans."
        requiredPlan="enterprise"
        icon={<Code2 className="h-8 w-8 text-primary animate-pulse" />}
      />
    );
  }

  const apiKeys = apiKeysData?.apiKeys || [];

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">API Keys</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Manage API keys for integrations with Zapier, Make, Pabbly, and more</p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          disabled={apiKeys.length >= 5}
          className="w-full sm:w-auto"
          data-testid="button-create-api-key"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800 dark:text-blue-200">Integration Guide</p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                Use API keys to connect with automation platforms like Pabbly, Make, or Zapier.
                Your API base URL is: <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">{window.location.origin}/api/v1</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="animate-pulse text-muted-foreground">Loading API keys...</div>
          </CardContent>
        </Card>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
            <Key className="h-12 w-12 mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
            <p className="text-muted-foreground text-center mb-6">
              Create your first API key to start integrating with external services
            </p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              data-testid="button-create-first-api-key"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id} data-testid={`card-api-key-${apiKey.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{apiKey.name}</CardTitle>
                      <CardDescription className="text-xs">
                        Created {new Date(apiKey.createdAt).toLocaleDateString()}
                        {apiKey.lastUsedAt && ` ·· Last used ${new Date(apiKey.lastUsedAt).toLocaleDateString()}`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={apiKey.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}>
                      {apiKey.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setKeyToDelete(apiKey);
                        setDeleteDialogOpen(true);
                      }}
                      data-testid={`button-delete-${apiKey.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 bg-muted rounded-md p-2">
                  <code className="flex-1 text-sm font-mono truncate">{apiKey.key}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleCopy(apiKey.key, apiKey.id)}
                    data-testid={`button-copy-${apiKey.id}`}
                  >
                    {copiedField === apiKey.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground text-center">
            {apiKeys.length}/5 API keys used
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Endpoints</CardTitle>
          <CardDescription>Available endpoints for integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium mb-2">Read Operations</p>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <code>GET /api/v1/tools</code>
              <span className="text-muted-foreground">List all tools</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <code>GET /api/v1/tools/:id</code>
              <span className="text-muted-foreground">Get single tool</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <code>GET /api/v1/renewals</code>
              <span className="text-muted-foreground">Upcoming renewals</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <code>GET /api/v1/analytics/spending</code>
              <span className="text-muted-foreground">Spending analytics</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <code>GET /api/v1/webhooks/renewal-triggers</code>
              <span className="text-muted-foreground">Automation triggers</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <code>GET /api/v1/test</code>
              <span className="text-muted-foreground">Test API key</span>
            </div>
          </div>
          <p className="text-sm font-medium mt-4 mb-2">Write Operations</p>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <code>POST /api/v1/tools</code>
              <span className="text-muted-foreground">Create a tool</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <code>PATCH /api/v1/tools/:id</code>
              <span className="text-muted-foreground">Update a tool</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <code>DELETE /api/v1/tools/:id</code>
              <span className="text-muted-foreground">Delete a tool</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={(open) => !newlyCreatedKey && setCreateDialogOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{newlyCreatedKey ? "API Key Created" : "Create API Key"}</DialogTitle>
            <DialogDescription>
              {newlyCreatedKey
                ? "Save these credentials now. The secret will not be shown again."
                : "Create a new API key for external integrations"
              }
            </DialogDescription>
          </DialogHeader>

          {newlyCreatedKey ? (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Copy these credentials now. The secret will not be displayed again.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>API Key</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={newlyCreatedKey.key} readOnly className="font-mono text-sm" data-testid="input-new-api-key" />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleCopy(newlyCreatedKey.key, "new-key")}
                      data-testid="button-copy-new-key"
                    >
                      {copiedField === "new-key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Secret</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={showSecret ? newlyCreatedKey.secret : "[hidden]"}
                      readOnly
                      className="font-mono text-sm"
                      data-testid="input-new-secret"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setShowSecret(!showSecret)}
                      data-testid="button-toggle-secret"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleCopy(newlyCreatedKey.secret, "new-secret")}
                      data-testid="button-copy-new-secret"
                    >
                      {copiedField === "new-secret" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Key Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Pabbly Integration"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  data-testid="input-key-name"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {newlyCreatedKey ? (
              <Button onClick={handleCloseCreateDialog} data-testid="button-done">
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleCloseCreateDialog} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  data-testid="button-create"
                >
                  {createMutation.isPending ? "Creating..." : "Create API Key"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{keyToDelete?.name}"? Any integrations using this key will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => keyToDelete && deleteMutation.mutate(keyToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}




