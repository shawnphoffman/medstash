import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'

interface ConfirmDialogOptions {
	title?: string
	message: string
	confirmText?: string
	cancelText?: string
	variant?: 'default' | 'destructive'
}

type ConfirmDialogResolve = (value: boolean) => void

let confirmDialogResolve: ConfirmDialogResolve | null = null

const ConfirmDialogComponent: React.FC<{
	open: boolean
	onOpenChange: (open: boolean) => void
	options: ConfirmDialogOptions
	onConfirm: () => void
	onCancel: () => void
}> = ({ open, onOpenChange, options, onConfirm, onCancel }) => {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{options.title}</DialogTitle>
					<DialogDescription>{options.message}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Button variant="outline" onClick={onCancel}>
							{options.cancelText}
						</Button>
						<Button variant={options.variant === 'destructive' ? 'destructive' : 'default'} onClick={onConfirm}>
							{options.confirmText}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export function useConfirmDialog() {
	const [open, setOpen] = useState(false)
	const [options, setOptions] = useState<ConfirmDialogOptions>({
		message: '',
		title: 'Confirm',
		confirmText: 'Confirm',
		cancelText: 'Cancel',
		variant: 'default',
	})

	const confirm = useCallback((opts: ConfirmDialogOptions): Promise<boolean> => {
		return new Promise<boolean>(resolve => {
			setOptions({
				title: opts.title || 'Confirm',
				message: opts.message,
				confirmText: opts.confirmText || 'Confirm',
				cancelText: opts.cancelText || 'Cancel',
				variant: opts.variant || 'default',
			})
			confirmDialogResolve = resolve
			setOpen(true)
		})
	}, [])

	const handleConfirm = useCallback(() => {
		setOpen(false)
		if (confirmDialogResolve) {
			confirmDialogResolve(true)
			confirmDialogResolve = null
		}
	}, [])

	const handleCancel = useCallback(() => {
		setOpen(false)
		if (confirmDialogResolve) {
			confirmDialogResolve(false)
			confirmDialogResolve = null
		}
	}, [])

	return {
		confirm,
		ConfirmDialog: (
			<ConfirmDialogComponent open={open} onOpenChange={setOpen} options={options} onConfirm={handleConfirm} onCancel={handleCancel} />
		),
	}
}
