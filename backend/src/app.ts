import express from 'express';
import helmet from 'helmet';
import { authRateLimiter } from './middleware/authRateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandlers.js';
import { sessionMiddleware } from './middleware/session.js';
import { comparisonRoutes } from './routes/comparison.js';
import { importTransactionsRoutes } from './routes/importTransactions.js';
import { loginRoutes } from './routes/login.js';
import { logoutRoutes } from './routes/logout.js';
import { meRoutes } from './routes/me.js';
import { registerRoutes } from './routes/register.js';
import { transactionsRoutes } from './routes/transactions.js';

export type AppOptions = {
  // Max login/register attempts per IP per window. Without it the default limit applies, except
  // under test, where the suites log in many times from one address.
  authRateLimit?: number;
};

// TRUST_PROXY: "true", a number of proxy hops, or a subnet list. Unset means no proxy is trusted.
function trustProxySetting(value: string | undefined): boolean | number | string | undefined {
  if (!value || value === 'false') return undefined;
  if (value === 'true') return true;
  return /^\d+$/.test(value) ? Number(value) : value;
}

export function createApp(options: AppOptions = {}) {
  const app = express();

  const trustProxy = trustProxySetting(process.env.TRUST_PROXY);
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);

  app.use(helmet());
  app.use(express.json());
  app.use(sessionMiddleware());

  if (options.authRateLimit !== undefined || process.env.NODE_ENV !== 'test') {
    const limiter = authRateLimiter(options.authRateLimit);
    app.post('/api/login', limiter);
    app.post('/api/register', limiter);
  }

  app.use(registerRoutes());
  app.use(loginRoutes());
  app.use(logoutRoutes());
  app.use(meRoutes());
  app.use(importTransactionsRoutes());
  app.use(comparisonRoutes());
  app.use(transactionsRoutes());

  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}
