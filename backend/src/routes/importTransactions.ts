import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/requireAuth.js';
import { importBankCsv } from '../services/importService.js';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

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

        const result = await importBankCsv(req.session.userId!, file.buffer.toString('utf-8'));

        switch (result.kind) {
          case 'malformed':
            res.status(400).json(INVALID_FILE_RESPONSE);
            return;
          case 'missing-columns':
            res.status(400).json({
              code: 'missing-columns',
              message: `Missing required columns: ${result.missingColumns.join(', ')}`,
              missingColumns: result.missingColumns,
            });
            return;
          case 'too-many-rows':
            res.status(413).json(FILE_TOO_LARGE_RESPONSE);
            return;
          case 'imported':
            res.status(200).json({
              code: 'imported',
              imported: result.imported,
              duplicates: result.duplicates,
              rejected: result.rejected,
            });
            return;
        }
      } catch (error) {
        console.error('Transaction import failed', error);
        res.status(500).json({ code: 'server-error', message: 'Something went wrong' });
      }
    },
  );

  return router;
}
