import { rateLimit } from 'express-rate-limit';

export const AUTH_RATE_LIMIT = 10;
const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;

// Counts requests per client IP in memory, which is enough for a single server process.
export function authRateLimiter(limit: number = AUTH_RATE_LIMIT) {
  return rateLimit({
    windowMs: AUTH_RATE_WINDOW_MS,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res
        .status(429)
        .json({ code: 'too-many-requests', message: 'Too many attempts, try again later' });
    },
  });
}
