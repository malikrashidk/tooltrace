import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, Book, Lightbulb, Video, Mail, Rocket, Settings, BarChart3, Lock, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const helpSections = [
  {
    title: "Getting Started",
    icon: Rocket,
    topics: [
      {
        title: "Dashboard Overview",
        description: "Understand your SaaS Hub dashboard at a glance",
        details: [
          "The dashboard shows your total spending, tool count, and upcoming renewals",
          "View quick insights about your subscriptions and usage patterns",
          "Access all features from the sidebar navigation",
        ],
      },
      {
        title: "Adding Your First Tool",
        description: "Quick guide to add your first SaaS tool",
        details: [
          "Click 'Tools' in the sidebar",
          "Click the 'Add Tool' button",
          "Enter tool details: name, cost, renewal date, and usage frequency",
          "Click 'Save' to add it to your hub",
          "Or use the browser extension for one-click detection!",
        ],
      },
      {
        title: "Browser Extension",
        description: "Auto-detect and add tools instantly",
        details: [
          "Install the SaaS Hub browser extension from Chrome Web Store",
          "Visit your SaaS tools (Figma, GitHub, Slack, etc.)",
          "Click the extension icon to see detected tools",
          "Select tools and click 'Add Selected' to import them",
          "Check Integrations Hub for detailed setup instructions",
        ],
      },
    ],
  },
  {
    title: "Managing Tools",
    icon: Settings,
    topics: [
      {
        title: "Save Login Credentials",
        description: "Securely store tool credentials",
        details: [
          "Click the 'Lock' icon on any tool card",
          "Enter username, email, and password securely encrypted",
          "Add notes about 2FA, security questions, etc.",
          "Click copy icon to securely access credentials anytime",
          "Credentials are encrypted client-side and never stored on servers",
        ],
      },
      {
        title: "Edit Tool Details",
        description: "Update tool information anytime",
        details: [
          "Click the pencil icon on a tool card",
          "Update name, cost, billing cycle, usage frequency",
          "Add or remove categories for better organization",
          "Changes are saved instantly",
        ],
      },
      {
        title: "Bulk Operations",
        description: "Manage multiple tools at once",
        details: [
          "Go to 'Advanced Tools' page",
          "Select multiple tools using checkboxes",
          "Perform bulk actions: edit, delete, export, or categorize",
          "Save time managing your tool portfolio",
        ],
      },
    ],
  },
  {
    title: "Financial Analytics",
    icon: BarChart3,
    topics: [
      {
        title: "Analytics Dashboard",
        description: "View spending insights and trends",
        details: [
          "See total annual and monthly spending breakdowns",
          "View cost per category to identify expensive areas",
          "Monitor billing cycle distribution",
          "Track spending trends over time with charts",
        ],
      },
      {
        title: "Renewal Tracking",
        description: "Never miss a subscription renewal",
        details: [
          "View all upcoming renewals organized by date",
          "Get renewal reminders before payment date",
          "Export renewal calendar to CSV",
          "Track which tools are up for renewal this month",
        ],
      },
      {
        title: "Low Usage Tools",
        description: "Find tools you're not using enough",
        details: [
          "View tools marked as 'rarely used'",
          "Identify subscription waste",
          "Consider canceling underutilized tools",
          "Optimize your SaaS spending",
        ],
      },
    ],
  },
  {
    title: "Security & Privacy",
    icon: Lock,
    topics: [
      {
        title: "Data Encryption",
        description: "How we protect your credentials",
        details: [
          "Credentials are encrypted using Web Crypto API (AES-GCM)",
          "Encryption happens entirely on your browser",
          "No unencrypted data leaves your device",
          "Each credential has unique encryption",
        ],
      },
      {
        title: "Password Security",
        description: "Best practices for password management",
        details: [
          "Use the 'Generate Password' button to create strong passwords",
          "Passwords must contain: 8+ characters, uppercase, lowercase, numbers, special chars",
          "Copy-to-clipboard automatically clears after 2 minutes",
          "Never share your passwords with anyone",
        ],
      },
      {
        title: "Privacy Policy",
        description: "Your data is your own",
        details: [
          "We never collect or sell your personal data",
          "Your credentials are stored only in your browser (client-side)",
          "SaaS Hub is self-hostable for maximum privacy",
          "Open-source code available for security audits",
        ],
      },
    ],
  },
  {
    title: "Team & Collaboration",
    icon: Users,
    topics: [
      {
        title: "Invite Team Members",
        description: "Share access with your team",
        details: [
          "Go to 'Team' in the sidebar",
          "Click 'Invite Member' and enter their email",
          "Set their permission level: Viewer, Editor, or Admin",
          "They'll receive an invitation to join your workspace",
        ],
      },
      {
        title: "Team Permissions",
        description: "Manage what team members can do",
        details: [
          "Viewer: Can see all tools and analytics",
          "Editor: Can add, edit, and delete tools",
          "Admin: Full access including team management and settings",
        ],
      },
    ],
  },
  {
    title: "Advanced Features",
    icon: Sparkles,
    topics: [
      {
        title: "CSV Import/Export",
        description: "Bulk manage your tools with CSV",
        details: [
          "Export: Download all tools as CSV for backup or analysis",
          "Import: Upload CSV to add multiple tools at once",
          "Go to 'Advanced Tools' â†’ 'Export Tools'",
          "CSV format: Name, Cost, Billing Cycle, Category, Usage Frequency",
        ],
      },
      {
        title: "API Access",
        description: "Automate SaaS Hub with API",
        details: [
          "Generate API keys in 'Settings'",
          "Use REST API to programmatically manage tools",
          "Integrate with your custom applications",
          "See API documentation in 'Integrations Hub'",
        ],
      },
      {
        title: "Integrations Hub",
        description: "Connect with other tools",
        details: [
          "Slack notifications for renewal reminders",
          "Zapier automation for tool management",
          "Webhooks for custom integrations",
          "Browser extension for one-click tool detection",
        ],
      },
    ],
  },
];

