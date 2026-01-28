import { storage } from "./storage";
import { sendEmail } from "./mailer";
import { log } from "./app";

/**
 * Background job to handle:
 * 1. Downgrading expired subscriptions that were cancelled.
 * 2. Sending tool expiration notifications.
 */
export async function startBackgroundJobs() {
    log("Starting background jobs...", "jobs");

    // Run every hour
    setInterval(async () => {
        try {
            await processSubscriptionDowngrades();
            await processToolExpirationNotifications();
        } catch (error) {
            console.error("[Jobs] Error in background jobs:", error);
        }
    }, 60 * 60 * 1000);

    // Run once on startup
    processSubscriptionDowngrades().catch(console.error);
    processToolExpirationNotifications().catch(console.error);
}

async function processSubscriptionDowngrades() {
    log("Checking for subscriptions to downgrade...", "jobs");
    try {
        const expired = await storage.getExpiredSubscriptions();
        for (const sub of expired) {
            log(`Downgrading user ${sub.userId} as their cancelled subscription ${sub.id} has reached renewal date`, "jobs");
            await storage.updateUser(sub.userId, { plan: "free" });
            await storage.updateSubscription(sub.id, { status: "expired" });
        }
    } catch (error) {
        console.error("[Jobs] Failed to process downgrades:", error);
    }
}

async function processToolExpirationNotifications() {
    log("Checking for tool expiration notifications...", "jobs");
    try {
        // Notify for tools expiring in 3 days and 1 day
        for (const days of [0, 3]) {
            const toolUsers = await storage.getToolsByExpiration(days);
            for (const { tool, user } of toolUsers) {
                log(`Sending expiration notification for tool ${tool.name} to user ${user.email} (${days} days left)`, "jobs");

                await sendEmail({
                    to: user.email,
                    subject: days === 0 ? `${tool.name} is expiring today` : `${tool.name} is expiring in ${days} days`,
                    html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #1a202c;">Tool Expiration Reminder</h2>
              <p>Hi ${user.name || 'there'},</p>
              <p>This is a reminder that your subscription for <strong>${tool.name}</strong> is set to renew or expire on <strong>${new Date(tool.nextRenewalDate!).toLocaleDateString()}</strong>.</p>
              <div style="background-color: #f7fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Tool:</strong> ${tool.name}</p>
                <p style="margin: 5px 0 0 0;"><strong>Renewal Date:</strong> ${new Date(tool.nextRenewalDate!).toLocaleDateString()}</p>
                ${tool.billingAmount ? `<p style="margin: 5px 0 0 0;"><strong>Estimated Amount:</strong> ${tool.billingAmount}</p>` : ''}
              </div>
              <p>Log in to your ToolTrace dashboard to see all your upcoming bills and renewals.</p>
              <a href="${process.env.APP_URL || 'http://localhost:5000'}/tools" style="display: inline-block; background-color: #4a5568; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Dashboard</a>
              <p style="margin-top: 30px; font-size: 12px; color: #a0aec0;">You received this because you are tracking this tool on ToolTrace.</p>
            </div>
          `
                });

                // Mark as notified
                if (days === 3) {
                    await storage.updateTool(tool.id, { notified_3_days: true });
                } else if (days === 0) {
                    await storage.updateTool(tool.id, { notifiedRenewalDay: true });
                }
            }
        }
    } catch (error) {
        console.error("[Jobs] Failed to process tool notifications:", error);
    }
}
