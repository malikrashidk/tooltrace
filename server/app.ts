import { type Server } from "node:http";

import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
} from "express";

import helmet from "helmet";
import { registerRoutes } from "./routes";
import { initializeAdmin } from "./init-admin";
import { startBackgroundJobs } from "./jobs";

export function log(message: string, source = "express") {
  // Only log if not a health check to keep logs clean
  if (message.includes("/api/health")) return;

  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();

// Enable trust proxy for Apache/Nginx reverse proxy compatibility
// This allows req.secure and req.protocol to work correctly
app.set("trust proxy", 1);

// Enforce HTTPS in production
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    // Check if the request is secure (handles trust proxy headers)
    if (!req.secure && req.get("x-forwarded-proto") !== "https") {
      log(`Redirecting to HTTPS: ${req.headers.host}${req.url}`);
      return res.redirect(`https://${req.get("host")}${req.url}`);
    }
    next();
  });
}

// Use Helmet for security headers including Content Security Policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "base-uri": ["'self'"],
        "font-src": ["'self'", "https:", "data:"],
        "frame-ancestors": ["'self'"],
        "img-src": ["'self'", "data:", "https:"],
        "object-src": ["'none'"],
        "script-src": [
          "'self'",
          "'unsafe-eval'",
          "'unsafe-inline'",
          "https://accounts.google.com",
          "https://apis.google.com",
          "https://polar.sh",
          "https://sandbox.polar.sh",
        ],
        "script-src-attr": ["'none'"],
        "style-src": ["'self'", "https:", "'unsafe-inline'"],
        "connect-src": [
          "'self'",
          "https://app.tooltrace.io",
          "https://accounts.google.com",
          "https://www.googleapis.com",
          "https://api.polar.sh",
          "https://sandbox-api.polar.sh",
        ],
        "frame-src": [
          "'self'",
          "https://accounts.google.com",
          "https://polar.sh",
          "https://sandbox.polar.sh",
        ],
        "upgrade-insecure-requests": [],
      },
    },
    // Prevent information leakage
    hidePoweredBy: true,
    // Ensure browsers only connect over HTTPS
    hsts: process.env.NODE_ENV === "production",
  })
);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
// Configure body parser with increased limits for file uploads
const jsonLimit = '10mb';
const urlencodedLimit = '10mb';
app.use(express.json({
  limit: jsonLimit, // Allow up to 10MB for JSON payloads (base64 encoded files need more space)
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: urlencodedLimit }));
log(`Body parser limits: JSON=${jsonLimit}, URLEncoded=${urlencodedLimit}`);

// Middleware to catch body parser errors (happens before routes)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.type === 'entity.too.large' ||
    err.message?.includes('too large') ||
    err.message?.includes('request entity too large') ||
    err.status === 413 ||
    err.statusCode === 413) {
    log(`Entity too large error caught: ${err.message}`);
    return res.status(413).json({
      error: "File is too large. Maximum file size is 2MB. Please compress your file and try again."
    });
  }
  next(err);
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      if (capturedJsonResponse) {
        // Deep clone or just mask for logging
        const sanitizeForLog = (obj: any): any => {
          if (!obj || typeof obj !== 'object') return obj;
          if (Array.isArray(obj)) return obj.map(sanitizeForLog);

          const sanitized: any = {};
          const sensitiveKeys = ['password', 'credentials', 'token', 'secret', 'secureNote', 'twoFactorSecret', 'recoveryCodes'];

          for (const key in obj) {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
              sanitized[key] = '[MASKED]';
            } else if (typeof obj[key] === 'object') {
              sanitized[key] = sanitizeForLog(obj[key]);
            } else {
              sanitized[key] = obj[key];
            }
          }
          return sanitized;
        };

        const safeOutput = sanitizeForLog(capturedJsonResponse);
        if (process.env.NODE_ENV === 'development') {
          logLine += ` :: ${JSON.stringify(safeOutput)}`;
        } else {
          // In production, only log essential info if the request failed
          if (res.statusCode >= 400) {
            logLine += ` :: Error Result: ${JSON.stringify(safeOutput)}`;
          }
        }
      }

      if (logLine.length > 200) { // Increased limit for better debugging but still capped
        logLine = logLine.slice(0, 199) + "...";
      }

      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  // Auto-initialize admin user on startup
  await initializeAdmin();

  // Start background jobs
  startBackgroundJobs().catch(e => log(`Failed to start background jobs: ${e.message}`, "error"));

  const server = await registerRoutes(app);

  // Health check endpoint for uptime monitoring
  app.get("/api/health", async (req, res) => {
    try {
      // Simple health check - just confirm server is responding
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development"
      });
    } catch (_error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed"
      });
    }
  });

  // Sentry error handler - MUST be after routes but before other error middleware
  if (process.env.NODE_ENV === "production") {
    const Sentry = await import("@sentry/node");
    Sentry.setupExpressErrorHandler(app);
  }

  // Final error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Handle "entity too large" errors specifically (happens at body parser level)
    if (err.type === 'entity.too.large' ||
      err.message?.includes('too large') ||
      err.message?.includes('request entity too large') ||
      err.status === 413 ||
      err.statusCode === 413) {
      log(`Entity too large error: ${err.message}`);
      return res.status(413).json({
        error: "File is too large. Maximum file size is 2MB. Please compress your file and try again."
      });
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    log(`Error ${status}: ${message}`);
    if (err.stack && process.env.NODE_ENV === 'development') {
      console.error("Error stack:", err.stack);
    }
    res.status(status).json({ error: message });
  });

  // importantly run the final setup after setting up all the other routes so
  // the catch-all route doesn't interfere with the other routes
  await setup(app, server);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);

  // Bind to all network interfaces for VPS/Docker accessibility
  const host = '0.0.0.0';

  // Global error handlers for unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[UNHANDLED REJECTION]', { reason, promise });
  });

  process.on('uncaughtException', (error) => {
    console.error('[UNCAUGHT EXCEPTION]', error);
    // Exit after logging to prevent app in broken state
    process.exit(1);
  });

  server.listen({
    port,
    host,
    reusePort: process.platform !== 'win32',
  }, () => {
    log(`serving on port ${port} at http://${host}:${port}`);
  });

}