interface ExpandedTopics {
  [key: string]: boolean;
}

export function HelpPage() {
  const [expandedTopics, setExpandedTopics] = useState<ExpandedTopics>({});
  const [openFeedback, setOpenFeedback] = useState(false);
  const { toast } = useToast();

  const toggleTopic = (topicKey: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [topicKey]: !prev[topicKey],
    }));
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Help & Documentation</h1>
          <p className="text-lg text-muted-foreground">
            Learn how to make the most of SaaS Hub with our comprehensive guides
          </p>
        </div>

        {/* Feedback Button */}
        <div className="mb-8 flex flex-wrap gap-3">
          <Button
            onClick={() => setOpenFeedback(!openFeedback)}
            variant="outline"
            className="gap-2"
            data-testid="button-open-feedback"
          >
            <Mail className="h-4 w-4" />
            Send Feedback
          </Button>
          <Button variant="ghost" disabled className="gap-2">
            <Video className="h-4 w-4" />
            Video Tutorials (Coming Soon)
          </Button>
        </div>

        {/* Feedback Form */}
        {openFeedback && (
          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Share Your Feedback
              </CardTitle>
              <CardDescription>
                Help us improve SaaS Hub with your suggestions and feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeedbackForm onClose={() => setOpenFeedback(false)} />
            </CardContent>
          </Card>
        )}

        {/* Help Sections */}
        <Tabs defaultValue="0" className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 w-full">
            {helpSections.map((section, idx) => {
              const IconComponent = section.icon;
              return (
                <TabsTrigger key={idx} value={idx.toString()} className="text-xs sm:text-sm gap-1">
                  <IconComponent className="h-4 w-4" />
                  <span className="hidden md:inline">{section.title}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {helpSections.map((section, sectionIdx) => (
            <TabsContent key={sectionIdx} value={sectionIdx.toString()}>
              <div className="space-y-4">
                <div className="mb-6">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">{section.title}</h2>
                  <p className="text-muted-foreground">
                    Learn everything about {section.title.toLowerCase()}
                  </p>
                </div>

                <div className="space-y-3">
                  {section.topics.map((topic, topicIdx) => {
                    const topicKey = `${sectionIdx}-${topicIdx}`;
                    const isExpanded = expandedTopics[topicKey];

                    return (
                      <Card
                        key={topicKey}
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => toggleTopic(topicKey)}
                        data-testid={`card-help-topic-${topicKey}`}
                      >
                        <div className="p-4 sm:p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold mb-1">{topic.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {topic.description}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-primary" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-border space-y-2">
                              <ul className="space-y-2">
                                {topic.details.map((detail, detailIdx) => (
                                  <li
                                    key={detailIdx}
                                    className="flex gap-3 text-sm text-muted-foreground"
                                  >
                                    <span className="text-primary font-bold min-w-fit">â€¢</span>
                                    <span>{detail}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Quick Links */}
        <Card className="mt-8 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href="https://github.com/yourusername/saazhub"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                data-testid="link-github"
              >
                <div className="font-medium">GitHub Repository</div>
                <div className="text-sm text-muted-foreground">View source code and contribute</div>
              </a>
              <a
                href="https://github.com/yourusername/saazhub-extension"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                data-testid="link-extension"
              >
                <div className="font-medium">Browser Extension</div>
                <div className="text-sm text-muted-foreground">Download and setup guide</div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface FeedbackFormProps {
  onClose: () => void;
}

function FeedbackForm({ onClose }: FeedbackFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    type: "suggestion",
    subject: "",
    message: "",
    email: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject || !formData.message) {
      toast({
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // In production, send to backend API
    console.log("Feedback submitted:", formData);

    // Store in localStorage as temporary solution
    const feedbackList = JSON.parse(localStorage.getItem("feedback") || "[]");
    feedbackList.push({
      ...formData,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem("feedback", JSON.stringify(feedbackList));

    toast({
      description: "âœ“ Thank you! Your feedback has been submitted.",
    });

    setFormData({ type: "suggestion", subject: "", message: "", email: "" });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Feedback Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full px-3 py-2 rounded-md border border-border bg-background"
          data-testid="select-feedback-type"
        >
          <option value="suggestion">Suggestion / Feature Request</option>
          <option value="bug">Bug Report</option>
          <option value="improvement">Improvement</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email (optional, for follow-up)
        </label>
        <input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 rounded-md border border-border bg-background"
          data-testid="input-feedback-email"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="subject" className="text-sm font-medium">
          Subject
        </label>
        <input
          id="subject"
          type="text"
          placeholder="Brief title of your feedback"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          className="w-full px-3 py-2 rounded-md border border-border bg-background"
          data-testid="input-feedback-subject"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="message" className="text-sm font-medium">
          Message
        </label>
        <textarea
          id="message"
          placeholder="Tell us what you think..."
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="w-full px-3 py-2 rounded-md border border-border bg-background min-h-32 resize-none"
          data-testid="textarea-feedback-message"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button type="submit" data-testid="button-submit-feedback">
          Submit Feedback
        </Button>
      </div>
    </form>
  );
}



