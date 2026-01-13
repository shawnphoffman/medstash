import { useEffect, useRef, useState } from 'react'

interface PullToRefreshOptions {
	/**
	 * Threshold in pixels before refresh is triggered
	 * @default 80
	 */
	threshold?: number
	/**
	 * Maximum pull distance in pixels
	 * @default 150
	 */
	maxPull?: number
	/**
	 * Whether to enable pull-to-refresh
	 * @default true
	 */
	enabled?: boolean
	/**
	 * Callback when refresh is triggered
	 */
	onRefresh?: () => void | Promise<void>
	/**
	 * Whether to do a hard refresh (bypass cache)
	 * @default true
	 */
	hardRefresh?: boolean
}

/**
 * Hook to enable pull-to-refresh functionality for iOS home screen web apps
 *
 * This is necessary because iOS standalone web apps don't have native pull-to-refresh
 * like Safari does. This hook implements a custom pull-to-refresh gesture.
 */
export function usePullToRefresh(options: PullToRefreshOptions = {}) {
	const { threshold = 80, maxPull = 150, enabled = true, onRefresh, hardRefresh = true } = options

	const [isPulling, setIsPulling] = useState(false)
	const [pullDistance, setPullDistance] = useState(0)
	const touchStartY = useRef<number | null>(null)
	const touchCurrentY = useRef<number | null>(null)
	const isRefreshing = useRef(false)
	const containerRef = useRef<HTMLElement | null>(null)

	// Check if we're in iOS standalone mode
	const isStandalone = () => {
		if (typeof window === 'undefined') return false
		// @ts-ignore - window.navigator.standalone is iOS-specific
		return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
	}

	useEffect(() => {
		if (!enabled) return

		// Only enable on iOS or in standalone mode
		const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || isStandalone()
		if (!isIOS && !isStandalone()) return

		const handleTouchStart = (e: TouchEvent) => {
			// Only trigger if we're at the top of the page
			if (window.scrollY > 10) return
			if (isRefreshing.current) return

			touchStartY.current = e.touches[0].clientY
			touchCurrentY.current = e.touches[0].clientY
		}

		const handleTouchMove = (e: TouchEvent) => {
			if (touchStartY.current === null || isRefreshing.current) return

			// Only allow pull-to-refresh when at the very top of the page
			if (window.scrollY > 10) {
				// Reset if user scrolls down
				touchStartY.current = null
				setIsPulling(false)
				setPullDistance(0)
				return
			}

			touchCurrentY.current = e.touches[0].clientY
			const deltaY = touchCurrentY.current - touchStartY.current

			// Only allow downward pull
			if (deltaY > 0) {
				const distance = Math.min(deltaY, maxPull)
				setPullDistance(distance)
				setIsPulling(distance > 10)

				// Only prevent default if we're actively pulling (more than threshold)
				// This allows normal scrolling when not pulling
				if (distance > 10) {
					e.preventDefault()
				}
			} else {
				// Reset if user pulls up
				touchStartY.current = null
				setIsPulling(false)
				setPullDistance(0)
			}
		}

		const handleTouchEnd = async () => {
			if (touchStartY.current === null || isRefreshing.current) return

			const finalDistance = pullDistance

			// Reset touch tracking
			touchStartY.current = null
			touchCurrentY.current = null
			setIsPulling(false)
			setPullDistance(0)

			// Trigger refresh if threshold is met
			if (finalDistance >= threshold) {
				isRefreshing.current = true

				try {
					if (onRefresh) {
						await onRefresh()
					}

					// Perform hard refresh if requested
					if (hardRefresh) {
						// Use cache-busting reload
						window.location.reload()
					}
				} catch (error) {
					console.error('Pull-to-refresh error:', error)
				} finally {
					// Reset after a delay to prevent rapid re-triggering
					setTimeout(() => {
						isRefreshing.current = false
					}, 1000)
				}
			}
		}

		// Add touch event listeners with passive: false to allow preventDefault
		document.addEventListener('touchstart', handleTouchStart, { passive: true })
		document.addEventListener('touchmove', handleTouchMove, { passive: false })
		document.addEventListener('touchend', handleTouchEnd, { passive: true })

		return () => {
			document.removeEventListener('touchstart', handleTouchStart)
			document.removeEventListener('touchmove', handleTouchMove)
			document.removeEventListener('touchend', handleTouchEnd)
		}
	}, [enabled, threshold, maxPull, pullDistance, onRefresh, hardRefresh])

	// Calculate progress (0-1) for visual feedback
	const progress = Math.min(pullDistance / threshold, 1)
	const shouldRefresh = pullDistance >= threshold

	return {
		isPulling,
		pullDistance,
		progress,
		shouldRefresh,
		containerRef,
	}
}
