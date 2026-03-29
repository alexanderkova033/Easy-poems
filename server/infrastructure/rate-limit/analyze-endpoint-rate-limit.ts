import type { Request, Response, NextFunction } from "express";

type Bucket = { count: number; windowStart: number };

const store = new Map<string, Bucket>();

function clientKey(req: Request): string {
  const xf = req.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress ?? "unknown";
}

/**
 * Fixed-window limiter for POST /api/analyze. Enable via RATE_LIMIT_MAX > 0.
 */
export function createAnalyzeEndpointRateLimiter(options: {
  windowMs: number;
  max: number;
}) {
  const { windowMs, max } = options;
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "POST" || req.path !== "/api/analyze") {
      next();
      return;
    }
    const key = clientKey(req);
    const now = Date.now();
    let b = store.get(key);
    if (!b || now - b.windowStart >= windowMs) {
      b = { count: 0, windowStart: now };
      store.set(key, b);
    }
    b.count += 1;
    if (b.count > max) {
      const retrySec = Math.max(
        1,
        Math.ceil((b.windowStart + windowMs - now) / 1000)
      );
      res.setHeader("Retry-After", String(retrySec));
      res.status(429).json({ error: "Too many requests; try again later." });
      return;
    }
    next();
  };
}
