import { useState } from "react";
import { Copy, Eye, EyeOff, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

// todo: remove mock functionality - replace with real API
const mockApiKeys = [
  {
    id: "key-1",
    name: "Production API Key",
    key: "sk_live_51234567890abcdefghijklmnop",
    prefix: "sk_live",
    created: "2024-10-15",
    lastUsed: "2024-11-24",
    permissions: ["read:tools", "write:tools", "read:analytics"],
  },
  {
    id: "key-2",
    name: "Development API Key",
    key: "sk_test_87654321abcdefghijklmnop",
    prefix: "sk_test",
    created: "2024-11-01",
    lastUsed: "2024-11-25",
    permissions: ["read:tools", "write:tools"],
  },
];

export function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState(mockApiKeys);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: `${label} copied to clipboard`,
    });
  };

  const deleteKey = (id: string) => {
    // todo: remove mock functionality - replace with real API call
    setApiKeys(apiKeys.filter((key) => key.id !== id));
    toast({
      description: "API key deleted",
    });
  };

  const createNewKey = () => {
    if (!newKeyName.trim()) return;
    
    // todo: remove mock functionality - replace with real API call
    const newKey = {
      id: `key-${Date.now()}`,
      name: newKeyName,
      key: `sk_test_${Math.random().toString(36).substring(2, 32)}`,
      prefix: "sk_test",
      created: new Date().toISOString().split("T")[0],
      lastUsed: "Never",
      permissions: ["read:tools", "write:tools"],
    };

    setApiKeys([...apiKeys, newKey]);
    setNewKeyName("");
    setShowNewKeyDialog(false);
    toast({
      description: "API key created successfully",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">API Keys</h1>
        <p className="text-muted-foreground">Manage API keys to integrate with external applications</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your API Keys</CardTitle>
            <CardDescription>Use these keys to authenticate API requests</CardDescription>
          </div>
          <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create New Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>Generate a new API key for your application</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Key Name</label>
                  <Input
                    placeholder="e.g., Production API Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    data-testid="input-api-key-name"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewKeyDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createNewKey} data-testid="button-create-api-key">
                    Create Key
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-muted-foreground">No API keys yet</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  apiKeys.map((apiKey) => (
                    <TableRow key={apiKey.id}>
                      <TableCell className="font-medium">{apiKey.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-mono text-sm">
                          {visibleKeys[apiKey.id] ? (
                            <>
                              {apiKey.key}
                              <button
                                onClick={() => toggleKeyVisibility(apiKey.id)}
                                className="text-muted-foreground hover:text-foreground"
                                data-testid="button-hide-key"
                              >
                                <EyeOff className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              {apiKey.prefix}***
                              <button
                                onClick={() => toggleKeyVisibility(apiKey.id)}
                                className="text-muted-foreground hover:text-foreground"
                                data-testid="button-show-key"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => copyToClipboard(apiKey.key, "API Key")}
                            className="text-muted-foreground hover:text-foreground"
                            data-testid="button-copy-key"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{apiKey.created}</TableCell>
                      <TableCell className="text-sm">{apiKey.lastUsed}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteKey(apiKey.id)}
                          data-testid="button-delete-api-key"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Base URL</h3>
            <code className="bg-muted px-3 py-1 rounded text-sm font-mono">
              https://api.saazhub.com/v1
            </code>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Authentication</h3>
            <code className="bg-muted px-3 py-1 rounded text-sm font-mono block">
              Authorization: Bearer {"{"}your_api_key{"}"}
            </code>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Common Endpoints</h3>
            <ul className="space-y-2 text-sm">
              <li className="font-mono">GET /tools - List all tools</li>
              <li className="font-mono">POST /tools - Create new tool</li>
              <li className="font-mono">GET /tools/{"{"}id{"}"} - Get tool details</li>
              <li className="font-mono">PATCH /tools/{"{"}id{"}"} - Update tool</li>
              <li className="font-mono">DELETE /tools/{"{"}id{"}"} - Delete tool</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
