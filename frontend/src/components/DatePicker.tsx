import { useEffect, useMemo, useState } from 'react'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Calendar as CalendarIcon } from 'lucide-react'

interface DatePickerProps {
	value?: string // YYYY-MM-DD format
	onChange: (value: string) => void
	id?: string
	placeholder?: string
	className?: string
}

const parseDateString = (dateString: string) => {
	const [year, month, day] = dateString.split('-').map(Number)
	if (!year || !month || !day) return undefined
	const date = new Date(year, month - 1, day)
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
		return undefined
	}
	return date
}

const formatDateString = (date: Date) => {
	const year = date.getFullYear()
	const month = `${date.getMonth() + 1}`.padStart(2, '0')
	const day = `${date.getDate()}`.padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function DatePicker({ value, onChange, id, placeholder = 'YYYY-MM-DD', className }: DatePickerProps) {
	const [open, setOpen] = useState(false)
	const [inputValue, setInputValue] = useState(value || '')

	useEffect(() => {
		setInputValue(value || '')
	}, [value])

	const selectedDate = useMemo(() => (value ? parseDateString(value) : undefined), [value])

	const handleSelect = (date: Date | undefined) => {
		if (date) {
			const dateString = formatDateString(date)
			setInputValue(dateString)
			onChange(dateString)
			setOpen(false)
		}
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<div className="relative w-full">
				<Input
					id={id}
					placeholder={placeholder}
					value={inputValue}
					onChange={event => {
						const nextValue = event.target.value
						setInputValue(nextValue)
						if (nextValue === '') {
							onChange('')
							return
						}
						if (/^\d{4}-\d{2}-\d{2}$/.test(nextValue)) {
							const parsed = parseDateString(nextValue)
							if (parsed) {
								const normalized = formatDateString(parsed)
								setInputValue(normalized)
								onChange(normalized)
							}
						}
					}}
					onBlur={() => {
						if (!inputValue) return
						const parsed = parseDateString(inputValue)
						if (!parsed) {
							setInputValue(value || '')
							return
						}
						const normalized = formatDateString(parsed)
						if (normalized !== inputValue) {
							setInputValue(normalized)
							onChange(normalized)
						}
					}}
					className={`pr-10 ${className || ''}`}
				/>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="absolute right-1 top-1/2 -translate-y-1/2"
						aria-label="Open calendar"
					>
						<CalendarIcon className="w-4 h-4 text-muted-foreground" />
					</Button>
				</PopoverTrigger>
			</div>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={selectedDate}
					onSelect={handleSelect}
					initialFocus
				/>
			</PopoverContent>
		</Popover>
	)
}
