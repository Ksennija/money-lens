import express from 'express';
import { sessionMiddleware } from './middleware/session.js';
import { comparisonRoutes } from './routes/comparison.js';
import { importTransactionsRoutes } from './routes/importTransactions.js';
import { loginRoutes } from './routes/login.js';
import { logoutRoutes } from './routes/logout.js';
import { meRoutes } from './routes/me.js';
import { registerRoutes } from './routes/register.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(sessionMiddleware());
  app.use(registerRoutes());
  app.use(loginRoutes());
  app.use(logoutRoutes());
  app.use(meRoutes());
  app.use(importTransactionsRoutes());
  app.use(comparisonRoutes());
  return app;
}
