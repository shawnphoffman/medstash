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
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Configure CORS - restrict origins for security
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : process.env.NODE_ENV === 'production'
    ? [] // In production, must explicitly set ALLOWED_ORIGINS
    : ['http://localhost:3010', 'http://localhost:3000', 'http://127.0.0.1:3010', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
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

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`MedStash server running on port ${PORT}`);
});

export default app;

