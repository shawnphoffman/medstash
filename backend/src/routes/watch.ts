import express from 'express'
import { getWatchServiceStatus, triggerScan } from '../services/watchService'
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

export default router
