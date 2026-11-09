import { Router } from 'express';
import { isValidMonth } from '../domain/comparison/compareMonths.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { getMonthlyTransactions } from '../services/transactionsService.js';

export function transactionsRoutes(): Router {
  const router = Router();

  router.get('/api/transactions', requireAuth, async (req, res) => {
    const month = req.query.month;
    if (month !== undefined && (typeof month !== 'string' || !isValidMonth(month))) {
      res.status(400).json({ code: 'invalid-month', message: 'Month must look like 2026-08' });
      return;
    }

    try {
      const result = await getMonthlyTransactions(req.session.userId!, month);
      res.status(200).json({ code: 'transactions', ...result });
    } catch (error) {
      console.error('Listing transactions failed', error);
      res.status(500).json({ code: 'server-error', message: 'Something went wrong' });
    }
  });

  return router;
}
