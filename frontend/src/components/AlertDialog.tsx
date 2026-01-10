import React, { useState, useCallback } from 'react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'

interface AlertDialogOptions {
	title?: string
	message: string
	buttonText?: string
}

type AlertDialogResolve = () => void

let alertDialogResolve: AlertDialogResolve | null = null

const AlertDialogComponent: React.FC<{
	open: boolean
	onOpenChange: (open: boolean) => void
	options: AlertDialogOptions
	onClose: () => void
}> = ({ open, onOpenChange, options, onClose }) => {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{options.title}</DialogTitle>
					<DialogDescription>{options.message}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button onClick={onClose}>{options.buttonText}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export function useAlertDialog() {
	const [open, setOpen] = useState(false)
	const [options, setOptions] = useState<AlertDialogOptions>({
		message: '',
		title: 'Alert',
		buttonText: 'OK',
	})

	const alert = useCallback((opts: AlertDialogOptions | string): Promise<void> => {
		return new Promise<void>(resolve => {
			const dialogOptions: AlertDialogOptions =
				typeof opts === 'string'
					? { message: opts, title: 'Alert', buttonText: 'OK' }
					: {
							title: opts.title || 'Alert',
							message: opts.message,
							buttonText: opts.buttonText || 'OK',
					  }
			setOptions(dialogOptions)
			alertDialogResolve = resolve
			setOpen(true)
		})
	}, [])

	const handleClose = useCallback(() => {
		setOpen(false)
		if (alertDialogResolve) {
			alertDialogResolve()
			alertDialogResolve = null
		}
	}, [])

	return {
		alert,
		AlertDialog: (
			<AlertDialogComponent
				open={open}
				onOpenChange={setOpen}
				options={options}
				onClose={handleClose}
			/>
		),
	}
}
