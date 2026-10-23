import { Router } from 'express';
import { isValidMonth } from '../domain/comparison/compareMonths.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { InvalidCurrencyError, RateServiceError } from '../services/currencyConversionService.js';
import { getMonthlyComparison } from '../services/monthlyComparisonService.js';

const CURRENCY_PATTERN = /^[A-Za-z]{3}$/;

export function comparisonRoutes(): Router {
  const router = Router();

  router.get('/api/comparison', requireAuth, async (req, res) => {
    const month = req.query.month;
    if (month !== undefined && (typeof month !== 'string' || !isValidMonth(month))) {
      res.status(400).json({ code: 'invalid-month', message: 'Month must look like 2026-08' });
      return;
    }

    const currency = req.query.currency;
    if (currency !== undefined && (typeof currency !== 'string' || !CURRENCY_PATTERN.test(currency))) {
      res.status(400).json({ code: 'invalid-currency', message: 'Currency must be a three-letter code' });
      return;
    }

    try {
      const comparison = await getMonthlyComparison(req.session.userId!, month, currency);
      res.status(200).json({ code: 'comparison', ...comparison });
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
      console.error('Monthly comparison failed', error);
      res.status(500).json({ code: 'server-error', message: 'Something went wrong' });
    }
  });

  return router;
}
