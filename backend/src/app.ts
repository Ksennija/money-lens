import express from 'express';
import { registerRoutes } from './routes/register.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(registerRoutes());
  return app;
}
