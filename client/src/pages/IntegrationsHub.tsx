import { useState } from "react";
import { Copy, Check, ExternalLink, Zap, MessageSquare, Code2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

// todo: remove mock functionality - replace with real integration setup

export function IntegrationsHub() {
  const { user } = useAuth();
  const isPremium = user?.plan === "premium";
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isPremium) {
    return (
      <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 sm:p-6 md:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Integrations Hub</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1">Connect SaaS Hub to your favorite tools</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 px-4">
            <div className="text-center space-y-4 sm:space-y-5 max-w-md">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Zap className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Premium Feature</h2>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                  Integrations Hub with Slack, Zapier, Make, and webhooks is exclusively available on Premium plan.
                </p>
              </div>
              <Button asChild size="lg" className="mt-4 w-full sm:w-auto">
                <a href="/pricing">Upgrade to Premium</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ description: "Copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const integrations = [
    {
      id: "slack",
      name: "Slack",
      icon: MessageSquare,
      description: "Get daily spend summaries, renewal reminders, and add tools directly from Slack",
      features: [
        "Daily subscription spend summary",
        "Renewal date reminders",
        "Add tools from Slack",
        "Budget alerts",
        "Team notifications",
      ],
      status: "active",
      webhook: "https://api.saazhub.com/webhooks/slack",
    },
    {
      id: "zapier",
      name: "Zapier",
      icon: Zap,
      description: "Automate tool management across 5,000+ apps",
      features: [
        "Auto-add tools from purchases",
        "Sync to spreadsheets",
        "Send renewals to CRM",
        "Trigger workflows",
        "Connect with any app",
      ],
      status: "active",
      webhook: "https://api.saazhub.com/webhooks/zapier",
    },
    {
      id: "make",
      name: "Make (Integromat)",
      icon: Code2,
      description: "Create custom automation workflows with visual builder",
      features: [
        "Visual workflow builder",
        "Conditional logic",
        "Data transformation",
        "Error handling",
        "API access",
      ],
      status: "active",
      webhook: "https://api.saazhub.com/webhooks/make",
    },
    {
      id: "webhook",
      name: "Webhooks",
      icon: Globe,
      description: "Send real-time data to your own endpoints",
      features: [
        "Tool added events",
        "Renewal reminders",
        "Budget alerts",
        "Usage updates",
        "Custom payloads",
      ],
      status: "active",
      webhook: "https://api.saazhub.com/webhooks/custom",
    },
  ];

  const extensions = [
    {
      name: "Chrome Extension",
      description: "Auto-detect and save SaaS tools you're using",
      status: "coming-soon",
    },
    {
      name: "Firefox Extension",
      description: "One-click tool detection while browsing",
      status: "coming-soon",
    },
  ];

  return (
    <div className="space-y-6 md:space-y-8 p-3 sm:p-4 md:p-6">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 sm:p-6 md:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Integrations Hub</h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1">Connect SaaS Hub to your favorite tools and automate your workflow</p>
      </div>

      <div className="space-y-4 md:space-y-6">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-4">Live Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                          <CardDescription>{integration.description}</CardDescription>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs sm:text-sm font-medium mb-2">Features</p>
                      <ul className="space-y-1">
                        {integration.features.map((feature) => (
                          <li key={feature} className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-primary flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Webhook URL</p>
                      <div className="flex gap-2 flex-col sm:flex-row">
                        <input
                          type="text"
                          readOnly
                          value={integration.webhook}
                          className="flex-1 text-xs px-2 py-1 rounded border bg-muted font-mono break-all"
                          data-testid={`input-webhook-${integration.id}`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(integration.webhook, integration.id)}
                          data-testid={`button-copy-webhook-${integration.id}`}
                          className="flex-shrink-0"
                        >
                          {copiedId === integration.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Set Up Integration
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-4">Browser Extensions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>Chrome & Chromium</span>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Available</Badge>
                </CardTitle>
                <CardDescription>Auto-detect and add SaaS tools while browsing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Our browser extension automatically detects SaaS tools you're using and allows you to add them to your SaaS Hub with one click.
                </p>
                <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                  <li>Download the extension zip file</li>
                  <li>Extract the zip file to a folder</li>
                  <li>Go to <code className="bg-muted px-2 py-1 rounded text-xs">chrome://extensions</code></li>
                  <li>Enable "Developer mode" (top right)</li>
                  <li>Click "Load unpacked" and select the extracted folder</li>
                  <li>Start using the extension!</li>
                </ol>
                <Button className="w-full" asChild>
                  <a href="/api/extension/download" download="tooltrace-extension.zip" data-testid="button-download-extension">
                    Download Extension
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>Firefox</span>
                  <Badge variant="secondary">Coming Soon</Badge>
                </CardTitle>
                <CardDescription>Mozilla Firefox support</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Firefox extension coming soon. The extension will work similarly to the Chrome version with full feature parity.
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-md p-3">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    Subscribe to updates to be notified when Firefox version is available.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="text-base">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <p className="font-medium">Install Extension</p>
                  <p className="text-muted-foreground text-xs">Load the extension into your browser</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <p className="font-medium">Browse as Normal</p>
                  <p className="text-muted-foreground text-xs">The extension automatically detects SaaS tools</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <p className="font-medium">Click to Add</p>
                  <p className="text-muted-foreground text-xs">Select tools and add them to your SaaS Hub instantly</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Documentation</CardTitle>
            <CardDescription>Full documentation for custom integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Documentation
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
