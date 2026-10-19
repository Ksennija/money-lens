import { Router } from 'express';

const SESSION_COOKIE_NAME = 'connect.sid';

export function logoutRoutes(): Router {
  const router = Router();

  router.post('/api/logout', (req, res) => {
    req.session.destroy((error) => {
      if (error) {
        console.error('Logout failed', error);
        res.status(500).json({ code: 'server-error', message: 'Something went wrong' });
        return;
      }
      res.clearCookie(SESSION_COOKIE_NAME);
      res.status(200).json({ code: 'logged-out', message: 'Logged out' });
    });
  });

  return router;
}
