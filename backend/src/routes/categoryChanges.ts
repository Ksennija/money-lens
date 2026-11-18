import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getCategoryChanges } from '../services/categoryChangesService.js';
import { InvalidCurrencyError, RateServiceError } from '../services/currencyConversionService.js';

const CURRENCY_PATTERN = /^[A-Za-z]{3}$/;

export function categoryChangesRoutes(): Router {
  const router = Router();

  router.get('/api/category-changes', requireAuth, async (req, res) => {
    const currency = req.query.currency;
    if (currency !== undefined && (typeof currency !== 'string' || !CURRENCY_PATTERN.test(currency))) {
      res.status(400).json({ code: 'invalid-currency', message: 'Currency must be a three-letter code' });
      return;
    }

    try {
      const result = await getCategoryChanges(req.session.userId!, currency);
      res.status(200).json({ code: 'category-changes', ...result });
    } catch (error) {
      if (error instanceof InvalidCurrencyError) {
        res.status(400).json({ code: 'invalid-currency', message: error.message });
        return;
      }
      if (error instanceof RateServiceError) {
        console.error('Exchange rates unavailable', error);
        res.status(502).json({ code: 'rates-unavailable', message: 'Exchange rates are currently unavailable' });
        return;
      }
      console.error('Category changes failed', error);
      res.status(500).json({ code: 'server-error', message: 'Something went wrong' });
    }
  });

  return router;
}
