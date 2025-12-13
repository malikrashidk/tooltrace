import { type Server } from "node:http";

import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
} from "express";

import { registerRoutes } from "./routes";
import { initializeAdmin } from "./init-admin";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();

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
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
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
  
  const server = await registerRoutes(app);

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
  // Use localhost on Windows, 0.0.0.0 on Linux/Mac
  const host = process.platform === 'win32' ? 'localhost' : '0.0.0.0';
  server.listen({
    port,
    host,
    reusePort: process.platform !== 'win32', // reusePort not supported on Windows
  }, () => {
    log(`serving on port ${port} at http://${host}:${port}`);
  });
}
