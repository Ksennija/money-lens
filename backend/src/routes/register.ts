import bcrypt from 'bcrypt';
import { Router } from 'express';
import { validateRegistration } from '../domain/auth/validateRegistration.js';
import { createUser, isEmailTaken } from '../db/userRepository.js';

const BCRYPT_SALT_ROUNDS = 10;

const VALIDATION_MESSAGES = {
  'invalid-email': 'Invalid email',
  'invalid-password': 'Invalid password',
} as const;

export function registerRoutes(): Router {
  const router = Router();

  router.post('/api/register', async (req, res) => {
    const { email, password } = req.body ?? {};

    const validationError = validateRegistration(email, password);
    if (validationError) {
      res.status(400).json({ message: VALIDATION_MESSAGES[validationError] });
      return;
    }

    const emailTakenResponse = { message: 'Email already registered' };

    if (await isEmailTaken(email)) {
      res.status(409).json(emailTakenResponse);
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    if ((await createUser(email, passwordHash)) === 'email-taken') {
      res.status(409).json(emailTakenResponse);
      return;
    }

    res.status(201).json({ message: 'The registration is succeeded' });
  });

  return router;
}
