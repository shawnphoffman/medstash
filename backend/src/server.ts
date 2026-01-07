import express from 'express';
import cors from 'cors';
import path from 'path';
import { existsSync } from 'fs';
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
const PORT = process.env.PORT || 3000;

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

// Serve static files from frontend build (only in production)
// In development, frontend is served separately
// In Docker, the structure is: /app/dist (backend) and /app/public (frontend)
// __dirname will be /app/dist at runtime after TypeScript compilation
const publicPath = path.resolve(process.cwd(), 'public');

// Check if public directory exists (production build)
if (existsSync(publicPath)) {
  // Serve static files
  app.use(express.static(publicPath));

  // Catch-all handler: send back React's index.html file for client-side routing
  // This must be after all API routes
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Initialize file storage
ensureReceiptsDir().catch((error) => {
  console.error('Failed to initialize receipts directory:', error);
});

// Start server
app.listen(PORT, () => {
  console.log(`MedStash server running on port ${PORT}`);
});

export default app;

