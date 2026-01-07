import { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/utils'

// Predefined Tailwind colors with their hex values
// Using 500 shades which work well in both light and dark modes
export const TAILWIND_COLORS = [
	{ name: 'Red', value: '#ef4444', class: 'bg-red-600 text-white hover:bg-red-600' },
	{
		name: 'Orange',
		value: '#f97316',
		class: 'bg-orange-500 text-black hover:bg-orange-500',
	},
	{
		name: 'Amber',
		value: '#f59e0b',
		class: 'bg-amber-500 text-black hover:bg-amber-500',
	},
	{
		name: 'Yellow',
		value: '#eab308',
		class: 'bg-yellow-500 text-black hover:bg-yellow-500',
	},
	{
		name: 'Lime',
		value: '#84cc16',
		class: 'bg-lime-500 text-black hover:bg-lime-500',
	},
	{
		name: 'Green',
		value: '#22c55e',
		class: 'bg-green-500 text-black hover:bg-green-500',
	},
	{
		name: 'Emerald',
		value: '#10b981',
		class: 'bg-emerald-500 text-black hover:bg-emerald-500',
	},
	{
		name: 'Teal',
		value: '#14b8a6',
		class: 'bg-teal-500 text-black hover:bg-teal-500',
	},
	{
		name: 'Cyan',
		value: '#06b6d4',
		class: 'bg-cyan-500 text-black hover:bg-cyan-500',
	},
	{ name: 'Sky', value: '#0ea5e9', class: 'bg-sky-500 text-black hover:bg-sky-500' },
	{
		name: 'Blue',
		value: '#3b82f6',
		class: 'bg-blue-600 text-white hover:bg-blue-600',
	},
	{
		name: 'Indigo',
		value: '#6366f1',
		class: 'bg-indigo-500 text-black hover:bg-indigo-500',
	},
	{
		name: 'Violet',
		value: '#8b5cf6',
		class: 'bg-violet-500 text-black hover:bg-violet-500',
	},
	{ name: 'Purple', value: '#a855f7', class: 'bg-purple-500 text-black' },
	{
		name: 'Fuchsia',
		value: '#d946ef',
		class: 'bg-fuchsia-500 text-black hover:bg-fuchsia-500',
	},
	{
		name: 'Pink',
		value: '#ec4899',
		class: 'bg-pink-500 text-black hover:bg-pink-500',
	},
	{
		name: 'Rose',
		value: '#f43f5e',
		class: 'bg-rose-500 text-black hover:bg-rose-500',
	},
	{
		name: 'Slate',
		value: '#64748b',
		class: 'bg-slate-500 text-black hover:bg-slate-500',
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
		return 'bg-blue-500 text-black'
	}
	return color.class
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

	const selectedColor = TAILWIND_COLORS.find(c => c.value === value) || TAILWIND_COLORS[10] // Default to blue

	return (
		<div ref={containerRef} className={cn('relative', className)}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
			>
				<div className="w-6 h-6 border-2 rounded border-border" style={{ backgroundColor: value }} />
				<span className="text-sm text-muted-foreground">{selectedColor.name}</span>
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
