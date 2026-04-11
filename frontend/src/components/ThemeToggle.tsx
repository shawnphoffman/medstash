import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { Button } from './ui/button'

export function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	// Avoid hydration mismatch / icon flash by only rendering after mount.
	useEffect(() => {
		setMounted(true)
	}, [])

	const isDark = resolvedTheme === 'dark'

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={() => setTheme(isDark ? 'light' : 'dark')}
			aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
		>
			{mounted ? (
				isDark ? (
					<Sun className="size-[1.1rem]" />
				) : (
					<Moon className="size-[1.1rem]" />
				)
			) : (
				<Moon className="size-[1.1rem] opacity-0" />
			)}
		</Button>
	)
}
