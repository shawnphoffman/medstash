import express from 'express'
import cors from 'cors'
import path from 'path'
import { existsSync } from 'fs'
import './db' // Initialize database
import { db } from './db'
import receiptsRouter from './routes/receipts'
import flagsRouter from './routes/flags'
import usersRouter from './routes/users'
import receiptTypesRouter from './routes/receiptTypes'
import receiptTypeGroupsRouter from './routes/receiptTypeGroups'
import settingsRouter from './routes/settings'
import exportRouter from './routes/export'
import filenamesRouter from './routes/filenames'
import { ensureReceiptsDir } from './services/fileService'
import { errorHandler } from './middleware/errorHandler'
import { logger } from './utils/logger'

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
// Configure CORS - ALLOWED_ORIGINS is optional
// If set, validate against the list. If not set, allow all origins.
const allowedOrigins = process.env.ALLOWED_ORIGINS
	? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
	: null // null means allow all origins

if (allowedOrigins) {
	logger.debug(`CORS: Restricting to allowed origins: ${allowedOrigins.join(', ')}`)
} else {
	logger.debug('CORS: Allowing all origins (ALLOWED_ORIGINS not set)')
}

app.use(
	cors({
		origin: allowedOrigins
			? (origin, callback) => {
					// If ALLOWED_ORIGINS is set, validate against it
					// Allow requests with no origin (like mobile apps, Postman, or curl)
					if (!origin) {
						return callback(null, true)
					}
					if (allowedOrigins.includes(origin)) {
						callback(null, true)
					} else {
						callback(new Error('Not allowed by CORS'))
					}
			  }
			: true, // If ALLOWED_ORIGINS is not set, allow all origins
		credentials: true,
	})
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/receipts', receiptsRouter)
app.use('/api/flags', flagsRouter)
app.use('/api/users', usersRouter)
app.use('/api/receipt-types', receiptTypesRouter)
app.use('/api/receipt-type-groups', receiptTypeGroupsRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/export', exportRouter)
app.use('/api/filenames', filenamesRouter)

// Health check - verifies database connectivity
app.get('/health', (req, res) => {
	try {
		// Verify database connectivity by executing a simple query
		db.prepare('SELECT 1').get()
		res.json({ status: 'ok', database: 'connected' })
	} catch (error: any) {
		// Database connection failed
		res.status(503).json({
			status: 'error',
			database: 'disconnected',
			error: process.env.NODE_ENV === 'production' ? 'Service unavailable' : error.message,
		})
	}
})

// Serve static files from frontend build (only in production)
// In development, frontend is served separately
// In Docker, the structure is: /app/dist (backend) and /app/public (frontend)
// __dirname will be /app/dist at runtime after TypeScript compilation
const publicPath = path.resolve(process.cwd(), 'public')

// Check if public directory exists (production build)
if (existsSync(publicPath)) {
	// Serve static files
	app.use(express.static(publicPath))

	// Catch-all handler: send back React's index.html file for client-side routing
	// This must be after all API routes
	app.get('*', (req, res) => {
		// Don't serve index.html for API routes
		if (req.path.startsWith('/api')) {
			return res.status(404).json({ error: 'Not found' })
		}
		res.sendFile(path.join(publicPath, 'index.html'))
	})
}

// Initialize file storage
ensureReceiptsDir().catch(error => {
	logger.error('Failed to initialize receipts directory:', error)
	// Don't crash the server, but log the error
})

// Error handling middleware (must be last)
app.use(errorHandler)

// Verify database connection before starting server
try {
	db.prepare('SELECT 1').get()
	logger.debug('Database connection verified')
} catch (error: any) {
	logger.error('CRITICAL: Database connection failed:', error)
	logger.error('Server will not start. Please check:')
	logger.error('1. Database directory permissions')
	logger.error('2. Volume mount configuration')
	logger.error('3. Disk space availability')
	process.exit(1)
}

// Start server
app.listen(PORT, () => {
	logger.debug(`MedStash server running on port ${PORT}`)
	logger.debug(`Environment: ${process.env.NODE_ENV || 'development'}`)
	logger.debug(`Database: ${process.env.DB_DIR || '/data'}/medstash.db`)
	logger.debug(`Receipts: ${process.env.RECEIPTS_DIR || '/data/receipts'}`)
})

export default app
