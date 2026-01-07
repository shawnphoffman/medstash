import express from 'express';
import cors from 'cors';
import './db'; // Initialize database
import receiptsRouter from './routes/receipts';
import flagsRouter from './routes/flags';
import usersRouter from './routes/users';
import receiptTypesRouter from './routes/receiptTypes';
import settingsRouter from './routes/settings';
import exportRouter from './routes/export';
import filenamesRouter from './routes/filenames';
import { ensureReceiptsDir } from './services/fileService';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/receipts', receiptsRouter);
app.use('/api/flags', flagsRouter);
app.use('/api/users', usersRouter);
app.use('/api/receipt-types', receiptTypesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/export', exportRouter);
app.use('/api/filenames', filenamesRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize file storage
ensureReceiptsDir().catch((error) => {
  console.error('Failed to initialize receipts directory:', error);
});

// Start server
app.listen(PORT, () => {
  console.log(`MedStash backend server running on port ${PORT}`);
});

export default app;

