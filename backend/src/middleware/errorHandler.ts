import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

/**
 * Centralized error handling middleware
 * Provides consistent error responses across all routes
 * Prevents information leakage in production
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
	const isProduction = process.env.NODE_ENV === 'production'

	// Log error details server-side (never expose to client)
	logger.error('Error:', {
		message: err.message,
		stack: err.stack,
		path: req.path,
		method: req.method,
		timestamp: new Date().toISOString(),
	})

	// Don't send response if headers already sent
	if (res.headersSent) {
		return next(err)
	}

	// Handle specific error types
	if (err.status) {
		// For client errors (4xx), it's usually safe to expose the message
		// but sanitize it to prevent information leakage
		const status = err.status
		if (status >= 400 && status < 500) {
			// Client errors - message is usually safe, but sanitize in production
			return res.status(status).json({
				error: isProduction && err.message?.includes('ENOENT') ? 'Resource not found' : err.message || 'An error occurred',
			})
		}
		// Server errors (5xx) - never expose details in production
		return res.status(status).json({
			error: isProduction ? 'Internal server error' : err.message || 'An error occurred',
		})
	}

	// Default to 500 for unexpected errors
	// In production, never expose internal error details (file paths, stack traces, etc.)
	res.status(500).json({
		error: isProduction ? 'Internal server error' : err.message || 'An error occurred',
	})
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
	return (req: Request, res: Response, next: NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch(next)
	}
}
