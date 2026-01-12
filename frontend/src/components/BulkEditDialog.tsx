import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from './ui/select'
import { DatePicker } from './DatePicker'
import {
	receiptsApi,
	usersApi,
	receiptTypesApi,
	receiptTypeGroupsApi,
	flagsApi,
	BulkUpdateReceiptInput,
	User,
	ReceiptType,
	ReceiptTypeGroup,
	Flag,
} from '../lib/api'
import { useToast } from './ui/use-toast'
import { getBadgeClassName, getBorderClassName } from './ui/color-picker'
import { cn } from '../lib/utils'
import { Trash2 } from 'lucide-react'
import { useConfirmDialog } from './ConfirmDialog'

interface BulkEditDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	selectedReceiptIds: number[]
	onSuccess: () => void
}

export default function BulkEditDialog({ open, onOpenChange, selectedReceiptIds, onSuccess }: BulkEditDialogProps) {
	const { toast } = useToast()
	const { confirm, ConfirmDialog } = useConfirmDialog()
	const [loading, setLoading] = useState(false)
	const [deleting, setDeleting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Form state
	const [vendor, setVendor] = useState('')
	const [date, setDate] = useState<string | undefined>(undefined)
	const [userId, setUserId] = useState<number | undefined>(undefined)
	const [receiptTypeId, setReceiptTypeId] = useState<number | undefined>(undefined)
	const [selectedFlagIds, setSelectedFlagIds] = useState<number[]>([])
	const [flagOperation, setFlagOperation] = useState<'append' | 'replace' | 'remove_all'>('replace')

	// Data for dropdowns
	const [users, setUsers] = useState<User[]>([])
	const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([])
	const [receiptTypeGroups, setReceiptTypeGroups] = useState<ReceiptTypeGroup[]>([])
	const [flags, setFlags] = useState<Flag[]>([])
	const [quickVendors, setQuickVendors] = useState<Array<{ vendor: string; count: number }>>([])

	// Load data when dialog opens
	useEffect(() => {
		if (open) {
			loadData()
			// Reset form
			setVendor('')
			setDate(undefined)
			setUserId(undefined)
			setReceiptTypeId(undefined)
			setSelectedFlagIds([])
			setFlagOperation('replace')
			setError(null)
		}
	}, [open])

	const loadData = async () => {
		try {
			const [usersRes, receiptTypesRes, groupsRes, flagsRes, vendorsRes] = await Promise.all([
				usersApi.getAll(),
				receiptTypesApi.getAll(),
				receiptTypeGroupsApi.getAll(),
				flagsApi.getAll(),
				receiptsApi.getFrequentVendors().catch(() => ({ data: [] })),
			])
			setUsers(usersRes.data)
			setReceiptTypes(receiptTypesRes.data)
			setReceiptTypeGroups(groupsRes.data)
			setFlags(flagsRes.data)
			setQuickVendors(vendorsRes.data)
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to load data')
		}
	}

	const handleSubmit = async () => {
		if (selectedReceiptIds.length === 0) {
			setError('No receipts selected')
			return
		}

		// Build update data with only fields that have values
		const updateData: BulkUpdateReceiptInput = {}

		if (vendor.trim()) {
			updateData.vendor = vendor.trim()
		}
		if (date) {
			updateData.date = date
		}
		if (userId !== undefined) {
			updateData.user_id = userId
		}
		if (receiptTypeId !== undefined) {
			updateData.receipt_type_id = receiptTypeId
		}
		if (flagOperation === 'remove_all') {
			// Remove all flags by sending empty array with replace operation
			updateData.flag_ids = []
			updateData.flag_operation = 'replace'
		} else if (selectedFlagIds.length > 0) {
			updateData.flag_ids = selectedFlagIds
			updateData.flag_operation = flagOperation
		}

		// Check if there's anything to update
		if (Object.keys(updateData).length === 0) {
			setError('Please fill in at least one field to update')
			return
		}

		setLoading(true)
		setError(null)

		try {
			const response = await receiptsApi.bulkUpdate(selectedReceiptIds, updateData)
			const { updated, errors } = response.data

			if (errors && errors.length > 0) {
				// Some receipts failed, but show success for the ones that worked
				toast({
					title: 'Partial Success',
					description: `Updated ${updated} receipt(s). ${errors.length} receipt(s) failed to update.`,
					variant: 'default',
				})
			} else {
				toast({
					title: 'Success',
					description: `Successfully updated ${updated} receipt(s).`,
				})
			}

			onSuccess()
			onOpenChange(false)
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to update receipts')
		} finally {
			setLoading(false)
		}
	}

	const toggleFlag = (flagId: number) => {
		if (flagOperation === 'remove_all') {
			// Don't allow flag selection when remove_all is selected
			return
		}
		setSelectedFlagIds(prev => {
			if (prev.includes(flagId)) {
				return prev.filter(id => id !== flagId)
			} else {
				return [...prev, flagId]
			}
		})
	}

	const handleFlagOperationChange = (operation: 'append' | 'replace' | 'remove_all') => {
		setFlagOperation(operation)
		if (operation === 'remove_all') {
			// Clear selected flags when switching to remove_all
			setSelectedFlagIds([])
		}
	}

	const handleDelete = async () => {
		if (selectedReceiptIds.length === 0) {
			setError('No receipts selected')
			return
		}

		const confirmed = await confirm({
			title: 'Delete Receipts',
			message: `Are you sure you want to delete ${selectedReceiptIds.length} receipt(s)? This action cannot be undone.`,
			variant: 'destructive',
			confirmText: 'Delete',
			cancelText: 'Cancel',
		})

		if (!confirmed) return

		setDeleting(true)
		setError(null)

		try {
			// Delete receipts one by one
			const errors: Array<{ id: number; error: string }> = []
			let deletedCount = 0

			for (const receiptId of selectedReceiptIds) {
				try {
					await receiptsApi.delete(receiptId)
					deletedCount++
				} catch (err: any) {
					errors.push({
						id: receiptId,
						error: err.response?.data?.error || 'Failed to delete receipt',
					})
				}
			}

			if (errors.length > 0) {
				toast({
					title: 'Partial Success',
					description: `Deleted ${deletedCount} receipt(s). ${errors.length} receipt(s) failed to delete.`,
					variant: 'default',
				})
			} else {
				toast({
					title: 'Success',
					description: `Successfully deleted ${deletedCount} receipt(s).`,
				})
			}

			onSuccess()
			onOpenChange(false)
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to delete receipts')
		} finally {
			setDeleting(false)
		}
	}

	// Organize receipt types by group
	const groupedTypes: Record<number | 'ungrouped', ReceiptType[]> = { ungrouped: [] }
	const sortedGroups = [...receiptTypeGroups].sort((a, b) => {
		if (a.display_order !== b.display_order) return a.display_order - b.display_order
		return a.name.localeCompare(b.name)
	})

	sortedGroups.forEach(group => {
		groupedTypes[group.id] = []
	})

	receiptTypes.forEach(type => {
		if (type.group_id) {
			if (!groupedTypes[type.group_id]) {
				groupedTypes[type.group_id] = []
			}
			groupedTypes[type.group_id].push(type)
		} else {
			groupedTypes.ungrouped.push(type)
		}
	})

	// Sort types within each group
	Object.keys(groupedTypes).forEach(key => {
		groupedTypes[key as number | 'ungrouped'].sort((a, b) => {
			if (a.display_order !== b.display_order) return a.display_order - b.display_order
			return a.name.localeCompare(b.name)
		})
	})

	const hasGroups = sortedGroups.length > 0 && sortedGroups.some(g => groupedTypes[g.id]?.length > 0)
	const hasUngrouped = groupedTypes.ungrouped.length > 0

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Bulk Edit Receipts</DialogTitle>
					<DialogDescription>
						Update {selectedReceiptIds.length} selected receipt(s). Leave fields empty to keep existing values.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4 space-y-4">
					{error && <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive">{error}</div>}

					{/* Vendor */}
					<div>
						<Label htmlFor="bulk-vendor">Vendor</Label>
						<Input id="bulk-vendor" value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Leave empty to keep existing" />
						{quickVendors.length > 0 && (
							<div className="mt-2">
								<div className="flex flex-wrap gap-2">
									{quickVendors.map((item, index) => (
										<Button
											key={index}
											type="button"
											variant="outline"
											size="sm"
											onClick={() => setVendor(item.vendor)}
											className="text-xs"
										>
											{item.vendor}
										</Button>
									))}
								</div>
							</div>
						)}
					</div>

					{/* Date */}
					<div>
						<Label htmlFor="bulk-date">Date</Label>
						<DatePicker id="bulk-date" value={date} onChange={setDate} placeholder="Leave empty to keep existing" />
					</div>

					{/* User */}
					<div>
						<Label htmlFor="bulk-user">User</Label>
						<Select
							value={userId?.toString() || '__none__'}
							onValueChange={value => setUserId(value === '__none__' ? undefined : parseInt(value))}
						>
							<SelectTrigger id="bulk-user">
								<SelectValue placeholder="Leave empty to keep existing" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none__">None (keep existing)</SelectItem>
								{users.map(user => (
									<SelectItem key={user.id} value={user.id.toString()}>
										{user.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Receipt Type */}
					<div>
						<Label htmlFor="bulk-type">Receipt Type</Label>
						<Select
							value={receiptTypeId?.toString() || '__none__'}
							onValueChange={value => setReceiptTypeId(value === '__none__' ? undefined : parseInt(value))}
						>
							<SelectTrigger id="bulk-type">
								<SelectValue placeholder="Leave empty to keep existing" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none__">None (keep existing)</SelectItem>
								{hasGroups || hasUngrouped ? (
									<>
										{sortedGroups.map(group => {
											const typesInGroup = groupedTypes[group.id] || []
											if (typesInGroup.length === 0) return null
											return (
												<SelectGroup key={group.id}>
													<SelectLabel>{group.name}</SelectLabel>
													{typesInGroup.map(type => (
														<SelectItem key={type.id} value={type.id.toString()}>
															{type.name}
														</SelectItem>
													))}
												</SelectGroup>
											)
										})}
										{hasUngrouped && (
											<SelectGroup>
												<SelectLabel>Other</SelectLabel>
												{groupedTypes.ungrouped.map(type => (
													<SelectItem key={type.id} value={type.id.toString()}>
														{type.name}
													</SelectItem>
												))}
											</SelectGroup>
										)}
									</>
								) : (
									receiptTypes.map(type => (
										<SelectItem key={type.id} value={type.id.toString()}>
											{type.name}
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
					</div>

					{/* Flags */}
					{flags.length > 0 && (
						<div>
							<Label>Flags</Label>
							<div className="space-y-3">
								<div className="flex items-center gap-4">
									<Label className="text-sm font-normal">Operation:</Label>
									<div className="flex gap-4">
										<label className="flex items-center gap-2 cursor-pointer">
											<input
												type="radio"
												checked={flagOperation === 'replace'}
												onChange={() => handleFlagOperationChange('replace')}
												className="w-4 h-4"
											/>
											<span className="text-sm">Replace</span>
										</label>
										<label className="flex items-center gap-2 cursor-pointer">
											<input
												type="radio"
												checked={flagOperation === 'append'}
												onChange={() => handleFlagOperationChange('append')}
												className="w-4 h-4"
											/>
											<span className="text-sm">Append</span>
										</label>
										<label className="flex items-center gap-2 cursor-pointer">
											<input
												type="radio"
												checked={flagOperation === 'remove_all'}
												onChange={() => handleFlagOperationChange('remove_all')}
												className="w-4 h-4"
											/>
											<span className="text-sm">Remove All</span>
										</label>
									</div>
								</div>
								<div className="flex flex-wrap gap-2 mt-2">
									{flags.map(flag => (
										<Button
											key={flag.id}
											type="button"
											variant="outline"
											size="sm"
											onClick={() => toggleFlag(flag.id)}
											disabled={flagOperation === 'remove_all'}
											className={
												flag.color
													? cn(selectedFlagIds.includes(flag.id) && getBadgeClassName(flag.color), getBorderClassName(flag.color))
													: undefined
											}
										>
											{flag.name}
										</Button>
									))}
								</div>
								<p className="text-xs text-muted-foreground">
									{flagOperation === 'replace'
										? 'Selected flags will replace all existing flags'
										: flagOperation === 'append'
											? 'Selected flags will be added to existing flags'
											: 'All flags will be removed from selected receipts'}
								</p>
							</div>
						</div>
					)}
				</div>

				<DialogFooter className="flex items-center justify-between">
					<Button variant="destructive" onClick={handleDelete} disabled={loading || deleting}>
						<Trash2 className="mr-1 size-4" />
						{deleting ? 'Deleting...' : 'Delete'}
					</Button>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || deleting}>
							Cancel
						</Button>
						<Button onClick={handleSubmit} disabled={loading || deleting}>
							{loading ? 'Updating...' : 'Apply Changes'}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
			{ConfirmDialog}
		</Dialog>
	)
}
