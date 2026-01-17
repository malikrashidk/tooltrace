import * as Sentry from "@sentry/node";

Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV || "development",

    // Only send errors in production
    enabled: process.env.NODE_ENV === "production",

    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of requests (adjust based on traffic)

    // Session Replay (for debugging user issues)
    integrations: [
        // Enable HTTP calls tracing
        Sentry.httpIntegration(),
        // Enable Prisma/DB integration if needed
        // Add profiling only if you need it
    ],

    // Capture user context
    sendDefaultPii: false, // Set to true if you want IPs (GDPR consideration)

    // Filter out sensitive data
    beforeSend(event: Sentry.ErrorEvent, hint: Sentry.EventHint) {
        // Remove sensitive data from error reports
        if (event.request?.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
        }
        return event;
    },

    // Ignore certain errors
    ignoreErrors: [
        // Common browser errors
        'Non-Error promise rejection captured',
        // Add patterns for errors you want to ignore
    ],
});

console.log(`[Sentry] Initialized (${process.env.NODE_ENV})`);
