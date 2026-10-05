import express from 'express';

const MIN_PASSWORD_LENGTH = 8;

export function createApp() {
  const app = express();
  app.use(express.json());

  const users = new Map<string, { password: string }>();

  app.post('/api/register', (req, res) => {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ message: 'Invalid email' });
      return;
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ message: 'Invalid password' });
      return;
    }
    if (users.has(email)) {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }

    users.set(email, { password });
    res.status(201).json({ message: 'The registration is succeeded' });
  });

  return app;
}
