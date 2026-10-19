import express from 'express';
import { loginRoutes } from './routes/login.js';
import { registerRoutes } from './routes/register.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(registerRoutes());
  app.use(loginRoutes());
  return app;
}
