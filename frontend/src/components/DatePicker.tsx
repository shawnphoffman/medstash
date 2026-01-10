import { useState } from 'react'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Button } from './ui/button'
import { ChevronDown } from 'lucide-react'

interface DatePickerProps {
	value?: string // YYYY-MM-DD format
	onChange: (value: string) => void
	id?: string
	placeholder?: string
	className?: string
}

export function DatePicker({ value, onChange, id, placeholder = 'Select date', className }: DatePickerProps) {
	const [open, setOpen] = useState(false)

	const handleSelect = (date: Date | undefined) => {
		if (date) {
			const dateString = date.toISOString().split('T')[0]
			onChange(dateString)
			setOpen(false)
		}
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					id={id}
					className={`justify-between w-full font-normal text-muted-foreground hover:bg-transparent ${
						value ? 'text-foreground' : 'text-muted-foreground hover:text-muted-foreground'
					} ${className || ''}`}
				>
					{value ? new Date(value).toLocaleDateString() : placeholder}
					<ChevronDown className="w-4 h-4 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={value ? new Date(value) : undefined}
					onSelect={handleSelect}
					initialFocus
				/>
			</PopoverContent>
		</Popover>
	)
}
