import { google } from "googleapis";
import { type OAuth2Client } from "google-auth-library";

interface DiscoveryResult {
    vendorName: string;
    vendorDomain: string;
    evidenceSender: string;
    evidenceSubject: string;
    confidence: number;
    lastSeenAt: Date;
    billingAmount?: number;
    currency?: string;
    paymentPeriod?: "monthly" | "yearly";
    renewalDate?: Date;
}

const SAAS_DOMAINS: Record<string, string> = {
    // Streaming & Entertainment
    "netflix.com": "Netflix",
    "spotify.com": "Spotify",
    "hulu.com": "Hulu",
    "disneyplus.com": "Disney+",
    "hbomax.com": "HBO Max",
    "max.com": "Max",
    "primevideo.com": "Prime Video",
    "youtube.com": "YouTube Premium",
    "audible.com": "Audible",
    "peacocktv.com": "Peacock",
    "paramountplus.com": "Paramount+",
    "apple.com": "Apple Services",
    "patreon.com": "Patreon",
    "twitch.tv": "Twitch",
    "soundcloud.com": "SoundCloud",

    // Productivity & Work
    "zoom.us": "Zoom",
    "slack.com": "Slack",
    "notion.so": "Notion",
    "atlassian.com": "Atlassian (Jira/Confluence)",
    "trello.com": "Trello",
    "asana.com": "Asana",
    "monday.com": "Monday.com",
    "clickup.com": "ClickUp",
    "airtable.com": "Airtable",
    "miro.com": "Miro",
    "figma.com": "Figma",
    "loom.com": "Loom",
    "calendly.com": "Calendly",
    "docusign.com": "DocuSign",
    "dropbox.com": "Dropbox",
    "box.com": "Box",
    "evernote.com": "Evernote",
    "grammarly.com": "Grammarly",
    "microsoft.com": "Microsoft 365",
    "google.com": "Google Workspace",

    // Design & Creative
    "adobe.com": "Adobe Creative Cloud",
    "canva.com": "Canva",
    "framer.com": "Framer",
    "webflow.com": "Webflow",
    "midjourney.com": "Midjourney",
    "epidemicsound.com": "Epidemic Sound",
    "envato.com": "Envato",
    "shutterstock.com": "Shutterstock",
    "gettyimages.com": "Getty Images",

    // Dev & Infrastructure
    "github.com": "GitHub",
    "gitlab.com": "GitLab",
    "bitbucket.org": "Bitbucket",
    "vercel.com": "Vercel",
    "netlify.com": "Netlify",
    "heroku.com": "Heroku",
    "digitalocean.com": "DigitalOcean",
    "aws.amazon.com": "AWS",
    "azure.microsoft.com": "Azure",
    "cloud.google.com": "Google Cloud",
    "railway.app": "Railway",
    "render.com": "Render",
    "fly.io": "Fly.io",
    "cloudflare.com": "Cloudflare",
    "godaddy.com": "GoDaddy",
    "namecheap.com": "Namecheap",
    "bluehost.com": "Bluehost",
    "hostgator.com": "HostGator",
    "jetbrains.com": "JetBrains",
    "sentry.io": "Sentry",
    "datadoghq.com": "Datadog",
    "newrelic.com": "New Relic",
    "mongo.com": "MongoDB Atlas",
    "mongodb.com": "MongoDB Atlas",
    "supabase.com": "Supabase",
    "planetscale.com": "PlanetScale",

    // AI
    "openai.com": "OpenAI / ChatGPT",
    "anthropic.com": "Anthropic / Claude",
    "jasper.ai": "Jasper",
    "copy.ai": "Copy.ai",
    "runwayml.com": "Runway",
    "elevenlabs.io": "ElevenLabs",

    // Marketing & Sales
    "hubspot.com": "HubSpot",
    "salesforce.com": "Salesforce",
    "mailchimp.com": "Mailchimp",
    "convertkit.com": "ConvertKit",
    "klaviyo.com": "Klaviyo",
    "buffer.com": "Buffer",
    "hootsuite.com": "Hootsuite",
    "sproutsocial.com": "Sprout Social",
    "semrush.com": "Semrush",
    "ahrefs.com": "Ahrefs",
    "moz.com": "Moz",
    "intercom.com": "Intercom",
    "zendesk.com": "Zendesk",

    // Finance & Legal
    "quickbooks.intuit.com": "QuickBooks",
    "xero.com": "Xero",
    "freshbooks.com": "FreshBooks",
    "expensify.com": "Expensify",
    "gusto.com": "Gusto",
    "deel.com": "Deel",
    "bill.com": "Bill.com",
    "legalzoom.com": "LegalZoom",

    // Utilities & Other
    "1password.com": "1Password",
    "lastpass.com": "LastPass",
    "nordvpn.com": "NordVPN",
    "expressvpn.com": "ExpressVPN",
    "coursera.org": "Coursera",
    "udemy.com": "Udemy",
    "masterclass.com": "MasterClass",
    "skillshare.com": "Skillshare",
    "duolingo.com": "Duolingo",
    "strava.com": "Strava",
    "peloton.com": "Peloton",
    "zwift.com": "Zwift",
    "headspace.com": "Headspace",
    "calm.com": "Calm",
};

