import express from 'express';
import { sessionMiddleware } from './middleware/session.js';
import { loginRoutes } from './routes/login.js';
import { logoutRoutes } from './routes/logout.js';
import { registerRoutes } from './routes/register.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(sessionMiddleware());
  app.use(registerRoutes());
  app.use(loginRoutes());
  app.use(logoutRoutes());
  return app;
}
