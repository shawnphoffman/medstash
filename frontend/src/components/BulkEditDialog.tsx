import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from './ui/select'
import { Checkbox } from './ui/checkbox'
import { DatePicker } from './DatePicker'
import { receiptsApi, usersApi, receiptTypesApi, receiptTypeGroupsApi, flagsApi, BulkUpdateReceiptInput, User, ReceiptType, ReceiptTypeGroup, Flag } from '../lib/api'
import { useToast } from './ui/use-toast'
import { Flag as FlagIcon } from 'lucide-react'

interface BulkEditDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	selectedReceiptIds: number[]
	onSuccess: () => void
}

export default function BulkEditDialog({ open, onOpenChange, selectedReceiptIds, onSuccess }: BulkEditDialogProps) {
	const { toast } = useToast()
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	
	// Form state
	const [vendor, setVendor] = useState('')
	const [date, setDate] = useState<string | undefined>(undefined)
	const [userId, setUserId] = useState<number | undefined>(undefined)
	const [receiptTypeId, setReceiptTypeId] = useState<number | undefined>(undefined)
	const [selectedFlagIds, setSelectedFlagIds] = useState<number[]>([])
	const [flagOperation, setFlagOperation] = useState<'append' | 'replace'>('replace')
	
	// Data for dropdowns
	const [users, setUsers] = useState<User[]>([])
	const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([])
	const [receiptTypeGroups, setReceiptTypeGroups] = useState<ReceiptTypeGroup[]>([])
	const [flags, setFlags] = useState<Flag[]>([])

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
			const [usersRes, receiptTypesRes, groupsRes, flagsRes] = await Promise.all([
				usersApi.getAll(),
				receiptTypesApi.getAll(),
				receiptTypeGroupsApi.getAll(),
				flagsApi.getAll(),
			])
			setUsers(usersRes.data)
			setReceiptTypes(receiptTypesRes.data)
			setReceiptTypeGroups(groupsRes.data)
			setFlags(flagsRes.data)
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
		if (selectedFlagIds.length > 0) {
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

	const handleFlagToggle = (flagId: number, checked: boolean) => {
		if (checked) {
			setSelectedFlagIds(prev => [...prev, flagId])
		} else {
			setSelectedFlagIds(prev => prev.filter(id => id !== flagId))
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

				<div className="space-y-4 py-4">
					{error && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}

					{/* Vendor */}
					<div>
						<Label htmlFor="bulk-vendor">Vendor</Label>
						<Input
							id="bulk-vendor"
							value={vendor}
							onChange={e => setVendor(e.target.value)}
							placeholder="Leave empty to keep existing"
						/>
					</div>

					{/* Date */}
					<div>
						<Label htmlFor="bulk-date">Date</Label>
						<DatePicker
							id="bulk-date"
							value={date}
							onChange={setDate}
							placeholder="Leave empty to keep existing"
						/>
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
											onChange={() => setFlagOperation('replace')}
											className="h-4 w-4"
										/>
										<span className="text-sm">Replace</span>
									</label>
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="radio"
											checked={flagOperation === 'append'}
											onChange={() => setFlagOperation('append')}
											className="h-4 w-4"
										/>
										<span className="text-sm">Append</span>
									</label>
								</div>
							</div>
							<div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px]">
								{flags.length === 0 ? (
									<span className="text-sm text-muted-foreground">No flags available</span>
								) : (
									flags.map(flag => (
										<label
											key={flag.id}
											className="flex items-center gap-2 cursor-pointer p-2 rounded border hover:bg-muted transition-colors"
										>
											<Checkbox
												checked={selectedFlagIds.includes(flag.id)}
												onCheckedChange={checked => handleFlagToggle(flag.id, checked === true)}
											/>
											<FlagIcon
												className="size-4"
												style={flag.color ? { color: flag.color } : undefined}
											/>
											<span className="text-sm">{flag.name}</span>
										</label>
									))
								)}
							</div>
							<p className="text-xs text-muted-foreground">
								{flagOperation === 'replace' 
									? 'Selected flags will replace all existing flags'
									: 'Selected flags will be added to existing flags'}
							</p>
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={loading}>
						{loading ? 'Updating...' : 'Apply Changes'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