const BILLING_KEYWORDS = ["receipt", "invoice", "subscription", "renewal", "payment", "plan", "trial", "billing", "order"];
const NEGATIVE_KEYWORDS = ["shipped", "delivery", "tracking", "order confirmed", "gift card", "refund", "donation"];

export async function scanInbox(auth: OAuth2Client, days = 365): Promise<DiscoveryResult[]> {
    const gmail = google.gmail({ version: "v1", auth });

    // Gmail search query
    const query = `newer_than:${days}d (subject:(${BILLING_KEYWORDS.join(" OR ")}) OR from:(stripe.com OR paypal.com OR apple.com OR google.com))`;

    const response = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 100 // MVP limit
    });

    const messages = response.data.messages || [];
    const results: Map<string, DiscoveryResult> = new Map();

    for (const msg of messages) {
        if (!msg.id) continue;

        try {
            const details = await gmail.users.messages.get({
                userId: "me",
                id: msg.id,
                format: "metadata",
                metadataHeaders: ["From", "Subject", "Date"]
            });

            const headers = details.data.payload?.headers || [];
            const fromHeader = headers.find(h => h.name === "From")?.value || "";
            const subject = headers.find(h => h.name === "Subject")?.value || "";
            const dateHeader = headers.find(h => h.name === "Date")?.value || "";
            const snippet = details.data.snippet || "";
            const emailDate = dateHeader ? new Date(dateHeader) : new Date();

            const analysis = analyzeEmail(fromHeader, subject, snippet, emailDate);

            if (!analysis) continue;

            const { domain, ...resultData } = analysis;

            const existing = results.get(domain);
            // Update if new or if current one has better data (e.g. amount found)
            const isBetterData = !existing || (!existing.billingAmount && resultData.billingAmount);
            const isNewer = existing && emailDate > existing.lastSeenAt;

            if (!existing || isBetterData || isNewer) {
                // If we are updating an existing one, try to keep the "best" amount found
                const bestAmount = resultData.billingAmount || existing?.billingAmount;
                const bestCurrency = resultData.currency || existing?.currency;
                const bestPeriod = resultData.paymentPeriod || existing?.paymentPeriod;
                const bestRenewal = resultData.renewalDate || existing?.renewalDate;

                results.set(domain, {
                    ...resultData,
                    vendorDomain: domain,
                    // Keep the extracted data merged with potentially existing data
                    billingAmount: bestAmount,
                    currency: bestCurrency,
                    paymentPeriod: bestPeriod,
                    renewalDate: bestRenewal
                });
            }
        } catch (error) {
            // silent fail for individual messages to keep scan robust
            console.error("Error processing message:", error);
        }
    }

    return Array.from(results.values());
}

