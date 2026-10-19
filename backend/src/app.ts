import express from 'express';
import { sessionMiddleware } from './middleware/session.js';
import { loginRoutes } from './routes/login.js';
import { registerRoutes } from './routes/register.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(sessionMiddleware());
  app.use(registerRoutes());
  app.use(loginRoutes());
  return app;
}
