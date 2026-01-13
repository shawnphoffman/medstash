import { RefreshCw } from 'lucide-react'
import { cn } from '../lib/utils'

interface PullToRefreshIndicatorProps {
	isPulling: boolean
	progress: number
	shouldRefresh: boolean
}

/**
 * Visual indicator for pull-to-refresh gesture
 * Shows at the top of the page when user pulls down
 */
export function PullToRefreshIndicator({ isPulling, progress, shouldRefresh }: PullToRefreshIndicatorProps) {
	if (!isPulling && progress === 0) return null

	return (
		<div
			className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-200"
			style={{
				height: `${Math.min(progress * 80, 80)}px`,
				opacity: isPulling ? 1 : 0,
			}}
		>
			<div className="flex flex-col items-center gap-2">
				<RefreshCw
					className={cn(
						'w-6 h-6 text-primary transition-transform duration-200',
						shouldRefresh && 'animate-spin'
					)}
					style={{
						transform: `rotate(${progress * 180}deg)`,
					}}
				/>
				{shouldRefresh && (
					<span className="text-xs text-muted-foreground animate-pulse">Release to refresh</span>
				)}
			</div>
		</div>
	)
}