export function analyzeEmail(fromHeader: string, subject: string, snippet: string, emailDate: Date): (DiscoveryResult & { domain: string }) | null {
    const emailMatch = fromHeader.match(/<(.+)>|(\S+@\S+)/);
    const email = (emailMatch ? (emailMatch[1] || emailMatch[2]) : "").toLowerCase();
    const originalDomain = email.split("@")[1] || "";

    if (!originalDomain) return null;

    // Domain Rollup Logic: "billing.netflix.com" -> "netflix.com"
    let domain = originalDomain;
    let vendorName = "";

    // Configurable: Try to strip subdomains up to 2 levels deep
    // e.g. a.b.c.com -> a.b.c.com, b.c.com, c.com
    let parts = originalDomain.split('.');
    while (parts.length >= 2) {
        const candidate = parts.join('.');
        if (SAAS_DOMAINS[candidate]) {
            domain = candidate;
            vendorName = SAAS_DOMAINS[candidate];
            break;
        }
        parts.shift();
    }

    // Fallback if not found
    if (!vendorName) {
        // Reset to original domain for generic handling
        domain = originalDomain;
        vendorName = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
    }

    // Scoring
    let confidence = 0;
    const fullText = (subject + " " + snippet).toLowerCase();

    // Negative Keyword Filtering (Avoid Amazon socks)
    if (NEGATIVE_KEYWORDS.some(kw => fullText.includes(kw))) {
        return null; // Skip entirely
    }

    // 1. Domain Confidence
    // Boost for known SaaS domains or billing providers
    if (SAAS_DOMAINS[domain]) {
        confidence = 80; // High confidence for known tools
    } else if (domain.includes("stripe.com") || domain.includes("paypal.com")) {
        confidence = 60;
    }

    // 2. Keyword Bonuses
    // Bonus for billing keywords in subject
    if (BILLING_KEYWORDS.some(kw => subject.toLowerCase().includes(kw))) {
        confidence += 20;
    }

    // Bonus for currency patterns in snippet
    const currencyMatch = /[\$\£\€]\d+/.test(snippet);
    if (currencyMatch) {
        confidence += 20;
    }

    // Cap at 100
    confidence = Math.min(confidence, 100);

    if (confidence < 40) return null; // Filter out low confidence noise

    // Extraction: Amount
    let billingAmount: number | undefined;
    let currency = "USD";
    // Check snippet for Price (e.g. $19.99, USD 19.99)
    // Regex for "$19.99", "£10.00", "USD 19.99"
    const amountMatch = snippet.match(/(\$|£|€|USD|EUR)\s?(\d{1,4}\.\d{2})/i);
    if (amountMatch) {
        billingAmount = parseFloat(amountMatch[2]);
        // naive currency map
        if (amountMatch[1] === '£') currency = "GBP";
        else if (amountMatch[1] === '€' || amountMatch[1].toUpperCase() === 'EUR') currency = "EUR";
        else currency = "USD";
    }

    // Extraction: Period & Renewal Date
    let paymentPeriod: "monthly" | "yearly" | undefined;
    let renewalDate: Date | undefined;

    if (fullText.includes("year") || fullText.includes("annual")) {
        paymentPeriod = "yearly";
        // Predict renewal in 1 year
        renewalDate = new Date(emailDate);
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else if (fullText.includes("month")) {
        paymentPeriod = "monthly";
        // Predict renewal in 1 month
        renewalDate = new Date(emailDate);
        renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    return {
        vendorName,
        vendorDomain: domain,
        domain, // Return domain for map key
        evidenceSender: email,
        evidenceSubject: subject.slice(0, 100),
        confidence,
        lastSeenAt: emailDate,
        billingAmount,
        currency,
        paymentPeriod,
        renewalDate
    };
}
