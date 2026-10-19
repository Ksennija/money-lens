import { Router } from 'express';
import { findUserById } from '../db/userRepository.js';
import { requireAuth, UNAUTHENTICATED_RESPONSE } from '../middleware/requireAuth.js';

export function meRoutes(): Router {
  const router = Router();

  router.get('/api/me', requireAuth, async (req, res) => {
    try {
      const user = await findUserById(req.session.userId!);
      if (!user) {
        res.status(401).json(UNAUTHENTICATED_RESPONSE);
        return;
      }

      res.status(200).json({ email: user.email });
    } catch (error) {
      console.error('Loading current user failed', error);
      res.status(500).json({ code: 'server-error', message: 'Something went wrong' });
    }
  });

  return router;
}
