import { Router } from 'express';
import multer from 'multer';
import { parseBankCsv } from '../domain/transactions/parseBankCsv.js';
import { importTransactions } from '../db/transactionRepository.js';
import { requireAuth } from '../middleware/requireAuth.js';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_DATA_ROWS = 5000;

const INVALID_FILE_RESPONSE = { code: 'invalid-file', message: 'Upload a CSV file' };
const FILE_TOO_LARGE_RESPONSE = { code: 'file-too-large', message: 'The file is too large' };

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE_BYTES } });

function isCsvFile(file: Express.Multer.File): boolean {
  return file.originalname.toLowerCase().endsWith('.csv') || file.mimetype === 'text/csv';
}

export function importTransactionsRoutes(): Router {
  const router = Router();

  router.post(
    '/api/transactions/import',
    requireAuth,
    (req, res, next) => {
      upload.single('file')(req, res, (error) => {
        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json(FILE_TOO_LARGE_RESPONSE);
          return;
        }
        if (error instanceof multer.MulterError) {
          res.status(400).json(INVALID_FILE_RESPONSE);
          return;
        }
        next(error);
      });
    },
    async (req, res) => {
      try {
        const file = req.file;
        if (!file || !isCsvFile(file)) {
          res.status(400).json(INVALID_FILE_RESPONSE);
          return;
        }

        const parsed = parseBankCsv(file.buffer.toString('utf-8'));

        if ('malformed' in parsed) {
          res.status(400).json(INVALID_FILE_RESPONSE);
          return;
        }
        if ('missingColumns' in parsed) {
          res.status(400).json({
            code: 'missing-columns',
            message: `Missing required columns: ${parsed.missingColumns.join(', ')}`,
            missingColumns: parsed.missingColumns,
          });
          return;
        }
        if (parsed.rows.length + parsed.rejected.length > MAX_DATA_ROWS) {
          res.status(413).json(FILE_TOO_LARGE_RESPONSE);
          return;
        }

        const { imported, duplicates } = await importTransactions(req.session.userId!, parsed.rows);

        res.status(200).json({ code: 'imported', imported, duplicates, rejected: parsed.rejected });
      } catch (error) {
        console.error('Transaction import failed', error);
        res.status(500).json({ code: 'server-error', message: 'Something went wrong' });
      }
    },
  );

  return router;
}
