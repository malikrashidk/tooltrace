import { google } from "googleapis";
import { type OAuth2Client } from "google-auth-library";

interface DiscoveryResult {
    vendorName: string;
    vendorDomain: string;
    evidenceSender: string;
    evidenceSubject: string;
    confidence: number;
    lastSeenAt: Date;
}

const SAAS_DOMAINS: Record<string, string> = {
    "netflix.com": "Netflix",
    "spotify.com": "Spotify",
    "zoom.us": "Zoom",
    "slack.com": "Slack",
    "github.com": "GitHub",
    "canva.com": "Canva",
    "adobe.com": "Adobe Creative Cloud",
    "microsoft.com": "Microsoft 365",
    "google.com": "Google One",
    "dropbox.com": "Dropbox",
    "notion.so": "Notion",
    "linear.app": "Linear",
    "vercel.com": "Vercel",
    "stripe.com": "Stripe",
    "paypal.com": "PayPal",
    "apple.com": "Apple Services",
    "vultr.com": "Vultr",
    "digitalocean.com": "DigitalOcean",
    "aws.amazon.com": "AWS",
    "heroku.com": "Heroku",
    "mongodb.com": "MongoDB Atlas",
    "framer.com": "Framer",
    "figma.com": "Figma",
    "loom.com": "Loom",
    "calendly.com": "Calendly",
    "midjourney.com": "Midjourney",
    "openai.com": "OpenAI / ChatGPT",
    "anthropic.com": "Anthropic / Claude",
    "disneyplus.com": "Disney+",
    "amazon.com": "Amazon Prime",
};

const BILLING_KEYWORDS = ["receipt", "invoice", "subscription", "renewal", "payment", "plan", "trial", "billing", "order"];

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

            // Extract domain from "From: Name <email@domain.com>" or "email@domain.com"
            const emailMatch = fromHeader.match(/<(.+)>|(\S+@\S+)/);
            const email = (emailMatch ? (emailMatch[1] || emailMatch[2]) : "").toLowerCase();
            const domain = email.split("@")[1] || "";

            if (!domain) continue;

            // Scoring
            let confidence = 0;

            // Bonus for billing keywords in subject
            if (BILLING_KEYWORDS.some(kw => subject.toLowerCase().includes(kw))) {
                confidence += 40;
            }

            // Bonus for known SaaS domains or billing providers
            if (SAAS_DOMAINS[domain] || domain.includes("stripe.com") || domain.includes("paypal.com")) {
                confidence += 30;
            }

            // Bonus for currency patterns in snippet
            if (/[\$\£\€]\d+/.test(snippet)) {
                confidence += 20;
            }

            // Cap at 100
            confidence = Math.min(confidence, 100);

            if (confidence < 40) continue; // Filter out low confidence noise

            const vendorName = SAAS_DOMAINS[domain] || domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);

            const existing = results.get(domain);
            if (!existing || emailDate > existing.lastSeenAt) {
                results.set(domain, {
                    vendorName,
                    vendorDomain: domain,
                    evidenceSender: email,
                    evidenceSubject: subject.slice(0, 100),
                    confidence,
                    lastSeenAt: emailDate,
                });
            }
        } catch (error) {
            // silent fail for individual messages to keep scan robust
        }
    }

    return Array.from(results.values());
}
