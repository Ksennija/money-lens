import bcrypt from 'bcrypt';
import express from 'express';
import { Prisma } from './generated/prisma/client.js';
import { prisma } from './db.js';

const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_SALT_ROUNDS = 10;
const UNIQUE_CONSTRAINT_ERROR_CODE = 'P2002';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.post('/api/register', async (req, res) => {
    const { email, password } = req.body ?? {};

    if (typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ message: 'Invalid email' });
      return;
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ message: 'Invalid password' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    try {
      await prisma.user.create({ data: { email, passwordHash } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_ERROR_CODE
      ) {
        res.status(409).json({ message: 'Email already registered' });
        return;
      }
      throw error;
    }

    res.status(201).json({ message: 'The registration is succeeded' });
  });

  return app;
}
