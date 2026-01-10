import express from 'express';
import cors from 'cors';
import receiptsRouter from '../../src/routes/receipts';
import flagsRouter from '../../src/routes/flags';
import usersRouter from '../../src/routes/users';
import receiptTypesRouter from '../../src/routes/receiptTypes';
import receiptTypeGroupsRouter from '../../src/routes/receiptTypeGroups';
import settingsRouter from '../../src/routes/settings';
import exportRouter from '../../src/routes/export';
import filenamesRouter from '../../src/routes/filenames';

/**
 * Create a test Express app instance
 */
export function createTestApp(): express.Application {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api/receipts', receiptsRouter);
  app.use('/api/flags', flagsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/receipt-types', receiptTypesRouter);
  app.use('/api/receipt-type-groups', receiptTypeGroupsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/export', exportRouter);
  app.use('/api/filenames', filenamesRouter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

