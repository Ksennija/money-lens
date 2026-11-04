import type { ErrorRequestHandler, RequestHandler } from 'express';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ code: 'not-found', message: 'Not found' });
};

// Last middleware: turns anything that reaches Express's error path into JSON, so clients never
// get the default HTML error page.
export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const type = (error as { type?: string } | null)?.type;
  if (type === 'entity.parse.failed') {
    res.status(400).json({ code: 'invalid-json', message: 'The request body is not valid JSON' });
    return;
  }
  if (type === 'entity.too.large') {
    res.status(413).json({ code: 'payload-too-large', message: 'The request body is too large' });
    return;
  }

  console.error('Unhandled error', error);
  res.status(500).json({ code: 'server-error', message: 'Something went wrong' });
};
