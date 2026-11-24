import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.ts';
import apiRouter from './routes/api.ts';

export function createApiApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  app.use('/api', apiRouter);
  app.use('/api/*', notFoundHandler);
  app.use(errorHandler);

  return app;
}
