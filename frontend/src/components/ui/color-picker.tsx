import { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/utils'

// Predefined Tailwind colors with their hex values
// Using 500 shades which work well in both light and dark modes
export const TAILWIND_COLORS = [
	{ name: 'Red', value: '#ef4444', class: 'bg-red-600 text-white hover:bg-red-600' },
	{
		name: 'Orange',
		value: '#f97316',
		class: 'bg-orange-600 text-white hover:bg-orange-600',
	},
	{
		name: 'Amber',
		value: '#f59e0b',
		class: 'bg-amber-600 text-white hover:bg-amber-600',
	},
	{
		name: 'Yellow',
		value: '#eab308',
		class: 'bg-yellow-600 text-white hover:bg-yellow-600',
	},
	{
		name: 'Lime',
		value: '#84cc16',
		class: 'bg-lime-600 text-white hover:bg-lime-600',
	},
	{
		name: 'Green',
		value: '#22c55e',
		class: 'bg-green-600 text-white hover:bg-green-600',
	},
	{
		name: 'Emerald',
		value: '#10b981',
		class: 'bg-emerald-600 text-white hover:bg-emerald-600',
	},
	{
		name: 'Teal',
		value: '#14b8a6',
		class: 'bg-teal-600 text-white hover:bg-teal-600',
	},
	{
		name: 'Cyan',
		value: '#06b6d4',
		class: 'bg-cyan-600 text-white hover:bg-cyan-600',
	},
	{ name: 'Sky', value: '#0ea5e9', class: 'bg-sky-600 text-white hover:bg-sky-600' },
	{
		name: 'Blue',
		value: '#3b82f6',
		class: 'bg-blue-600 text-white hover:bg-blue-600',
	},
	{
		name: 'Indigo',
		value: '#6366f1',
		class: 'bg-indigo-600 text-white hover:bg-indigo-600',
	},
	{
		name: 'Violet',
		value: '#8b5cf6',
		class: 'bg-violet-600 text-white hover:bg-violet-600',
	},
	{ name: 'Purple', value: '#a855f7', class: 'bg-purple-600 text-white' },
	{
		name: 'Fuchsia',
		value: '#d946ef',
		class: 'bg-fuchsia-600 text-white hover:bg-fuchsia-600',
	},
	{
		name: 'Pink',
		value: '#ec4899',
		class: 'bg-pink-600 text-white hover:bg-pink-600',
	},
	{
		name: 'Rose',
		value: '#f43f5e',
		class: 'bg-rose-600 text-white shadow hover:bg-rose-600',
	},
	{
		name: 'Slate',
		value: '#64748b',
		class: 'bg-slate-600 text-white hover:bg-slate-600',
	},
]

/**
 * Get Tailwind classes for a badge with the given background color
 * Returns the className string with background and text color classes
 */
export function getBadgeClassName(backgroundColor: string): string {
	const color = TAILWIND_COLORS.find(c => c.value === backgroundColor)
	if (!color) {
		// Default classes if color not found
		return 'bg-blue-600 text-white'
	}
	return color.class
}

/**
 * Get Tailwind border color class for a given hex color
 * Returns the className string with border color class (e.g., 'border-red-600')
 */
export function getBorderClassName(backgroundColor: string): string {
	const borderColorMap: Record<string, string> = {
		'#ef4444': 'border-red-600',
		'#f97316': 'border-orange-600',
		'#f59e0b': 'border-amber-600',
		'#eab308': 'border-yellow-600',
		'#84cc16': 'border-lime-600',
		'#22c55e': 'border-green-600',
		'#10b981': 'border-emerald-600',
		'#14b8a6': 'border-teal-600',
		'#06b6d4': 'border-cyan-600',
		'#0ea5e9': 'border-sky-600',
		'#3b82f6': 'border-blue-600',
		'#6366f1': 'border-indigo-600',
		'#8b5cf6': 'border-violet-600',
		'#a855f7': 'border-purple-600',
		'#d946ef': 'border-fuchsia-600',
		'#ec4899': 'border-pink-600',
		'#f43f5e': 'border-rose-600',
		'#64748b': 'border-slate-600',
	}
	return borderColorMap[backgroundColor] || 'border-blue-600'
}

interface ColorPickerProps {
	value: string
	onChange: (color: string) => void
	className?: string
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
	const [isOpen, setIsOpen] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setIsOpen(false)
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isOpen])

	// const selectedColor = TAILWIND_COLORS.find(c => c.value === value) || TAILWIND_COLORS[10] // Default to blue

	return (
		<div ref={containerRef} className={cn('relative', className)}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2 p-2 border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
			>
				<div className="w-6 h-6 border-2 rounded border-border" style={{ backgroundColor: value }} />
				{/* <span className="text-sm text-muted-foreground">{selectedColor.name}</span> */}
			</button>

			{isOpen && (
				<div className="absolute z-50 w-64 p-3 mt-2 border rounded-lg shadow-lg bg-popover">
					<div className="grid grid-cols-6 gap-2">
						{TAILWIND_COLORS.map(color => (
							<button
								key={color.value}
								type="button"
								onClick={() => {
									onChange(color.value)
									setIsOpen(false)
								}}
								className={cn(
									'w-8 h-8 rounded border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring',
									color.class,
									value === color.value ? 'ring-2 ring-primary ring-offset-2' : 'border-border'
								)}
								title={color.name}
								aria-label={`Select ${color.name} color`}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
