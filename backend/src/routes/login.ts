import bcrypt from 'bcrypt';
import { Router } from 'express';
import { findUserByEmail } from '../db/userRepository.js';

const BCRYPT_SALT_ROUNDS = 10;

// Compared against when the email is unknown, so both failure paths take similar time.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-password', BCRYPT_SALT_ROUNDS);

const INVALID_CREDENTIALS_RESPONSE = {
  code: 'invalid-credentials',
  message: 'Invalid email or password',
};

export function loginRoutes(): Router {
  const router = Router();

  router.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body ?? {};

      if (typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).json(INVALID_CREDENTIALS_RESPONSE);
        return;
      }

      const user = await findUserByEmail(email);
      const passwordMatches = await bcrypt.compare(
        password,
        user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      );

      if (!user || !passwordMatches) {
        res.status(401).json(INVALID_CREDENTIALS_RESPONSE);
        return;
      }

      res.status(200).json({ code: 'logged-in', message: 'Logged in' });
    } catch (error) {
      console.error('Login failed', error);
      res.status(500).json({ code: 'server-error', message: 'Something went wrong' });
    }
  });

  return router;
}
