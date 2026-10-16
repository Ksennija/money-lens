import bcrypt from 'bcrypt';
import { Router } from 'express';
import { validateRegistration } from '../domain/auth/validateRegistration.js';
import { createUser, isEmailTaken } from '../db/userRepository.js';

const BCRYPT_SALT_ROUNDS = 10;

const VALIDATION_RESPONSES = {
  'invalid-email': { code: 'invalid-email', message: 'Invalid email' },
  'invalid-password': { code: 'invalid-password', message: 'Invalid password' },
} as const;

const EMAIL_TAKEN_RESPONSE = { code: 'email-taken', message: 'Email already registered' };

export function registerRoutes(): Router {
  const router = Router();

  router.post('/api/register', async (req, res) => {
    try {
      const { email, password } = req.body ?? {};

      const validationError = validateRegistration(email, password);
      if (validationError) {
        res.status(400).json(VALIDATION_RESPONSES[validationError]);
        return;
      }

      if (await isEmailTaken(email)) {
        res.status(409).json(EMAIL_TAKEN_RESPONSE);
        return;
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

      if ((await createUser(email, passwordHash)) === 'email-taken') {
        res.status(409).json(EMAIL_TAKEN_RESPONSE);
        return;
      }

      res.status(201).json({ code: 'registered', message: 'The registration is succeeded' });
    } catch (error) {
      console.error('Registration failed', error);
      res.status(500).json({ code: 'server-error', message: 'Something went wrong' });
    }
  });

  return router;
}
