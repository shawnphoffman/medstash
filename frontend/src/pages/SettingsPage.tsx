import React, { useState, useEffect, useMemo } from 'react'
import {
	flagsApi,
	settingsApi,
	filenamesApi,
	usersApi,
	receiptTypesApi,
	receiptTypeGroupsApi,
	exportApi,
	watchApi,
	receiptsApi,
	imagesApi,
	Flag,
	User,
	ReceiptType,
	ReceiptTypeGroup,
} from '../lib/api'
import { DEFAULT_RECEIPT_TYPE_GROUPS, DEFAULT_UNGROUPED_TYPES } from '../lib/defaults'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { ColorPicker, TAILWIND_COLORS } from '../components/ui/color-picker'
import { FlagBadge } from '../components/FlagBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useConfirmDialog } from '../components/ConfirmDialog'
import { useAlertDialog } from '../components/AlertDialog'
import {
	Plus,
	Trash2,
	Edit2,
	Save,
	X,
	RefreshCw,
	Info,
	Flag as FlagIcon,
	RotateCcw,
	GripVertical,
	Download,
	FolderTree,
	Image as ImageIcon,
} from 'lucide-react'
import {
	DndContext,
	rectIntersection,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
	DragOverlay,
	DragStartEvent,
	useDroppable,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const DEFAULT_FILENAME_PATTERN = '{date}_{user}_{vendor}_{amount}_{type}_{index}'

// Sortable Group Component
function SortableGroup({
	group,
	editingGroup,
	editGroupName,
	setEditGroupName,
	onEdit,
	onSave,
	onCancel,
	onDelete,
	dragOverId,
	hasChanged,
	children,
}: {
	group: ReceiptTypeGroup
	editingGroup: number | null
	editGroupName: string
	setEditGroupName: (name: string) => void
	onEdit: () => void
	onSave: () => void
	onCancel: () => void
	onDelete: () => void
	dragOverId: string | null
	hasChanged: boolean
	children: React.ReactNode
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `group-${group.id}` })
	const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: `group-drop-${group.id}` })

	// Use dragOverId from parent to show dropzone when hovering over types in this group
	const isDragOver = isOver || dragOverId === `group-drop-${group.id}`

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	}

	return (
		<div ref={setNodeRef} style={style} className={`rounded-lg ${hasChanged ? 'border-2 border-dashed border-amber-500/50' : 'border'}`}>
			<div className="flex items-center justify-between p-1.5 bg-muted/50 border-b">
				{editingGroup === group.id ? (
					<div className="flex items-center flex-1 gap-2">
						<Input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} className="flex-1" />
						<Button size="icon" variant="ghost" onClick={onSave}>
							<Save className="size-4" />
						</Button>
						<Button size="icon" variant="ghost" onClick={onCancel}>
							<X className="size-4" />
						</Button>
					</div>
				) : (
					<>
						<div className="flex items-center flex-1 gap-2">
							<button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
								<GripVertical className="size-4 text-muted-foreground" />
							</button>
							<h3 className="font-semibold">{group.name}</h3>
						</div>
						<div className="flex gap-2">
							<Button size="icon" variant="ghost" onClick={onEdit}>
								<Edit2 className="size-4" />
							</Button>
							<Button size="icon" variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive">
								<Trash2 className="size-4" />
							</Button>
						</div>
					</>
				)}
			</div>
			<div
				ref={setDroppableRef}
				className={`p-3 space-y-2 min-h-[60px] pointer-events-auto ${
					isDragOver ? 'bg-primary/10 border-2 border-primary border-dashed' : ''
				}`}
			>
				{children}
			</div>
		</div>
	)
}

// Sortable Type Component
function SortableType({
	type,
	editingReceiptType,
	editReceiptTypeName,
	setEditReceiptTypeName,
	onEdit,
	onSave,
	onCancel,
	onDelete,
}: {
	type: ReceiptType
	editingReceiptType: number | null
	editReceiptTypeName: string
	setEditReceiptTypeName: (name: string) => void
	onEdit: () => void
	onSave: () => void
	onCancel: () => void
	onDelete: () => void
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `type-${type.id}` })

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	}

	return (
		<div ref={setNodeRef} style={style} className="flex items-center justify-between px-2 py-1 border rounded">
			{editingReceiptType === type.id ? (
				<div className="flex items-center flex-1 gap-2">
					<Input value={editReceiptTypeName} onChange={e => setEditReceiptTypeName(e.target.value)} className="flex-1" />
					<Button size="icon" variant="ghost" onClick={onSave}>
						<Save className="size-4" />
					</Button>
					<Button size="icon" variant="ghost" onClick={onCancel}>
						<X className="size-4" />
					</Button>
				</div>
			) : (
				<>
					<div className="flex items-center flex-1 gap-2">
						<button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
							<GripVertical className="size-4 text-muted-foreground" />
						</button>
						<span className="font-medium">{type.name}</span>
					</div>
					<div className="flex gap-2">
						<Button size="icon" variant="ghost" onClick={onEdit}>
							<Edit2 className="size-4" />
						</Button>
						<Button size="icon" variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive">
							<Trash2 className="size-4" />
						</Button>
					</div>
				</>
			)}
		</div>
	)
}

// Ungrouped Section Component
function UngroupedSection({
	types,
	editingReceiptType,
	editReceiptTypeName,
	setEditReceiptTypeName,
	onEditType,
	onSaveType,
	onCancelEdit,
	onDeleteType,
	dragOverId,
	hasChanged,
}: {
	types: ReceiptType[]
	editingReceiptType: number | null
	editReceiptTypeName: string
	setEditReceiptTypeName: (name: string) => void
	onEditType: (type: ReceiptType) => void
	onSaveType: (id: number) => void
	onCancelEdit: () => void
	onDeleteType: (id: number) => void
	dragOverId: string | null
	hasChanged: boolean
}) {
	const { setNodeRef, isOver } = useDroppable({ id: 'ungrouped' })
	const isDragOver = isOver || dragOverId === 'ungrouped'

	if (types.length === 0 && !isDragOver) {
		return (
			<div
				ref={setNodeRef}
				className={`rounded-lg pointer-events-auto ${
					isDragOver
						? 'bg-primary/10 border-2 border-primary border-dashed'
						: hasChanged
						? 'border-2 border-dashed border-amber-500/50'
						: 'border'
				}`}
			>
				<div className="p-3 border-b bg-muted/50">
					<h3 className="font-semibold">Ungrouped</h3>
				</div>
				<div className="py-8 text-sm text-center border-2 border-dashed text-muted-foreground">Drop types here</div>
			</div>
		)
	}

	return (
		<div
			ref={setNodeRef}
			className={`rounded-lg pointer-events-auto ${
				isDragOver
					? 'bg-primary/10 border-2 border-primary border-dashed'
					: hasChanged
					? 'border-2 border-dashed border-amber-500/50'
					: 'border'
			}`}
		>
			<div className="p-3 border-b bg-muted/50">
				<h3 className="font-semibold">Ungrouped</h3>
			</div>
			<div className="p-3 space-y-1">
				<SortableContext items={types.map(t => `type-${t.id}`)} strategy={verticalListSortingStrategy}>
					{types.map(type => (
						<SortableType
							key={type.id}
							type={type}
							editingReceiptType={editingReceiptType}
							editReceiptTypeName={editReceiptTypeName}
							setEditReceiptTypeName={setEditReceiptTypeName}
							onEdit={() => onEditType(type)}
							onSave={() => onSaveType(type.id)}
							onCancel={onCancelEdit}
							onDelete={() => onDeleteType(type.id)}
						/>
					))}
				</SortableContext>
			</div>
		</div>
	)
}

