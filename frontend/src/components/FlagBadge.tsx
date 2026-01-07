import { Badge } from './ui/badge'
import { getBadgeClassName } from './ui/color-picker'
import { Flag } from '../lib/api'

interface FlagBadgeProps {
	flag: Flag
	className?: string
}

export function FlagBadge({ flag, className }: FlagBadgeProps) {
	return (
		<Badge variant="secondary" className={flag.color ? getBadgeClassName(flag.color) : undefined}>
			{flag.name}
		</Badge>
	)
}

