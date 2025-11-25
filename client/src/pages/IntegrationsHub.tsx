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
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold">Integrations Hub</h1>
          <p className="text-muted-foreground">Connect SaaS Hub to your favorite tools</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-5xl">🔗</div>
              <h2 className="text-2xl font-semibold">Premium Feature</h2>
              <p className="text-muted-foreground">
                Integrations Hub with Slack, Zapier, Make, and webhooks is exclusively available on Premium plan.
              </p>
              <Button asChild className="mt-4">
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
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-semibold">Integrations Hub</h1>
        <p className="text-muted-foreground">Connect SaaS Hub to your favorite tools and automate your workflow</p>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Live Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <p className="text-sm font-medium mb-2">Features</p>
                      <ul className="space-y-1">
                        {integration.features.map((feature) => (
                          <li key={feature} className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="h-1 w-1 rounded-full bg-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Webhook URL</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={integration.webhook}
                          className="flex-1 text-xs px-2 py-1 rounded border bg-muted font-mono"
                          data-testid={`input-webhook-${integration.id}`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(integration.webhook, integration.id)}
                          data-testid={`button-copy-webhook-${integration.id}`}
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
          <h2 className="text-2xl font-semibold mb-4">Browser Extensions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {extensions.map((ext) => (
              <Card key={ext.name}>
                <CardHeader>
                  <CardTitle className="text-lg">{ext.name}</CardTitle>
                  <CardDescription>{ext.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">Coming Soon</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
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