export default function SettingsPage() {
	const [flags, setFlags] = useState<Flag[]>([])
	const [users, setUsers] = useState<User[]>([])
	const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([])
	const [receiptTypeGroups, setReceiptTypeGroups] = useState<ReceiptTypeGroup[]>([])
	const [originalReceiptTypes, setOriginalReceiptTypes] = useState<ReceiptType[]>([])
	const [originalReceiptTypeGroups, setOriginalReceiptTypeGroups] = useState<ReceiptTypeGroup[]>([])
	const [loading, setLoading] = useState(true)
	const [editingFlag, setEditingFlag] = useState<number | null>(null)
	const [editingUser, setEditingUser] = useState<number | null>(null)
	const [editingReceiptType, setEditingReceiptType] = useState<number | null>(null)
	const [editingGroup, setEditingGroup] = useState<number | null>(null)
	const [newFlagName, setNewFlagName] = useState('')
	const [newFlagColor, setNewFlagColor] = useState<string>(TAILWIND_COLORS[0].value)
	const [editFlagName, setEditFlagName] = useState('')
	const [editFlagColor, setEditFlagColor] = useState('')
	const [editUserName, setEditUserName] = useState('')
	const [editReceiptTypeName, setEditReceiptTypeName] = useState('')
	const [editReceiptTypeGroupId, setEditReceiptTypeGroupId] = useState<number | null>(null)
	const [editGroupName, setEditGroupName] = useState('')
	const [newUser, setNewUser] = useState('')
	const [newReceiptType, setNewReceiptType] = useState('')
	const [newReceiptTypeGroupId, setNewReceiptTypeGroupId] = useState<number | null>(null)
	const [newGroupName, setNewGroupName] = useState('')
	const [activeId, setActiveId] = useState<string | null>(null)
	const [dragOverId, setDragOverId] = useState<string | null>(null)
	const [isSavingTypes, setIsSavingTypes] = useState(false)
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	)
	const [filenamePattern, setFilenamePattern] = useState(DEFAULT_FILENAME_PATTERN)
	const [originalPattern, setOriginalPattern] = useState(DEFAULT_FILENAME_PATTERN)
	const [patternError, setPatternError] = useState<string | null>(null)
	const [isRenaming, setIsRenaming] = useState(false)
	const [isOrganizing, setIsOrganizing] = useState(false)
	const [processedFileCount, setProcessedFileCount] = useState<number | null>(null)
	const [isLoadingProcessedCount, setIsLoadingProcessedCount] = useState(false)
	const [isDeletingProcessed, setIsDeletingProcessed] = useState(false)
	const [isOptimizing, setIsOptimizing] = useState(false)
	const [isReoptimizing, setIsReoptimizing] = useState(false)
	const [imageOptimizationEnabled, setImageOptimizationEnabled] = useState(true)
	const [optimizationResult, setOptimizationResult] = useState<{
		total: number
		optimized: number
		skipped: number
		errors: Array<{ fileId: number; error: string }>
		duration: number
	} | null>(null)
	const [error, setError] = useState<string | null>(null)
	const { confirm, ConfirmDialog } = useConfirmDialog()
	const { alert, AlertDialog } = useAlertDialog()
	const [quickVendors, setQuickVendors] = useState<Array<{ vendor: string; count: number }>>([])
	const [excludedQuickVendors, setExcludedQuickVendors] = useState<string[]>([])
	const [customQuickVendors, setCustomQuickVendors] = useState<string[]>([])
	// const [newCustomVendor, setNewCustomVendor] = useState('')
	const [isLoadingQuickVendors, setIsLoadingQuickVendors] = useState(false)

	useEffect(() => {
		loadData()
		loadProcessedCount()
		loadQuickVendors()
	}, [])

	const loadProcessedCount = async () => {
		try {
			setIsLoadingProcessedCount(true)
			const response = await watchApi.getProcessedCount()
			setProcessedFileCount(response.data.count)
		} catch (err: any) {
			// Don't show error, just leave count as null
			console.error('Failed to load processed file count:', err)
		} finally {
			setIsLoadingProcessedCount(false)
		}
	}

	const loadData = async () => {
		try {
			setLoading(true)
			const [flagsRes, usersRes, receiptTypesRes, groupsRes, settingsRes] = await Promise.all([
				flagsApi.getAll(),
				usersApi.getAll(),
				receiptTypesApi.getAll(),
				receiptTypeGroupsApi.getAll(),
				settingsApi.getAll(),
			])
			setFlags(flagsRes.data)
			setUsers(usersRes.data)
			setReceiptTypes(receiptTypesRes.data)
			setReceiptTypeGroups(groupsRes.data)
			// Store original state for comparison
			setOriginalReceiptTypes(receiptTypesRes.data)
			setOriginalReceiptTypeGroups(groupsRes.data)
			// Load filename pattern
			const pattern = settingsRes.data?.filenamePattern || DEFAULT_FILENAME_PATTERN
			setFilenamePattern(pattern)
			setOriginalPattern(pattern)
			// Load image optimization setting (defaults to true if not set)
			const optimizationEnabled = settingsRes.data?.imageOptimizationEnabled !== false
			setImageOptimizationEnabled(optimizationEnabled)
			// Load excluded quick vendors
			const excluded = settingsRes.data?.excludedQuickVendors || []
			setExcludedQuickVendors(Array.isArray(excluded) ? excluded : [])
			// Load custom quick vendors
			const custom = settingsRes.data?.customQuickVendors || []
			setCustomQuickVendors(Array.isArray(custom) ? custom : [])
			setHasUnsavedChanges(false)
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to load settings')
		} finally {
			setLoading(false)
		}
	}

	const loadQuickVendors = async () => {
		try {
			setIsLoadingQuickVendors(true)
			const response = await receiptsApi.getFrequentVendors()
			setQuickVendors(response.data)
		} catch (err: any) {
			console.error('Failed to load quick vendors:', err)
		} finally {
			setIsLoadingQuickVendors(false)
		}
	}

	const handleExcludeVendor = async (vendor: string) => {
		try {
			const newExcluded = [...excludedQuickVendors, vendor]
			await settingsApi.set('excludedQuickVendors', newExcluded)
			setExcludedQuickVendors(newExcluded)
			// Refresh quick vendors list
			await loadQuickVendors()
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to exclude vendor')
		}
	}

	const handleRemoveExclusion = async (vendor: string) => {
		try {
			const newExcluded = excludedQuickVendors.filter(v => v.toLowerCase() !== vendor.toLowerCase())
			await settingsApi.set('excludedQuickVendors', newExcluded)
			setExcludedQuickVendors(newExcluded)
			// Refresh quick vendors list
			await loadQuickVendors()
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to remove exclusion')
		}
	}

	// const handleAddCustomVendor = async () => {
	// 	if (!newCustomVendor.trim()) {
	// 		setError('Vendor name is required')
	// 		return
	// 	}
	// 	const vendorName = newCustomVendor.trim()
	// 	// Check for duplicates (case-insensitive)
	// 	if (customQuickVendors.some(v => v.toLowerCase() === vendorName.toLowerCase())) {
	// 		setError('This vendor is already in your custom list')
	// 		return
	// 	}
	// 	// Check if it's already in excluded list
	// 	if (excludedQuickVendors.some(v => v.toLowerCase() === vendorName.toLowerCase())) {
	// 		setError('This vendor is excluded. Remove the exclusion first.')
	// 		return
	// 	}
	// 	try {
	// 		const newCustom = [...customQuickVendors, vendorName]
	// 		await settingsApi.set('customQuickVendors', newCustom)
	// 		setCustomQuickVendors(newCustom)
	// 		setNewCustomVendor('')
	// 		// Refresh quick vendors list
	// 		await loadQuickVendors()
	// 	} catch (err: any) {
	// 		setError(err.response?.data?.error || 'Failed to add custom vendor')
	// 	}
	// }

	// const handleRemoveCustomVendor = async (vendor: string) => {
	// 	try {
	// 		const newCustom = customQuickVendors.filter(v => v.toLowerCase() !== vendor.toLowerCase())
	// 		await settingsApi.set('customQuickVendors', newCustom)
	// 		setCustomQuickVendors(newCustom)
	// 		// Refresh quick vendors list
	// 		await loadQuickVendors()
	// 	} catch (err: any) {
	// 		setError(err.response?.data?.error || 'Failed to remove custom vendor')
	// 	}
	// }

	const loadFlags = async () => {
		try {
			const res = await flagsApi.getAll()
			setFlags(res.data)
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to load flags')
		}
	}

	const handleCreateFlag = async () => {
		if (!newFlagName.trim()) {
			setError('Flag name is required')
			return
		}

		try {
			await flagsApi.create({ name: newFlagName.trim(), color: newFlagColor })
			setNewFlagName('')
			setNewFlagColor('#3b82f6')
			await loadFlags()
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to create flag')
		}
	}

	const handleUpdateFlag = async (id: number) => {
		if (!editFlagName.trim()) {
			setError('Flag name is required')
			return
		}

		try {
			await flagsApi.update(id, {
				name: editFlagName.trim(),
				color: editFlagColor || undefined,
			})
			setEditingFlag(null)
			setEditFlagName('')
			setEditFlagColor('')
			await loadFlags()
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to update flag')
		}
	}

	const handleDeleteFlag = async (id: number) => {
		const confirmed = await confirm({
			message: 'Are you sure you want to delete this flag?',
			variant: 'destructive',
		})
		if (!confirmed) return

		try {
			await flagsApi.delete(id)
			await loadFlags()
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to delete flag')
		}
	}

	const startEdit = (flag: Flag) => {
		setEditingFlag(flag.id)
		setEditFlagName(flag.name)
		setEditFlagColor(flag.color || '#3b82f6')
	}

	const cancelEdit = () => {
		setEditingFlag(null)
		setEditFlagName('')
		setEditFlagColor('')
	}

	const handleAddUser = async () => {
		if (!newUser.trim()) {
			setError('User name is required')
			return
		}
		if (users.some(u => u.name === newUser.trim())) {
			setError('User already exists')
			return
		}

		try {
			const newUserData = await usersApi.create({ name: newUser.trim() })
			setUsers([...users, newUserData.data])
			setNewUser('')
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to add user')
		}
	}

	const handleUpdateUser = async (id: number) => {
		if (!editUserName.trim()) {
			setError('User name is required')
			return
		}

		try {
			const updatedUser = await usersApi.update(id, { name: editUserName.trim() })
			setUsers(users.map(u => (u.id === id ? updatedUser.data : u)))
			setEditingUser(null)
			setEditUserName('')
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to update user')
		}
	}

	const handleDeleteUser = async (id: number) => {
		const user = users.find(u => u.id === id)
		const confirmed = await confirm({
			message: `Are you sure you want to delete user "${user?.name}"?`,
			variant: 'destructive',
		})
		if (!confirmed) return

		try {
			await usersApi.delete(id)
			setUsers(users.filter(u => u.id !== id))
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to delete user')
		}
	}

	const startEditUser = (user: User) => {
		setEditingUser(user.id)
		setEditUserName(user.name)
	}

	const cancelEditUser = () => {
		setEditingUser(null)
		setEditUserName('')
	}

	// Group management functions
	const handleCreateGroup = async (e?: React.MouseEvent | React.KeyboardEvent) => {
		if (e) {
			e.preventDefault()
			e.stopPropagation()
		}
		if (!newGroupName.trim()) {
			setError('Group name is required')
			return
		}

		try {
			// New groups go at the bottom (highest display_order + 1)
			const maxDisplayOrder = receiptTypeGroups.length > 0 ? Math.max(...receiptTypeGroups.map(g => g.display_order)) : -1
			const newGroup = await receiptTypeGroupsApi.create({
				name: newGroupName.trim(),
				display_order: maxDisplayOrder + 1,
			})
			setReceiptTypeGroups([...receiptTypeGroups, newGroup.data])
			setNewGroupName('')
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to create group')
		}
	}

	const handleUpdateGroup = async (id: number) => {
		if (!editGroupName.trim()) {
			setError('Group name is required')
			return
		}

		try {
			const updatedGroup = await receiptTypeGroupsApi.update(id, { name: editGroupName.trim() })
			setReceiptTypeGroups(receiptTypeGroups.map(g => (g.id === id ? updatedGroup.data : g)))
			setEditingGroup(null)
			setEditGroupName('')
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to update group')
		}
	}

	const handleDeleteGroup = async (id: number) => {
		const group = receiptTypeGroups.find(g => g.id === id)
		const confirmed = await confirm({
			message: `Are you sure you want to delete group "${group?.name}"? All types in this group will be ungrouped.`,
			variant: 'destructive',
		})
		if (!confirmed) return

		// Update local state only - deletion will be saved when "Save Changes" is clicked
		setReceiptTypeGroups(receiptTypeGroups.filter(g => g.id !== id))
		// Update types that were in this group to have null group_id
		setReceiptTypes(receiptTypes.map(t => (t.group_id === id ? { ...t, group_id: null } : t)))
	}

	const startEditGroup = (group: ReceiptTypeGroup) => {
		setEditingGroup(group.id)
		setEditGroupName(group.name)
	}

	const cancelEditGroup = () => {
		setEditingGroup(null)
		setEditGroupName('')
	}

	// Receipt type management functions
	const handleAddReceiptType = async (e?: React.MouseEvent | React.KeyboardEvent) => {
		if (e) {
			e.preventDefault()
			e.stopPropagation()
		}
		if (!newReceiptType.trim()) {
			setError('Receipt type is required')
			return
		}
		if (receiptTypes.some(t => t.name === newReceiptType.trim())) {
			setError('Receipt type already exists')
			return
		}

		try {
			const newTypeData = await receiptTypesApi.create({
				name: newReceiptType.trim(),
				group_id: newReceiptTypeGroupId,
			})
			setReceiptTypes([...receiptTypes, newTypeData.data])
			setNewReceiptType('')
			setNewReceiptTypeGroupId(null)
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to add receipt type')
		}
	}

	const handleUpdateReceiptType = async (id: number) => {
		if (!editReceiptTypeName.trim()) {
			setError('Receipt type name is required')
			return
		}

		try {
			const updatedType = await receiptTypesApi.update(id, {
				name: editReceiptTypeName.trim(),
				group_id: editReceiptTypeGroupId,
			})
			setReceiptTypes(receiptTypes.map(t => (t.id === id ? updatedType.data : t)))
			setEditingReceiptType(null)
			setEditReceiptTypeName('')
			setEditReceiptTypeGroupId(null)
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to update receipt type')
		}
	}

	const handleDeleteReceiptType = async (id: number) => {
		const type = receiptTypes.find(t => t.id === id)
		const confirmed = await confirm({
			message: `Are you sure you want to delete receipt type "${type?.name}"?`,
			variant: 'destructive',
		})
		if (!confirmed) return

		try {
			await receiptTypesApi.delete(id)
			setReceiptTypes(receiptTypes.filter(t => t.id !== id))
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to delete receipt type')
		}
	}

	const startEditReceiptType = (type: ReceiptType) => {
		setEditingReceiptType(type.id)
		setEditReceiptTypeName(type.name)
		setEditReceiptTypeGroupId(type.group_id ?? null)
	}

	const cancelEditReceiptType = () => {
		setEditingReceiptType(null)
		setEditReceiptTypeName('')
		setEditReceiptTypeGroupId(null)
	}

	// Reset receipt types and groups to defaults
	const handleResetToDefaults = async () => {
		const confirmed = await confirm({
			message:
				'Are you sure you want to reset all receipt types and groups to defaults? This will delete all existing types and groups. Any receipts using custom types will be reassigned to default types.',
			variant: 'destructive',
		})
		if (!confirmed) {
			return
		}

		try {
			setError(null)

			// Use the new bulk reset endpoint with defaults from constants
			await receiptTypesApi.resetToDefaults(DEFAULT_RECEIPT_TYPE_GROUPS, DEFAULT_UNGROUPED_TYPES)

			// Reload data to refresh the UI
			await loadData()
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to reset to defaults')
		}
	}

	// Organize types by group
	// Determine which groups have been changed
	const changedGroupIds = useMemo(() => {
		const changed = new Set<number | 'ungrouped'>()

		// Create maps for quick lookup
		const originalGroupsMap = new Map(originalReceiptTypeGroups.map(g => [g.id, g]))
		const originalTypesMap = new Map(originalReceiptTypes.map(t => [t.id, t]))
		const currentTypesMap = new Map(receiptTypes.map(t => [t.id, t]))

		// Check for changed groups (name or display_order)
		receiptTypeGroups.forEach(group => {
			const original = originalGroupsMap.get(group.id)
			if (!original || original.name !== group.name || original.display_order !== group.display_order) {
				changed.add(group.id)
			}
		})

		// Check for changed types and track which groups they belong to
		receiptTypes.forEach(type => {
			const original = originalTypesMap.get(type.id)
			if (!original) {
				// New type - mark its group as changed
				changed.add(type.group_id ?? 'ungrouped')
			} else {
				// Check if type changed
				if (original.name !== type.name || original.group_id !== type.group_id || original.display_order !== type.display_order) {
					// Mark both old and new groups as changed
					changed.add(original.group_id ?? 'ungrouped')
					changed.add(type.group_id ?? 'ungrouped')
				}
			}
		})

		// Check for deleted types
		originalReceiptTypes.forEach(originalType => {
			if (!currentTypesMap.has(originalType.id)) {
				changed.add(originalType.group_id ?? 'ungrouped')
			}
		})

		// Check for deleted groups
		const currentGroupsMap = new Map(receiptTypeGroups.map(g => [g.id, g]))
		originalReceiptTypeGroups.forEach(originalGroup => {
			if (!currentGroupsMap.has(originalGroup.id)) {
				// Group was deleted - mark it as changed
				changed.add(originalGroup.id)
			}
		})

		return changed
	}, [receiptTypes, receiptTypeGroups, originalReceiptTypes, originalReceiptTypeGroups])

	// Automatically update hasUnsavedChanges based on changedGroupIds
	useEffect(() => {
		setHasUnsavedChanges(changedGroupIds.size > 0)
	}, [changedGroupIds])

	const typesByGroup = useMemo(() => {
		const grouped: Record<number | 'ungrouped', ReceiptType[]> = { ungrouped: [] }
		const sortedGroups = [...receiptTypeGroups].sort((a, b) => {
			if (a.display_order !== b.display_order) return a.display_order - b.display_order
			return a.name.localeCompare(b.name)
		})

		sortedGroups.forEach(group => {
			grouped[group.id] = []
		})

		receiptTypes.forEach(type => {
			if (type.group_id) {
				if (!grouped[type.group_id]) {
					grouped[type.group_id] = []
				}
				grouped[type.group_id].push(type)
			} else {
				grouped.ungrouped.push(type)
			}
		})

		// Sort types within each group
		Object.keys(grouped).forEach(key => {
			grouped[key as number | 'ungrouped'].sort((a, b) => {
				if (a.display_order !== b.display_order) return a.display_order - b.display_order
				return a.name.localeCompare(b.name)
			})
		})

		return { grouped, sortedGroups }
	}, [receiptTypes, receiptTypeGroups])

	// Drag and drop handlers
	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string)
		setDragOverId(null)
	}

	const handleDragOver = (event: any) => {
		const { active, over } = event
		if (!over) {
			setDragOverId(null)
			return
		}
		const activeIdStr = active.id as string
		const overId = over.id as string

		// Don't set dragOverId when dragging groups (only needed for type drags)
		if (activeIdStr.startsWith('group-')) {
			setDragOverId(null)
			return
		}

		// If dragging a type and hovering over another type, find the parent group
		if (activeIdStr.startsWith('type-') && overId.startsWith('type-')) {
			const overTypeId = parseInt(overId.replace('type-', ''))
			const overType = receiptTypes.find(t => t.id === overTypeId)
			if (overType && overType.group_id) {
				// Set dragOverId to the group's droppable zone
				setDragOverId(`group-drop-${overType.group_id}`)
				return
			} else if (overType && !overType.group_id) {
				setDragOverId('ungrouped')
				return
			}
		}
		// If hovering over a group dropzone or the group itself
		if (overId.startsWith('group-drop-') || overId.startsWith('group-')) {
			if (overId.startsWith('group-drop-')) {
				setDragOverId(overId)
			} else {
				// Convert group sortable ID to dropzone ID
				const groupId = overId.replace('group-', '')
				setDragOverId(`group-drop-${groupId}`)
			}
			return
		}
		if (overId === 'ungrouped') {
			setDragOverId('ungrouped')
			return
		}
		setDragOverId(overId)
	}

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event
		setActiveId(null)
		setDragOverId(null)

		if (!over) return

		const activeId = active.id as string
		const overId = over.id as string

		// Handle group reordering - only update local state
		if (activeId.startsWith('group-') && overId.startsWith('group-')) {
			const activeGroupId = parseInt(activeId.replace('group-', ''))
			const overGroupId = parseInt(overId.replace('group-', ''))

			if (activeGroupId === overGroupId) return

			// Use the sorted groups from typesByGroup to get the current visual order
			const currentGroups = [...typesByGroup.sortedGroups]
			const activeIndex = currentGroups.findIndex(g => g.id === activeGroupId)
			const overIndex = currentGroups.findIndex(g => g.id === overGroupId)

			if (activeIndex === -1 || overIndex === -1) return

			const newGroups = arrayMove(currentGroups, activeIndex, overIndex)

			// Update local state with new display orders
			const updatedGroups = newGroups.map((g, i) => ({ ...g, display_order: i }))
			setReceiptTypeGroups(updatedGroups)
			setHasUnsavedChanges(true)
		}
		// Handle type reordering within same group - only update local state
		else if (activeId.startsWith('type-') && overId.startsWith('type-')) {
			const activeTypeId = parseInt(activeId.replace('type-', ''))
			const overTypeId = parseInt(overId.replace('type-', ''))

			if (activeTypeId === overTypeId) return

			const activeType = receiptTypes.find(t => t.id === activeTypeId)
			const overType = receiptTypes.find(t => t.id === overTypeId)

			if (!activeType || !overType) return

			// Only reorder if types are in the same group
			if (activeType.group_id === overType.group_id) {
				const groupId = activeType.group_id
				const typesInGroup = typesByGroup.grouped[groupId || 'ungrouped'] || []
				const activeIndex = typesInGroup.findIndex(t => t.id === activeTypeId)
				const overIndex = typesInGroup.findIndex(t => t.id === overTypeId)

				if (activeIndex === -1 || overIndex === -1) return

				const newTypes = arrayMove(typesInGroup, activeIndex, overIndex)

				// Update local state with new display orders
				const updatedTypes = newTypes.map((t, i) => ({ ...t, display_order: i }))
				const typeMap = new Map(updatedTypes.map(t => [t.id, t]))
				setReceiptTypes(receiptTypes.map(t => typeMap.get(t.id) || t))
				setHasUnsavedChanges(true)
			} else {
				// Types are in different groups - move active type to over type's group
				const targetGroupId = overType.group_id ?? null

				// Only move if target group is different
				if (targetGroupId !== activeType.group_id) {
					// Get types that will be in the target group after the move
					const typesInTargetGroup = receiptTypes
						.filter(t => t.id !== activeTypeId && t.group_id === targetGroupId)
						.sort((a, b) => {
							if (a.display_order !== b.display_order) return a.display_order - b.display_order
							return a.name.localeCompare(b.name)
						})

					// Update local state: move the type and recalculate display_order for all types in target group
					const updatedTypes = receiptTypes.map(t => {
						if (t.id === activeTypeId) {
							// Move the active type to the target group
							return { ...t, group_id: targetGroupId, display_order: typesInTargetGroup.length }
						} else if (t.group_id === targetGroupId) {
							// Keep existing types in target group as-is (display_order will be recalculated on save)
							return t
						}
						return t
					})

					setReceiptTypes(updatedTypes)
					setHasUnsavedChanges(true)
				}
			}
		}
		// Handle type moved to different group - only update local state
		else if (activeId.startsWith('type-')) {
			const activeTypeId = parseInt(activeId.replace('type-', ''))
			const activeType = receiptTypes.find(t => t.id === activeTypeId)
			if (!activeType) return

			// Check if dropped on a group (either group dropzone or type in that group)
			let targetGroupId: number | null = null

			if (overId.startsWith('group-drop-')) {
				targetGroupId = parseInt(overId.replace('group-drop-', ''))
			} else if (overId.startsWith('group-')) {
				// Also handle if dropped directly on group sortable (for backwards compatibility)
				targetGroupId = parseInt(overId.replace('group-', ''))
			} else if (overId.startsWith('type-')) {
				const overTypeId = parseInt(overId.replace('type-', ''))
				const overType = receiptTypes.find(t => t.id === overTypeId)
				if (overType) {
					targetGroupId = overType.group_id ?? null
				}
			} else if (overId === 'ungrouped') {
				targetGroupId = null
			}

			// Only move if target group is different
			if (targetGroupId !== activeType.group_id) {
				// Get types that will be in the target group after the move
				const typesInTargetGroup = receiptTypes
					.filter(t => t.id !== activeTypeId && t.group_id === targetGroupId)
					.sort((a, b) => {
						if (a.display_order !== b.display_order) return a.display_order - b.display_order
						return a.name.localeCompare(b.name)
					})

				// Update local state: move the type and recalculate display_order for all types in target group
				const updatedTypes = receiptTypes.map(t => {
					if (t.id === activeTypeId) {
						// Move the active type to the target group
						return { ...t, group_id: targetGroupId, display_order: typesInTargetGroup.length }
					} else if (t.group_id === targetGroupId) {
						// Keep existing types in target group as-is (display_order will be recalculated on save)
						return t
					}
					return t
				})

				setReceiptTypes(updatedTypes)
				setHasUnsavedChanges(true)
			}
		}
	}

	// Save all receipt type changes
	const handleCancelReceiptTypes = () => {
		// Revert to original state
		setReceiptTypes([...originalReceiptTypes])
		setReceiptTypeGroups([...originalReceiptTypeGroups])
		setHasUnsavedChanges(false)
		setError(null)
	}

	const handleSaveReceiptTypes = async () => {
		try {
			setIsSavingTypes(true)
			setError(null)

			// Recalculate display_order for all types based on their current grouping
			// Group types by group_id and assign sequential display_order within each group
			const typesByGroupForSave: Record<number | 'ungrouped', ReceiptType[]> = { ungrouped: [] }

			receiptTypes.forEach(type => {
				const key = type.group_id ?? 'ungrouped'
				if (!typesByGroupForSave[key]) {
					typesByGroupForSave[key] = []
				}
				typesByGroupForSave[key].push(type)
			})

			// Sort types within each group by current display_order, then name
			Object.keys(typesByGroupForSave).forEach(key => {
				typesByGroupForSave[key as number | 'ungrouped'].sort((a, b) => {
					if (a.display_order !== b.display_order) return a.display_order - b.display_order
					return a.name.localeCompare(b.name)
				})
			})

			// Prepare bulk update with recalculated display_order
			const updates: Array<{ id: number; group_id: number | null; display_order: number }> = []

			Object.keys(typesByGroupForSave).forEach(key => {
				const types = typesByGroupForSave[key as number | 'ungrouped']
				types.forEach((type, index) => {
					updates.push({
						id: type.id,
						group_id: key === 'ungrouped' ? null : parseInt(key),
						display_order: index,
					})
				})
			})

			// Update all types at once
			await receiptTypesApi.bulkUpdate(updates)

			// Delete groups that were removed
			const currentGroupIds = new Set(receiptTypeGroups.map(g => g.id))
			const groupsToDelete = originalReceiptTypeGroups.filter(g => !currentGroupIds.has(g.id))
			await Promise.all(groupsToDelete.map(g => receiptTypeGroupsApi.delete(g.id)))

			// Update groups display_order
			const groupUpdates = receiptTypeGroups.map((g, i) => receiptTypeGroupsApi.update(g.id, { display_order: i }))
			await Promise.all(groupUpdates)

			// Reload data to ensure consistency
			await loadData()
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to save receipt type changes')
		} finally {
			setIsSavingTypes(false)
		}
	}

	// Validate filename pattern
	const validatePattern = (pattern: string): string | null => {
		if (!pattern || pattern.trim().length === 0) {
			return 'Pattern cannot be empty'
		}

		// Check for invalid filesystem characters
		const invalidChars = /[<>:"/\\|?*]/
		if (invalidChars.test(pattern)) {
			return 'Pattern contains invalid filesystem characters: < > : " / \\ | ? *'
		}

		// Reject pattern if it contains {ext} token
		if (pattern.includes('{ext}')) {
			return 'Pattern cannot contain {ext} token. File extension is automatically appended.'
		}

		// Check for valid tokens only
		const validTokens = ['date', 'user', 'vendor', 'amount', 'type', 'index', 'flags']
		const tokenRegex = /\{([^}]+)\}/g
		let match
		while ((match = tokenRegex.exec(pattern)) !== null) {
			const token = match[1]
			if (!validTokens.includes(token)) {
				return `Unknown token: {${token}}. Valid tokens are: {date}, {user}, {vendor}, {amount}, {type}, {index}, {flags}`
			}
		}

		// Check for reasonable length
		if (pattern.length > 200) {
			return 'Pattern is too long (max 200 characters)'
		}

		// Check for leading/trailing spaces or dots
		if (pattern.trim() !== pattern) {
			return 'Pattern cannot have leading or trailing spaces'
		}

		if (pattern.startsWith('.') || pattern.endsWith('.')) {
			return 'Pattern cannot start or end with a dot'
		}

		return null
	}

	// Generate preview filename
	const previewFilename = useMemo(() => {
		const error = validatePattern(filenamePattern)
		if (error) {
			return null
		}

		// Sample data for preview
		const sampleDate = '2024-01-15'
		const sampleUser = 'john-doe'
		const sampleVendor = 'clinic'
		const sampleAmount = '100-50'
		const sampleType = 'visit'
		const sampleFlags = 'reimbursed-tax-deductible'
		const sampleIndex = '0'
		const sampleReceiptId = '123'
		const sampleExt = '.pdf'

		let preview = filenamePattern
			.replace(/\{date\}/g, sampleDate)
			.replace(/\{user\}/g, sampleUser)
			.replace(/\{vendor\}/g, sampleVendor)
			.replace(/\{amount\}/g, sampleAmount)
			.replace(/\{type\}/g, sampleType)
			.replace(/\{index\}/g, sampleIndex)
			.replace(/\{flags\}/g, sampleFlags)

		// Clean up double separators
		preview = preview.replace(/-+/g, '-').replace(/_+/g, '_')
		preview = preview.replace(/^[-_]+|[-_]+$/g, '')

		// Always append [{receiptId}-{index}] before extension to match backend behavior
		const uniqueSuffix = `[${sampleReceiptId}-${sampleIndex}]`

		return `${preview}${uniqueSuffix}${sampleExt}`
	}, [filenamePattern])

	// Handle pattern change
	const handlePatternChange = (value: string) => {
		setFilenamePattern(value)
		const error = validatePattern(value)
		setPatternError(error)
	}

	// Handle reset to default pattern
	const handleResetToDefault = () => {
		setFilenamePattern(DEFAULT_FILENAME_PATTERN)
		const error = validatePattern(DEFAULT_FILENAME_PATTERN)
		setPatternError(error)
	}

	// Handle save pattern
	const handleSavePattern = async () => {
		const error = validatePattern(filenamePattern)
		if (error) {
			setPatternError(error)
			return
		}

		try {
			await settingsApi.set('filenamePattern', filenamePattern)
			setOriginalPattern(filenamePattern)
			setPatternError(null)

			// Check if pattern changed and prompt for rename
			if (filenamePattern !== originalPattern) {
				const shouldRename = await confirm({
					message: 'Pattern saved successfully. Would you like to rename all existing files to match the new pattern?',
					title: 'Rename Files?',
					confirmText: 'Yes, Rename',
					cancelText: 'No, Skip',
				})
				if (shouldRename) {
					await handleRenameAll()
				}
			}
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to save pattern')
		}
	}

	// Handle rename all files
	const handleRenameAll = async () => {
		const error = validatePattern(filenamePattern)
		if (error) {
			setPatternError(error)
			return
		}

		const confirmed = await confirm({
			message: 'Are you sure you want to rename all existing files? This action cannot be undone.',
			variant: 'destructive',
		})
		if (!confirmed) {
			return
		}

		try {
			setIsRenaming(true)
			setError(null)
			const result = await filenamesApi.renameAll()
			if (result.data.errors.length > 0) {
				setError(`Renamed ${result.data.renamed} of ${result.data.totalFiles} files. Some errors occurred.`)
			} else {
				setError(null)
				await alert({
					title: 'Success',
					message: `Successfully renamed ${result.data.renamed} files.`,
				})
			}
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to rename files')
		} finally {
			setIsRenaming(false)
		}
	}

	// Handle organize files (migrate to new directory structure)
	const handleOrganizeFiles = async () => {
		const confirmed = await confirm({
			message:
				'This will move all receipt files from the old directory structure to the new user/date structure. This action cannot be undone. Continue?',
			variant: 'destructive',
		})
		if (!confirmed) {
			return
		}

		try {
			setIsOrganizing(true)
			setError(null)
			const result = await receiptsApi.migrateFiles()
			if (result.data.errors.length > 0) {
				const errorCount = result.data.errors.length
				const successCount = result.data.filesMoved
				setError(`Moved ${successCount} of ${result.data.totalFiles} files. ${errorCount} error(s) occurred.`)
			} else {
				setError(null)
				await alert({
					title: 'Success',
					message: `Successfully moved ${result.data.filesMoved} file(s) to the new directory structure.`,
				})
			}
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to organize files')
		} finally {
			setIsOrganizing(false)
		}
	}

	// Handle optimize images
	const handleOptimizeImages = async () => {
		const confirmed = await confirm({
			title: 'Optimize Images',
			message: 'This will optimize all unoptimized receipt images. This may take a while depending on the number of images. Continue?',
			variant: 'default',
			confirmText: 'Optimize',
			cancelText: 'Cancel',
		})

		if (!confirmed) return

		setIsOptimizing(true)
		setError(null)
		setOptimizationResult(null)

		try {
			const result = await imagesApi.optimize()
			if (result.data.success) {
				setOptimizationResult(result.data)
				if (result.data.errors.length > 0) {
					await alert({
						title: 'Optimization Complete',
						message: `Optimized ${result.data.optimized} image(s), skipped ${result.data.skipped}. ${result.data.errors.length} error(s) occurred.`,
					})
				} else {
					await alert({
						title: 'Optimization Complete',
						message: `Successfully optimized ${result.data.optimized} image(s) in ${(result.data.duration / 1000).toFixed(1)} seconds.`,
					})
				}
			} else {
				setError('Optimization failed')
			}
		} catch (err: any) {
			setError(err.response?.data?.error || err.response?.data?.message || 'Failed to optimize images')
		} finally {
			setIsOptimizing(false)
		}
	}

	const handleReoptimizeImages = async () => {
		const confirmed = await confirm({
			title: 'Re-optimize All Images',
			message:
				'This will re-optimize ALL receipt images, including those already optimized. This may take a while depending on the number of images. Continue?',
			variant: 'default',
			confirmText: 'Re-optimize',
			cancelText: 'Cancel',
		})

		if (!confirmed) return

		setIsReoptimizing(true)
		setError(null)
		setOptimizationResult(null)

		try {
			const result = await imagesApi.reoptimize()
			if (result.data.success) {
				setOptimizationResult(result.data)
				if (result.data.errors.length > 0) {
					await alert({
						title: 'Re-optimization Complete',
						message: `Re-optimized ${result.data.optimized} image(s), skipped ${result.data.skipped}. ${result.data.errors.length} error(s) occurred.`,
					})
				} else {
					await alert({
						title: 'Re-optimization Complete',
						message: `Successfully re-optimized ${result.data.optimized} image(s) in ${(result.data.duration / 1000).toFixed(1)} seconds.`,
					})
				}
			} else {
				setError('Re-optimization failed')
			}
		} catch (err: any) {
			setError(err.response?.data?.error || err.response?.data?.message || 'Failed to re-optimize images')
		} finally {
			setIsReoptimizing(false)
		}
	}

	// Handle export all receipts
	const handleExport = async () => {
		try {
			const response = await exportApi.download()
			const url = window.URL.createObjectURL(new Blob([response.data]))
			const link = document.createElement('a')
			link.href = url
			link.setAttribute('download', 'medstash-export.zip')
			document.body.appendChild(link)
			link.click()
			link.remove()
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to export')
		}
	}

	// Handle delete processed files
	const handleDeleteProcessed = async () => {
		const confirmed = await confirm({
			title: 'Delete Processed Files',
			message: `Are you sure you want to delete all ${
				processedFileCount || 0
			} file(s) in the processed folder? This action cannot be undone.`,
			variant: 'destructive',
			confirmText: 'Delete',
			cancelText: 'Cancel',
		})

		if (!confirmed) return

		setIsDeletingProcessed(true)
		setError(null)

		try {
			const result = await watchApi.deleteProcessed()
			if (result.data.errors.length > 0) {
				await alert({
					title: 'Partial Success',
					message: `Deleted ${result.data.deleted} file(s). ${result.data.errors.length} error(s) occurred.`,
				})
			} else {
				await alert({
					title: 'Success',
					message: `Successfully deleted ${result.data.deleted} file(s).`,
				})
			}
			// Refresh count
			await loadProcessedCount()
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to delete processed files')
		} finally {
			setIsDeletingProcessed(false)
		}
	}

	if (loading) {
		return <div className="py-8 text-center">Loading settings...</div>
	}

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			{ConfirmDialog}
			{AlertDialog}
			<div>
				<h2 className="text-3xl font-bold">Settings</h2>
				<p className="text-muted-foreground">Manage flags and application settings</p>
			</div>

			{error && <div className="p-4 rounded-md bg-destructive/10 text-destructive">{error}</div>}

			{/* Processed Files */}
			<Card>
				<CardHeader>
					<CardTitle>Watched Folder</CardTitle>
					<CardDescription>Manage files in the processed folder from the watch service</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
						<div>
							<p className="text-sm text-muted-foreground">
								{isLoadingProcessedCount ? (
									'Loading...'
								) : processedFileCount !== null ? (
									<>
										<span className="font-medium">{processedFileCount}</span> file{processedFileCount !== 1 ? 's' : ''} in processed folder
									</>
								) : (
									'Unable to load file count'
								)}
							</p>
						</div>
						<div className="flex flex-col gap-2 sm:flex-row">
							<Button variant="outline" onClick={loadProcessedCount} disabled={isLoadingProcessedCount}>
								<RefreshCw className={`w-4 h-4 mr-1 ${isLoadingProcessedCount ? 'animate-spin' : ''}`} />
								Refresh
							</Button>
							<Button
								variant="destructive"
								onClick={handleDeleteProcessed}
								disabled={isDeletingProcessed || processedFileCount === null || processedFileCount === 0}
							>
								<Trash2 className="w-4 h-4 mr-1" />
								{isDeletingProcessed ? 'Deleting...' : 'Delete All'}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Users Management */}
			<Card>
				<CardHeader>
					<CardTitle>Users</CardTitle>
					<CardDescription>Manage users for categorizing receipts</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-col gap-2 sm:flex-row">
						<Input
							placeholder="Enter user name"
							value={newUser}
							onChange={e => setNewUser(e.target.value)}
							onKeyDown={e => e.key === 'Enter' && handleAddUser()}
							className="flex-1"
						/>
						<Button onClick={handleAddUser}>
							<Plus className="w-4 h-4 mr-1" />
							Add User
						</Button>
					</div>
					<div className="space-y-1">
						{users.length === 0 ? (
							<p className="py-4 text-sm text-center text-muted-foreground">No users configured yet</p>
						) : (
							users.map(user => (
								<div key={user.id} className="flex items-center justify-between px-3 py-1 border rounded-lg">
									{editingUser === user.id ? (
										<div className="flex items-center flex-1 gap-2">
											<Input value={editUserName} onChange={e => setEditUserName(e.target.value)} className="flex-1" />
											<Button size="icon" variant="ghost" onClick={() => handleUpdateUser(user.id)}>
												<Save className="size-4" />
											</Button>
											<Button size="icon" variant="ghost" onClick={cancelEditUser}>
												<X className="size-4" />
											</Button>
										</div>
									) : (
										<>
											<span className="font-medium">{user.name}</span>
											<div className="flex gap-2">
												<Button size="icon" variant="ghost" onClick={() => startEditUser(user)}>
													<Edit2 className="size-4" />
												</Button>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => handleDeleteUser(user.id)}
													className="text-destructive hover:text-destructive"
												>
													<Trash2 className="w-4 h-4" />
												</Button>
											</div>
										</>
									)}
								</div>
							))
						)}
					</div>
				</CardContent>
			</Card>

			{/* Quick Vendors Management */}
			<Card>
				<CardHeader>
					<CardTitle>Quick Vendors</CardTitle>
					<CardDescription>
						Manage frequently used vendors that appear as quick selection buttons. Exclude vendors to remove them from the quick list.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{isLoadingQuickVendors ? (
						<p className="py-4 text-sm text-center text-muted-foreground">Loading vendors...</p>
					) : (
						<>
							{/* Current Quick Vendors */}
							<div>
								<div className="flex items-center justify-between mb-2">
									<Label>Quick Vendors ({quickVendors.length})</Label>
									<Button variant="outline" size="sm" onClick={loadQuickVendors} disabled={isLoadingQuickVendors}>
										<RefreshCw className={`w-4 h-4 mr-1 ${isLoadingQuickVendors ? 'animate-spin' : ''}`} />
										Refresh
									</Button>
								</div>
								{quickVendors.length === 0 ? (
									<p className="py-4 text-sm text-center text-muted-foreground">No vendors available</p>
								) : (
									<div className="space-y-1">
										{quickVendors.map((item, index) => {
											const isCustom = customQuickVendors.some(v => v.toLowerCase() === item.vendor.toLowerCase())
											return (
												<div key={index} className="flex items-center justify-between px-3 py-1 border rounded-lg">
													<div className="flex items-center flex-1 min-w-0 gap-2">
														<span className="font-medium truncate">{item.vendor}</span>
														{isCustom ? (
															<span className="text-xs text-muted-foreground">(custom)</span>
														) : (
															<span className="text-xs text-muted-foreground">
																({item.count}
																<span className="hidden sm:inline"> receipt{item.count !== 1 ? 's' : ''}</span>)
															</span>
														)}
													</div>
													<Button size="sm" variant="outline" onClick={() => handleExcludeVendor(item.vendor)} className="flex-shrink-0">
														<X className="w-4 h-4 mr-1" />
														Exclude
													</Button>
												</div>
											)
										})}
									</div>
								)}
							</div>

							{/* Custom Vendors */}
							{/* <div>
								<Label>Custom Vendors</Label>
								<div className="flex flex-col gap-2 mt-2 sm:flex-row">
									<Input
										placeholder="Enter vendor name"
										value={newCustomVendor}
										onChange={e => setNewCustomVendor(e.target.value)}
										onKeyDown={e => e.key === 'Enter' && handleAddCustomVendor()}
										className="flex-1"
									/>
									<Button onClick={handleAddCustomVendor}>
										<Plus className="w-4 h-4 mr-1" />
										Add Custom Vendor
									</Button>
								</div>
								{customQuickVendors.length === 0 ? (
									<p className="py-2 text-sm text-center text-muted-foreground">No custom vendors added</p>
								) : (
									<div className="mt-2 space-y-1">
										{customQuickVendors.map((vendor, index) => (
											<div key={index} className="flex items-center justify-between px-3 py-2 border rounded-lg bg-primary/5">
												<span className="font-medium truncate">{vendor}</span>
												<Button size="sm" variant="outline" onClick={() => handleRemoveCustomVendor(vendor)} className="flex-shrink-0">
													<Trash2 className="w-4 h-4 mr-1" />
													Remove
												</Button>
											</div>
										))}
									</div>
								)}
							</div> */}

							{/* Excluded Vendors */}
							{excludedQuickVendors.length > 0 && (
								<div>
									<Label>Excluded Vendors ({excludedQuickVendors.length})</Label>
									<div className="mt-2 space-y-1">
										{excludedQuickVendors.map((vendor, index) => (
											<div key={index} className="flex items-center justify-between px-3 py-1 border rounded-lg bg-muted/50">
												<span className="font-medium truncate">{vendor}</span>
												<Button size="sm" variant="outline" onClick={() => handleRemoveExclusion(vendor)} className="flex-shrink-0">
													<RotateCcw className="w-4 h-4 mr-1" />
													Include
												</Button>
											</div>
										))}
									</div>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{/* Flags Management */}
			<Card>
				<CardHeader>
					<CardTitle>Custom Flags</CardTitle>
					<CardDescription>Create and manage custom flags for categorizing receipts</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Create New Flag */}
					<div className="flex flex-col gap-2 p-4 border rounded-lg sm:items-end sm:flex-row">
						<div className="flex flex-row flex-1 gap-2">
							<div className="flex-1 space-y-2">
								<Label>Flag Name</Label>
								<Input
									placeholder="e.g., Reimbursed, Tax Deductible"
									value={newFlagName}
									onChange={e => setNewFlagName(e.target.value)}
									onKeyDown={e => e.key === 'Enter' && handleCreateFlag()}
								/>
							</div>
							<div className="space-y-2">
								<Label>Color</Label>
								<ColorPicker value={newFlagColor} onChange={color => setNewFlagColor(color)} />
							</div>
						</div>
						<Button onClick={handleCreateFlag}>
							<Plus className="w-4 h-4 mr-1" />
							Add Flag
						</Button>
					</div>

					{/* Existing Flags */}
					<div className="grid grid-cols-1 gap-1 md:grid-cols-2">
						{flags.length === 0 ? (
							<p className="py-4 text-sm text-center text-muted-foreground">No flags created yet</p>
						) : (
							flags.map(flag => (
								<div key={flag.id} className="flex items-center justify-between px-3 py-1 border rounded-lg">
									{editingFlag === flag.id ? (
										<div className="flex items-center flex-1 gap-2">
											<Input value={editFlagName} onChange={e => setEditFlagName(e.target.value)} className="flex-1" />
											<ColorPicker value={editFlagColor} onChange={color => setEditFlagColor(color)} />
											<Button size="icon" variant="ghost" onClick={() => handleUpdateFlag(flag.id)}>
												<Save className="size-4" />
											</Button>
											<Button size="icon" variant="ghost" onClick={cancelEdit}>
												<X className="size-4" />
											</Button>
										</div>
									) : (
										<>
											<div className="flex items-center flex-1 gap-3">
												<FlagIcon className="size-4" style={flag.color ? { color: flag.color } : undefined} />
												<FlagBadge flag={flag} />
											</div>
											<div className="flex gap-2">
												<Button size="icon" variant="ghost" onClick={() => startEdit(flag)}>
													<Edit2 className="size-4" />
												</Button>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => handleDeleteFlag(flag.id)}
													className="text-destructive hover:text-destructive"
												>
													<Trash2 className="size-4" />
												</Button>
											</div>
										</>
									)}
								</div>
							))
						)}
					</div>
				</CardContent>
			</Card>

			{/* Receipt Type Groups Management */}
			<Card className={hasUnsavedChanges ? 'border-2 border-dashed border-amber-500/50' : ''}>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								Receipt Type Groups
								{hasUnsavedChanges && (
									<span className="text-xs font-normal text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
										Unsaved Changes
									</span>
								)}
							</CardTitle>
							<CardDescription>Organize receipt types into groups for better organization</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Create New Type */}
					<div className="p-4 space-y-3 border rounded-lg">
						<Label>Create New Receipt Type</Label>
						<div className="flex flex-col w-full gap-2 sm:flex-row">
							<div className="flex flex-row flex-1 gap-2">
								<Input
									placeholder="Type name (e.g., Doctor Visit)"
									value={newReceiptType}
									onChange={e => setNewReceiptType(e.target.value)}
									onKeyDown={e => {
										if (e.key === 'Enter') {
											e.preventDefault()
											handleAddReceiptType(e)
										}
									}}
									className="flex-1 w-full"
								/>
								<Select
									value={newReceiptTypeGroupId?.toString() || 'ungrouped'}
									onValueChange={value => setNewReceiptTypeGroupId(value === 'ungrouped' ? null : parseInt(value))}
								>
									<SelectTrigger className="w-48">
										<SelectValue placeholder="Select group" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ungrouped">Ungrouped</SelectItem>
										{receiptTypeGroups.map(g => (
											<SelectItem key={g.id} value={g.id.toString()}>
												{g.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<Button type="button" onClick={handleAddReceiptType}>
								<Plus className="w-4 h-4 mr-1" />
								Add Type
							</Button>
						</div>
					</div>

					{/* Create New Group */}
					<div className="p-4 space-y-3 border rounded-lg">
						<Label>Create New Group</Label>
						<div className="flex flex-col gap-2 sm:flex-row">
							<Input
								placeholder="Group name (e.g., Medical Expenses)"
								value={newGroupName}
								onChange={e => setNewGroupName(e.target.value)}
								onKeyDown={e => {
									if (e.key === 'Enter') {
										e.preventDefault()
										handleCreateGroup(e)
									}
								}}
								className="flex-1"
							/>
							<Button type="button" onClick={handleCreateGroup}>
								<Plus className="w-4 h-4 mr-1" />
								Add Group
							</Button>
						</div>
					</div>

					{/* Save Changes Button */}
					{hasUnsavedChanges && (
						<div className="p-4 border rounded-lg bg-muted/50">
							<div className="flex items-center justify-between">
								<div>
									<Label>Unsaved Changes</Label>
									<p className="mt-1 text-sm text-muted-foreground">
										You have unsaved changes to receipt type organization. Click Save to apply all changes or Cancel to revert.
									</p>
								</div>
								<div className="flex gap-2">
									<Button type="button" variant="outline" onClick={handleCancelReceiptTypes} disabled={isSavingTypes}>
										<X className="w-4 h-4 mr-1" />
										Cancel
									</Button>
									<Button type="button" onClick={handleSaveReceiptTypes} disabled={isSavingTypes}>
										<Save className={`w-4 h-4 mr-1 ${isSavingTypes ? 'animate-spin' : ''}`} />
										{isSavingTypes ? 'Saving...' : 'Save Changes'}
									</Button>
								</div>
							</div>
						</div>
					)}

					{/* Groups List */}
					<DndContext
						sensors={sensors}
						collisionDetection={rectIntersection}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDragEnd={handleDragEnd}
						autoScroll={{ threshold: { x: 0, y: 0.2 } }}
					>
						<div className="space-y-4">
							{typesByGroup.sortedGroups.length === 0 && typesByGroup.grouped.ungrouped.length === 0 ? (
								<p className="py-4 text-sm text-center text-muted-foreground">No groups or types configured yet</p>
							) : (
								<>
									<SortableContext items={typesByGroup.sortedGroups.map(g => `group-${g.id}`)} strategy={verticalListSortingStrategy}>
										{typesByGroup.sortedGroups.map(group => {
											const typesInGroup = typesByGroup.grouped[group.id] || []
											return (
												<SortableGroup
													key={group.id}
													group={group}
													editingGroup={editingGroup}
													editGroupName={editGroupName}
													setEditGroupName={setEditGroupName}
													onEdit={() => startEditGroup(group)}
													onSave={() => handleUpdateGroup(group.id)}
													onCancel={cancelEditGroup}
													onDelete={() => handleDeleteGroup(group.id)}
													dragOverId={dragOverId}
													hasChanged={changedGroupIds.has(group.id)}
												>
													<div className="space-y-1 ">
														{typesInGroup.length > 0 ? (
															<SortableContext items={typesInGroup.map(t => `type-${t.id}`)} strategy={verticalListSortingStrategy}>
																{typesInGroup.map(type => (
																	<SortableType
																		key={type.id}
																		type={type}
																		editingReceiptType={editingReceiptType}
																		editReceiptTypeName={editReceiptTypeName}
																		setEditReceiptTypeName={setEditReceiptTypeName}
																		onEdit={() => startEditReceiptType(type)}
																		onSave={() => handleUpdateReceiptType(type.id)}
																		onCancel={cancelEditReceiptType}
																		onDelete={() => handleDeleteReceiptType(type.id)}
																	/>
																))}
															</SortableContext>
														) : (
															<div className="py-8 text-sm text-center border-2 border-dashed rounded text-muted-foreground">
																Drop types here
															</div>
														)}
													</div>
												</SortableGroup>
											)
										})}
									</SortableContext>

									{/* Ungrouped Types */}
									<UngroupedSection
										types={typesByGroup.grouped.ungrouped}
										editingReceiptType={editingReceiptType}
										editReceiptTypeName={editReceiptTypeName}
										setEditReceiptTypeName={setEditReceiptTypeName}
										onEditType={type => startEditReceiptType(type)}
										onSaveType={id => handleUpdateReceiptType(id)}
										onCancelEdit={cancelEditReceiptType}
										onDeleteType={id => handleDeleteReceiptType(id)}
										dragOverId={dragOverId}
										hasChanged={changedGroupIds.has('ungrouped')}
									/>
								</>
							)}
						</div>
						<DragOverlay className="z-[60]">
							{activeId ? (
								activeId.startsWith('group-') ? (
									<div className="p-3 border rounded-lg shadow-lg bg-background">
										<h3 className="font-semibold">{receiptTypeGroups.find(g => `group-${g.id}` === activeId)?.name}</h3>
									</div>
								) : activeId.startsWith('type-') ? (
									<div className="flex items-center justify-between px-2 py-1 border rounded shadow-lg bg-background">
										<span className="font-medium">{receiptTypes.find(t => `type-${t.id}` === activeId)?.name}</span>
									</div>
								) : null
							) : null}
						</DragOverlay>
					</DndContext>

					{/* Reset to Defaults */}
					<div className="p-4 border rounded-lg border-destructive">
						<div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
							<div>
								<Label>Reset to Default Types (DANGER)</Label>
								<p className="mt-1 text-sm text-muted-foreground">Restore all receipt types and groups to their default values</p>
							</div>
							<Button type="button" variant="destructive" onClick={handleResetToDefaults}>
								<RotateCcw className="w-4 h-4 mr-1" />
								Reset to Defaults
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Filename Pattern */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Filename Pattern</CardTitle>
							<CardDescription>Customize how receipt files are named. File extension is automatically appended.</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="filename-pattern">Pattern</Label>
						<div className="flex gap-2">
							<Input
								id="filename-pattern"
								placeholder={DEFAULT_FILENAME_PATTERN}
								value={filenamePattern}
								onChange={e => handlePatternChange(e.target.value)}
								onKeyDown={e => e.key === 'Enter' && !patternError && handleSavePattern()}
								className={patternError ? 'border-destructive' : ''}
							/>
							<Button
								variant="outline"
								onClick={handleResetToDefault}
								title="Reset to default pattern"
								disabled={filenamePattern === DEFAULT_FILENAME_PATTERN}
							>
								<RotateCcw className="w-4 h-4" />
							</Button>
						</div>
						{patternError && <p className="text-sm text-destructive">{patternError}</p>}
					</div>

					{/* Helper text */}
					<div className="p-3 space-y-2 rounded-lg bg-muted">
						<div className="flex items-start gap-2">
							<Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
							<div className="space-y-1 text-sm">
								<p className="font-medium">Available tokens:</p>
								<ul className="space-y-1 list-disc list-inside text-muted-foreground">
									<li>
										<code className="bg-background px-1 py-0.5 rounded">&#123;date&#125;</code> - Date in YYYY-MM-DD format
									</li>
									<li>
										<code className="bg-background px-1 py-0.5 rounded">&#123;user&#125;</code> - User name (sanitized)
									</li>
									<li>
										<code className="bg-background px-1 py-0.5 rounded">&#123;vendor&#125;</code> - Vendor name (sanitized)
									</li>
									<li>
										<code className="bg-background px-1 py-0.5 rounded">&#123;amount&#125;</code> - Amount (e.g., 100-50 for $100.50)
									</li>
									<li>
										<code className="bg-background px-1 py-0.5 rounded">&#123;type&#125;</code> - Receipt type (sanitized)
									</li>
									<li>
										<code className="bg-background px-1 py-0.5 rounded">&#123;index&#125;</code> - File order (0-based)
									</li>
									<li>
										<code className="bg-background px-1 py-0.5 rounded">&#123;flags&#125;</code> - Flags separated by dashes (e.g.,
										reimbursed-tax-deductible)
									</li>
								</ul>
								<p className="mt-2 text-muted-foreground">
									<strong>Note:</strong> All filenames automatically end with{' '}
									<code className="bg-background px-1 py-0.5 rounded">[pk-index]</code> before the extension to prevent filename collisions,
									where <code className="bg-background px-1 py-0.5 rounded">pk</code> is the receipt ID and{' '}
									<code className="bg-background px-1 py-0.5 rounded">index</code> is the file order. For example:{' '}
									<code className="bg-background px-1 py-0.5 rounded">pattern[123-0].pdf</code> where{' '}
									<code className="bg-background px-1 py-0.5 rounded">123</code> is the receipt ID and{' '}
									<code className="bg-background px-1 py-0.5 rounded">0</code> is the file order.
								</p>
								<p className="mt-1 text-muted-foreground">File extension is automatically appended and cannot be customized.</p>
							</div>
						</div>
					</div>

					{/* Live preview */}
					{previewFilename && (
						<div className="p-3 rounded-lg bg-muted">
							<p className="mb-1 text-sm font-medium">Preview:</p>
							<code className="text-sm">{previewFilename}</code>
						</div>
					)}

					{/* Actions */}
					<div className="flex flex-col justify-end gap-2 sm:flex-row">
						{/*  */}
						<Button variant="outline" onClick={handleRenameAll} disabled={!!patternError || isRenaming}>
							<RefreshCw className={`w-4 h-4 mr-1 ${isRenaming ? 'animate-spin' : ''}`} />
							{isRenaming ? 'Renaming...' : 'Rename All Files'}
						</Button>
						{/*  */}
						<Button
							variant="outline"
							size="sm"
							onClick={handleOrganizeFiles}
							disabled={isOrganizing}
							title="Move files to the new user/date directory structure"
						>
							<FolderTree className={`w-4 h-4 mr-1 ${isOrganizing ? 'animate-spin' : ''}`} />
							{isOrganizing ? 'Organizing...' : 'Organize Files'}
						</Button>
						{/*  */}
						<Button onClick={handleSavePattern} disabled={!!patternError || filenamePattern === originalPattern} variant="outline">
							<Save className="w-4 h-4 mr-1" />
							Save Pattern
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Image Optimization */}
			<Card>
				<CardHeader>
					<CardTitle>Image Optimization</CardTitle>
					<CardDescription>Optimize receipt images to reduce file size while maintaining text legibility</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Enable/Disable Toggle */}
					<div className="flex items-center justify-between p-3 border rounded-lg">
						<div className="space-y-0.5">
							<Label htmlFor="image-optimization-toggle" className="text-base font-medium cursor-pointer">
								Enable Image Optimization
							</Label>
							<p className="text-sm text-muted-foreground">Automatically optimize images when uploading or importing from watch folder</p>
						</div>
						<Switch
							id="image-optimization-toggle"
							checked={imageOptimizationEnabled}
							onCheckedChange={async checked => {
								const enabled = checked === true
								setImageOptimizationEnabled(enabled)
								try {
									await settingsApi.set('imageOptimizationEnabled', enabled)
								} catch (err: any) {
									setError(err.response?.data?.error || 'Failed to update setting')
									// Revert on error
									setImageOptimizationEnabled(!enabled)
								}
							}}
						/>
					</div>

					<div className="p-3 space-y-2 rounded-lg bg-muted">
						<div className="flex items-start gap-2">
							<Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
							<div className="space-y-1 text-sm">
								<p className="font-medium">Optimization Features:</p>
								<ul className="space-y-1 list-disc list-inside text-muted-foreground">
									<li>JPEG optimization with 85% quality (text legible)</li>
									<li>Progressive JPEG encoding for better compression</li>
									<li>Automatic grayscale conversion for B&W receipts</li>
									<li>Smart resizing for large images (max 2000x2000px)</li>
									<li>PNG to JPEG conversion (better compression for receipts)</li>
									<li>Only processes unoptimized images</li>
								</ul>
								<p className="mt-2 text-muted-foreground">
									<strong>Note:</strong> When enabled, new uploads and watch folder files are automatically optimized. Use the buttons below
									to manually optimize existing images.
								</p>
							</div>
						</div>
					</div>

					{/* Optimization Results */}
					{optimizationResult && (
						<div className="p-3 space-y-2 rounded-lg bg-muted">
							<p className="text-sm font-medium">Last Optimization Results:</p>
							<div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
								<div>
									<span className="text-muted-foreground">Total:</span> <span className="font-medium">{optimizationResult.total}</span>
								</div>
								<div>
									<span className="text-muted-foreground">Optimized:</span>{' '}
									<span className="font-medium text-green-600 dark:text-green-400">{optimizationResult.optimized}</span>
								</div>
								<div>
									<span className="text-muted-foreground">Skipped:</span> <span className="font-medium">{optimizationResult.skipped}</span>
								</div>
								<div>
									<span className="text-muted-foreground">Duration:</span>{' '}
									<span className="font-medium">{(optimizationResult.duration / 1000).toFixed(1)}s</span>
								</div>
							</div>
							{optimizationResult.errors.length > 0 && (
								<div className="mt-2">
									<p className="text-sm text-destructive">
										{optimizationResult.errors.length} error(s) occurred. Check server logs for details.
									</p>
								</div>
							)}
						</div>
					)}

					{/* Actions */}
					{imageOptimizationEnabled && (
						<div className="flex flex-col justify-end gap-2 sm:flex-row">
							<Button onClick={handleReoptimizeImages} disabled={isOptimizing || isReoptimizing} variant="outline">
								<RefreshCw className={`w-4 h-4 mr-1 ${isReoptimizing ? 'animate-spin' : ''}`} />
								{isReoptimizing ? 'Re-optimizing...' : 'Re-optimize All Images'}
							</Button>
							<Button onClick={handleOptimizeImages} disabled={isOptimizing || isReoptimizing} variant="outline">
								<ImageIcon className={`w-4 h-4 mr-1 ${isOptimizing ? 'animate-spin' : ''}`} />
								{isOptimizing ? 'Optimizing...' : 'Optimize Images'}
							</Button>
						</div>
					)}
					{!imageOptimizationEnabled && (
						<div className="p-3 rounded-lg bg-muted">
							<p className="text-sm text-muted-foreground">Enable image optimization above to use manual optimization features.</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Export */}
			<Card>
				<CardHeader>
					<CardTitle>Export Data</CardTitle>
					<CardDescription>Download all receipts and files as a ZIP archive</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col justify-end gap-2 sm:flex-row">
						<Button onClick={handleExport} variant="outline">
							<Download className="w-4 h-4 mr-1" />
							Export All Receipts
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
