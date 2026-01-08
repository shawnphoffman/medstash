import { Request, Response, NextFunction } from 'express'

/**
 * Centralized error handling middleware
 * Provides consistent error responses across all routes
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
	// Log error details server-side
	console.error('Error:', {
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
		return res.status(err.status).json({
			error: err.message || 'An error occurred',
		})
	}

	// Default to 500 for unexpected errors
	// In production, don't expose internal error details
	const isProduction = process.env.NODE_ENV === 'production'
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
