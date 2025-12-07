import type { Request, Response, NextFunction } from "express";
import { extractTokenFromHeader, verifyToken } from "./auth";
import { storage } from "./storage";
import type { User } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: User;
      isAdmin?: boolean;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Note: In development with in-memory storage, the user may not exist if server restarted.
    // We still set the userId from the decoded token so the request can proceed.
    const user = await storage.getUser(decoded.userId);
    
    req.userId = decoded.userId;
    if (user) {
      req.user = user;
      req.isAdmin = user.isAdmin;
    } else {
      // User not in storage (server restart), but token is valid. Create a basic user object for the request.
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.email.split("@")[0],
        plan: (decoded.plan as any) || "free",
        isAdmin: decoded.isAdmin || false,
        password: null,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      req.isAdmin = decoded.isAdmin || false;
    }

    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  const requests = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    let requestTimes = requests.get(key)!;
    requestTimes = requestTimes.filter((time) => time > windowStart);

    if (requestTimes.length >= maxRequests) {
      return res.status(429).json({ error: "Too many requests" });
    }

    requestTimes.push(now);
    requests.set(key, requestTimes);

    next();
  };
}

export async function auditLog(
  userId: string | undefined,
  action: string,
  resource: string,
  resourceId?: string,
  changes?: any,
  req?: Request
) {
  try {
    await storage.createAuditLog({
      userId: userId || null,
      action,
      resource,
      resourceId: resourceId || null,
      changes,
      ipAddress: req?.ip || null,
      userAgent: req?.get("user-agent") || null,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
