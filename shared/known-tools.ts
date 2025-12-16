export interface KnownTool {
  name: string;
  website: string;
  category: string;
  aliases: string[];
}

export const KNOWN_CATEGORIES = [
  "Communication",
  "Productivity",
  "Project Management",
  "Design",
  "Development",
  "DevOps",
  "Marketing",
  "Analytics",
  "CRM/Sales",
  "Finance/Payments",
  "E-commerce",
  "Storage/Cloud",
] as const;

export const knownTools: KnownTool[] = [
  // Communication
  { name: "Slack", website: "slack.com", category: "Communication", aliases: ["slack app", "slack chat"] },
  { name: "Zoom", website: "zoom.us", category: "Communication", aliases: ["zoom meeting", "zoom video"] },
  { name: "Microsoft Teams", website: "microsoft.com/teams", category: "Communication", aliases: ["teams", "ms teams"] },
  { name: "Discord", website: "discord.com", category: "Communication", aliases: ["discord app", "discord chat"] },
  { name: "Google Meet", website: "meet.google.com", category: "Communication", aliases: ["meet", "gmeet", "google hangout"] },
  { name: "Loom", website: "loom.com", category: "Communication", aliases: ["loom video", "loom recording"] },
  { name: "Skype", website: "skype.com", category: "Communication", aliases: ["skype call"] },
  { name: "Telegram", website: "telegram.org", category: "Communication", aliases: ["tg", "telegram messenger"] },
  { name: "Signal", website: "signal.org", category: "Communication", aliases: ["signal app"] },
  { name: "WhatsApp Business", website: "whatsapp.com/business", category: "Communication", aliases: ["whatsapp", "wa business"] },

  // Productivity
  { name: "Notion", website: "notion.so", category: "Productivity", aliases: ["notion app", "notion notes"] },
  { name: "Evernote", website: "evernote.com", category: "Productivity", aliases: ["ever note"] },
  { name: "Obsidian", website: "obsidian.md", category: "Productivity", aliases: ["obsidian notes"] },
  { name: "Todoist", website: "todoist.com", category: "Productivity", aliases: ["todoist app"] },
  { name: "Google Workspace", website: "workspace.google.com", category: "Productivity", aliases: ["gsuite", "google apps", "gmail"] },
  { name: "Microsoft 365", website: "microsoft.com/microsoft-365", category: "Productivity", aliases: ["office 365", "ms office", "word", "excel"] },
  { name: "Calendly", website: "calendly.com", category: "Productivity", aliases: ["calendly scheduler"] },
  { name: "Clockify", website: "clockify.me", category: "Productivity", aliases: ["clockify time tracker"] },
  { name: "LastPass", website: "lastpass.com", category: "Productivity", aliases: ["last pass"] },
  { name: "1Password", website: "1password.com", category: "Productivity", aliases: ["onepassword", "1 password"] },

  // Project Management
  { name: "Jira", website: "atlassian.com/software/jira", category: "Project Management", aliases: ["jira software", "atlassian jira"] },
  { name: "Trello", website: "trello.com", category: "Project Management", aliases: ["trello board"] },
  { name: "Asana", website: "asana.com", category: "Project Management", aliases: ["asana tasks"] },
  { name: "Monday.com", website: "monday.com", category: "Project Management", aliases: ["monday", "monday com"] },
  { name: "Linear", website: "linear.app", category: "Project Management", aliases: ["linear app"] },
  { name: "Basecamp", website: "basecamp.com", category: "Project Management", aliases: ["base camp"] },
  { name: "ClickUp", website: "clickup.com", category: "Project Management", aliases: ["click up"] },
  { name: "Airtable", website: "airtable.com", category: "Project Management", aliases: ["air table"] },
  { name: "Wrike", website: "wrike.com", category: "Project Management", aliases: ["wrike pm"] },
  { name: "Smartsheet", website: "smartsheet.com", category: "Project Management", aliases: ["smart sheet"] },

  // Design
  { name: "Figma", website: "figma.com", category: "Design", aliases: ["figma design"] },
  { name: "Canva", website: "canva.com", category: "Design", aliases: ["canva design"] },
  { name: "Adobe Creative Cloud", website: "adobe.com", category: "Design", aliases: ["adobe cc", "photoshop", "illustrator", "indesign"] },
  { name: "Sketch", website: "sketch.com", category: "Design", aliases: ["sketch app"] },
  { name: "InVision", website: "invisionapp.com", category: "Design", aliases: ["invision app"] },
  { name: "Miro", website: "miro.com", category: "Design", aliases: ["realtimeboard"] },
  { name: "Framer", website: "framer.com", category: "Design", aliases: ["framer x"] },
  { name: "Penpot", website: "penpot.app", category: "Design", aliases: ["penpot design"] },

  // Development
  { name: "GitHub", website: "github.com", category: "Development", aliases: ["git hub"] },
  { name: "GitLab", website: "gitlab.com", category: "Development", aliases: ["git lab"] },
  { name: "Bitbucket", website: "bitbucket.org", category: "Development", aliases: ["atlassian bitbucket"] },
  { name: "VS Code", website: "code.visualstudio.com", category: "Development", aliases: ["vscode", "visual studio code"] },
  { name: "Postman", website: "postman.com", category: "Development", aliases: ["postman api"] },
  { name: "IntelliJ IDEA", website: "jetbrains.com/idea", category: "Development", aliases: ["intellij", "jetbrains"] },
  { name: "Sublime Text", website: "sublimetext.com", category: "Development", aliases: ["sublime"] },
  { name: "Xcode", website: "developer.apple.com/xcode", category: "Development", aliases: ["apple xcode"] },

  // DevOps
  { name: "Docker", website: "docker.com", category: "DevOps", aliases: ["docker hub"] },
  { name: "Kubernetes", website: "kubernetes.io", category: "DevOps", aliases: ["k8s", "kube"] },
  { name: "Jenkins", website: "jenkins.io", category: "DevOps", aliases: ["jenkins ci"] },
  { name: "CircleCI", website: "circleci.com", category: "DevOps", aliases: ["circle ci"] },
  { name: "Travis CI", website: "travis-ci.com", category: "DevOps", aliases: ["travis"] },
  { name: "Datadog", website: "datadoghq.com", category: "DevOps", aliases: ["data dog"] },
  { name: "Sentry", website: "sentry.io", category: "DevOps", aliases: ["sentry error tracking"] },
  { name: "PagerDuty", website: "pagerduty.com", category: "DevOps", aliases: ["pager duty"] },
  { name: "Terraform", website: "terraform.io", category: "DevOps", aliases: ["hashicorp terraform"] },
  { name: "Ansible", website: "ansible.com", category: "DevOps", aliases: ["red hat ansible"] },

  // Marketing
  { name: "Mailchimp", website: "mailchimp.com", category: "Marketing", aliases: ["mail chimp"] },
  { name: "HubSpot", website: "hubspot.com", category: "Marketing", aliases: ["hub spot"] },
  { name: "Buffer", website: "buffer.com", category: "Marketing", aliases: ["buffer app"] },
  { name: "Hootsuite", website: "hootsuite.com", category: "Marketing", aliases: ["hoot suite"] },
  { name: "Semrush", website: "semrush.com", category: "Marketing", aliases: ["sem rush"] },
  { name: "Ahrefs", website: "ahrefs.com", category: "Marketing", aliases: ["ahref"] },
  { name: "Moz", website: "moz.com", category: "Marketing", aliases: ["moz pro"] },
  { name: "Google Ads", website: "ads.google.com", category: "Marketing", aliases: ["adwords"] },

  // Analytics
  { name: "Google Analytics", website: "analytics.google.com", category: "Analytics", aliases: ["ga4", "universal analytics"] },
  { name: "Mixpanel", website: "mixpanel.com", category: "Analytics", aliases: ["mix panel"] },
  { name: "Amplitude", website: "amplitude.com", category: "Analytics", aliases: ["amplitude analytics"] },
  { name: "Hotjar", website: "hotjar.com", category: "Analytics", aliases: ["hot jar"] },
  { name: "Segment", website: "segment.com", category: "Analytics", aliases: ["twilio segment"] },
  { name: "Plausible", website: "plausible.io", category: "Analytics", aliases: ["plausible analytics"] },
  { name: "Fathom", website: "usefathom.com", category: "Analytics", aliases: ["fathom analytics"] },

  // CRM/Sales
  { name: "Salesforce", website: "salesforce.com", category: "CRM/Sales", aliases: ["sfdc"] },
  { name: "Pipedrive", website: "pipedrive.com", category: "CRM/Sales", aliases: ["pipe drive"] },
  { name: "Zoho CRM", website: "zoho.com/crm", category: "CRM/Sales", aliases: ["zoho"] },
  { name: "Intercom", website: "intercom.com", category: "CRM/Sales", aliases: ["intercom chat"] },
  { name: "Zendesk", website: "zendesk.com", category: "CRM/Sales", aliases: ["zen desk"] },
  { name: "Freshsales", website: "freshworks.com/crm", category: "CRM/Sales", aliases: ["freshworks crm"] },

  // Finance/Payments
  { name: "Stripe", website: "stripe.com", category: "Finance/Payments", aliases: ["stripe payments"] },
  { name: "PayPal", website: "paypal.com", category: "Finance/Payments", aliases: ["pay pal"] },
  { name: "QuickBooks", website: "quickbooks.intuit.com", category: "Finance/Payments", aliases: ["quick books", "qb"] },
  { name: "Xero", website: "xero.com", category: "Finance/Payments", aliases: ["xero accounting"] },
  { name: "Expensify", website: "expensify.com", category: "Finance/Payments", aliases: ["expense report"] },
  { name: "Wise", website: "wise.com", category: "Finance/Payments", aliases: ["transferwise"] },
  { name: "Bill.com", website: "bill.com", category: "Finance/Payments", aliases: ["bill com"] },
  { name: "Square", website: "squareup.com", category: "Finance/Payments", aliases: ["squareup"] },

  // E-commerce
  { name: "Shopify", website: "shopify.com", category: "E-commerce", aliases: ["shopify store"] },
  { name: "WooCommerce", website: "woocommerce.com", category: "E-commerce", aliases: ["woo commerce"] },
  { name: "BigCommerce", website: "bigcommerce.com", category: "E-commerce", aliases: ["big commerce"] },
  { name: "Magento", website: "magento.com", category: "E-commerce", aliases: ["adobe commerce"] },
  { name: "Squarespace", website: "squarespace.com", category: "E-commerce", aliases: ["square space"] },
  { name: "Wix", website: "wix.com", category: "E-commerce", aliases: ["wix website"] },

  // Storage/Cloud
  { name: "AWS", website: "aws.amazon.com", category: "Storage/Cloud", aliases: ["amazon web services", "ec2", "s3"] },
  { name: "Google Cloud", website: "cloud.google.com", category: "Storage/Cloud", aliases: ["gcp", "google cloud platform"] },
  { name: "Microsoft Azure", website: "azure.microsoft.com", category: "Storage/Cloud", aliases: ["azure"] },
  { name: "Dropbox", website: "dropbox.com", category: "Storage/Cloud", aliases: ["drop box"] },
  { name: "Google Drive", website: "drive.google.com", category: "Storage/Cloud", aliases: ["gdrive"] },
  { name: "Box", website: "box.com", category: "Storage/Cloud", aliases: ["box storage"] },
  { name: "Vercel", website: "vercel.com", category: "Storage/Cloud", aliases: ["zeit"] },
  { name: "Netlify", website: "netlify.com", category: "Storage/Cloud", aliases: ["net lify"] },
  { name: "Heroku", website: "heroku.com", category: "Storage/Cloud", aliases: ["salesforce heroku"] },
  { name: "DigitalOcean", website: "digitalocean.com", category: "Storage/Cloud", aliases: ["digital ocean", "droplet"] },
];
