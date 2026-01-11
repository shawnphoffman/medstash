import express from 'express'
import { getWatchServiceStatus, triggerScan, countProcessedFiles, deleteProcessedFiles } from '../services/watchService'
import { logger } from '../utils/logger'

const router = express.Router()

/**
 * GET /api/watch/status - Get watch service status
 */
router.get('/status', (req, res) => {
	try {
		const status = getWatchServiceStatus()
		res.json(status)
	} catch (error) {
		logger.error('Error getting watch service status:', error)
		res.status(500).json({ error: 'Failed to get watch service status' })
	}
})

/**
 * POST /api/watch/scan - Manually trigger a scan
 */
router.post('/scan', async (req, res) => {
	try {
		await triggerScan()
		const status = getWatchServiceStatus()
		res.json({
			message: 'Scan completed',
			status,
		})
	} catch (error) {
		logger.error('Error triggering watch scan:', error)
		res.status(500).json({ error: 'Failed to trigger scan' })
	}
})

/**
 * GET /api/watch/processed/count - Get count of files in processed folder
 */
router.get('/processed/count', async (req, res) => {
	try {
		const count = await countProcessedFiles()
		res.json({ count })
	} catch (error) {
		logger.error('Error counting processed files:', error)
		res.status(500).json({ error: 'Failed to count processed files' })
	}
})

/**
 * DELETE /api/watch/processed - Delete all files in processed folder
 */
router.delete('/processed', async (req, res) => {
	try {
		const result = await deleteProcessedFiles()
		res.json(result)
	} catch (error) {
		logger.error('Error deleting processed files:', error)
		res.status(500).json({ error: 'Failed to delete processed files' })
	}
})

export default router
