import type { RequestHandler } from 'express';

export const UNAUTHENTICATED_RESPONSE = { code: 'unauthenticated', message: 'Not logged in' };

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.session.userId) {
    res.status(401).json(UNAUTHENTICATED_RESPONSE);
    return;
  }
  next();
};
