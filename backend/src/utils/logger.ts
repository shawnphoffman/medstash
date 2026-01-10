/**
 * Logger utility with LOG_LEVEL support
 * Supports ERROR, WARN, and DEBUG levels
 * 
 * LOG_LEVEL values:
 * - ERROR: Only error messages
 * - WARN: Error and warning messages
 * - DEBUG: All messages (errors, warnings, and debug info)
 * 
 * Default: DEBUG (if LOG_LEVEL not set)
 */

type LogLevel = 'ERROR' | 'WARN' | 'DEBUG'

const LOG_LEVELS: Record<LogLevel, number> = {
	ERROR: 0,
	WARN: 1,
	DEBUG: 2,
}

function getLogLevel(): LogLevel {
	const envLevel = (process.env.LOG_LEVEL || 'DEBUG').toUpperCase() as LogLevel
	if (LOG_LEVELS.hasOwnProperty(envLevel)) {
		return envLevel
	}
	// Default to DEBUG if invalid level provided
	return 'DEBUG'
}

const currentLogLevel = getLogLevel()
const currentLogLevelValue = LOG_LEVELS[currentLogLevel]

function shouldLog(level: LogLevel): boolean {
	return LOG_LEVELS[level] <= currentLogLevelValue
}

export const logger = {
	error: (...args: any[]) => {
		if (shouldLog('ERROR')) {
			console.error('[ERROR]', ...args)
		}
	},
	warn: (...args: any[]) => {
		if (shouldLog('WARN')) {
			console.warn('[WARN]', ...args)
		}
	},
	debug: (...args: any[]) => {
		if (shouldLog('DEBUG')) {
			console.log('[DEBUG]', ...args)
		}
	},
	// For backward compatibility and general logging
	log: (...args: any[]) => {
		if (shouldLog('DEBUG')) {
			console.log(...args)
		}
	},
}
