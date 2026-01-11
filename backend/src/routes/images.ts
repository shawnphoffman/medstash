import express from 'express'
import { optimizeExistingImages, reoptimizeAllImages } from '../services/fileService'
import { logger } from '../utils/logger'

const router = express.Router()

/**
 * POST /api/images/optimize
 * Optimize all unoptimized images in the database
 * Returns statistics about the optimization process
 */
router.post('/optimize', async (req: express.Request, res: express.Response) => {
	try {
		const { batchSize, maxConcurrent } = req.body

		const options = {
			batchSize: batchSize && typeof batchSize === 'number' ? batchSize : undefined,
			maxConcurrent: maxConcurrent && typeof maxConcurrent === 'number' ? maxConcurrent : undefined,
		}

		logger.debug('Starting batch image optimization...')
		const results = await optimizeExistingImages(options)

		res.json({
			success: true,
			...results,
		})
	} catch (error: any) {
		logger.error('Error optimizing images:', error)
		res.status(500).json({
			success: false,
			error: 'Failed to optimize images',
			message: error.message || 'Unknown error',
		})
	}
})

/**
 * POST /api/images/reoptimize
 * Re-optimize all images in the database (including already optimized ones)
 * Returns statistics about the optimization process
 */
router.post('/reoptimize', async (req: express.Request, res: express.Response) => {
	try {
		const { batchSize, maxConcurrent } = req.body

		const options = {
			batchSize: batchSize && typeof batchSize === 'number' ? batchSize : undefined,
			maxConcurrent: maxConcurrent && typeof maxConcurrent === 'number' ? maxConcurrent : undefined,
		}

		logger.debug('Starting re-optimization of all images...')
		const results = await reoptimizeAllImages(options)

		res.json({
			success: true,
			...results,
		})
	} catch (error: any) {
		logger.error('Error re-optimizing images:', error)
		res.status(500).json({
			success: false,
			error: 'Failed to re-optimize images',
			message: error.message || 'Unknown error',
		})
	}
})

export default router
