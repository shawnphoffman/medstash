import { useState, useEffect, useMemo } from 'react'
import {
	flagsApi,
	settingsApi,
	filenamesApi,
	usersApi,
	receiptTypesApi,
	receiptTypeGroupsApi,
	Flag,
	User,
	ReceiptType,
	ReceiptTypeGroup,
} from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { ColorPicker, TAILWIND_COLORS } from '../components/ui/color-picker'
import { FlagBadge } from '../components/FlagBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
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
	Move,
	GripVertical,
} from 'lucide-react'
import {
	DndContext,
	closestCenter,
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
	editGroupDisplayOrder,
	setEditGroupName,
	setEditGroupDisplayOrder,
	onEdit,
	onSave,
	onCancel,
	onDelete,
	children,
}: {
	group: ReceiptTypeGroup
	editingGroup: number | null
	editGroupName: string
	editGroupDisplayOrder: number
	setEditGroupName: (name: string) => void
	setEditGroupDisplayOrder: (order: number) => void
	onEdit: () => void
	onSave: () => void
	onCancel: () => void
	onDelete: () => void
	children: React.ReactNode
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `group-${group.id}` })
	const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: `group-${group.id}` })

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	}

	return (
		<div ref={setNodeRef} style={style} className="border rounded-lg">
			<div className="flex items-center justify-between p-1.5 bg-muted/50 border-b">
				{editingGroup === group.id ? (
					<div className="flex items-center flex-1 gap-2">
						<Input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} className="flex-1" />
						<Input
							type="number"
							value={editGroupDisplayOrder}
							onChange={e => setEditGroupDisplayOrder(parseInt(e.target.value) || 0)}
							className="w-24"
						/>
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
			<div ref={setDroppableRef} className={`p-3 space-y-2 ${isOver ? 'bg-primary/10 border-2 border-primary border-dashed' : ''}`}>
				{children}
			</div>
		</div>
	)
}

// Sortable Type Component
function SortableType({
	type,
	editingReceiptType,
	movingType,
	editReceiptTypeName,
	setEditReceiptTypeName,
	receiptTypeGroups,
	onEdit,
	onSave,
	onCancel,
	onMove,
	onCancelMove,
	onDelete,
	onMoveToGroup,
}: {
	type: ReceiptType
	editingReceiptType: number | null
	movingType: number | null
	editReceiptTypeName: string
	setEditReceiptTypeName: (name: string) => void
	receiptTypeGroups: ReceiptTypeGroup[]
	onEdit: () => void
	onSave: () => void
	onCancel: () => void
	onMove: () => void
	onCancelMove: () => void
	onDelete: () => void
	onMoveToGroup: (groupId: number | null) => void
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
			) : movingType === type.id ? (
				<div className="flex items-center flex-1 gap-2">
					<Select
						value={type.group_id?.toString() || 'ungrouped'}
						onValueChange={value => {
							const newGroupId = value === 'ungrouped' ? null : parseInt(value)
							onMoveToGroup(newGroupId)
						}}
					>
						<SelectTrigger className="flex-1">
							<SelectValue />
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
					<Button size="icon" variant="ghost" onClick={onCancelMove}>
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
						<Button size="icon" variant="ghost" onClick={onMove} title="Move to group">
							<Move className="size-4" />
						</Button>
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
	movingType,
	editReceiptTypeName,
	setEditReceiptTypeName,
	receiptTypeGroups,
	onEditType,
	onSaveType,
	onCancelEdit,
	onMoveType,
	onCancelMove,
	onDeleteType,
	onMoveToGroup,
}: {
	types: ReceiptType[]
	editingReceiptType: number | null
	movingType: number | null
	editReceiptTypeName: string
	setEditReceiptTypeName: (name: string) => void
	receiptTypeGroups: ReceiptTypeGroup[]
	onEditType: (type: ReceiptType) => void
	onSaveType: (id: number) => void
	onCancelEdit: () => void
	onMoveType: (id: number) => void
	onCancelMove: () => void
	onDeleteType: (id: number) => void
	onMoveToGroup: (typeId: number, groupId: number | null) => void
}) {
	const { setNodeRef, isOver } = useDroppable({ id: 'ungrouped' })

	if (types.length === 0 && !isOver) {
		return (
			<div ref={setNodeRef} className={`border rounded-lg ${isOver ? 'bg-primary/10 border-2 border-primary border-dashed' : ''}`}>
				<div className="p-3 border-b bg-muted/50">
					<h3 className="font-semibold">Ungrouped</h3>
				</div>
				<div className="py-8 text-sm text-center border-2 border-dashed text-muted-foreground">Drop types here</div>
			</div>
		)
	}

	return (
		<div ref={setNodeRef} className={`border rounded-lg ${isOver ? 'bg-primary/10 border-2 border-primary border-dashed' : ''}`}>
			<div className="p-3 border-b bg-muted/50">
				<h3 className="font-semibold">Ungrouped</h3>
			</div>
			<div className="p-3 space-y-2 xxx">
				<SortableContext items={types.map(t => `type-${t.id}`)} strategy={verticalListSortingStrategy}>
					{types.map(type => (
						<SortableType
							key={type.id}
							type={type}
							editingReceiptType={editingReceiptType}
							movingType={movingType}
							editReceiptTypeName={editReceiptTypeName}
							setEditReceiptTypeName={setEditReceiptTypeName}
							receiptTypeGroups={receiptTypeGroups}
							onEdit={() => onEditType(type)}
							onSave={() => onSaveType(type.id)}
							onCancel={onCancelEdit}
							onMove={() => onMoveType(type.id)}
							onCancelMove={onCancelMove}
							onDelete={() => onDeleteType(type.id)}
							onMoveToGroup={groupId => onMoveToGroup(type.id, groupId)}
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
	const [loading, setLoading] = useState(true)
	const [editingFlag, setEditingFlag] = useState<number | null>(null)
	const [editingUser, setEditingUser] = useState<number | null>(null)
	const [editingReceiptType, setEditingReceiptType] = useState<number | null>(null)
	const [editingGroup, setEditingGroup] = useState<number | null>(null)
	const [movingType, setMovingType] = useState<number | null>(null)
	const [newFlagName, setNewFlagName] = useState('')
	const [newFlagColor, setNewFlagColor] = useState<string>(TAILWIND_COLORS[0].value)
	const [editFlagName, setEditFlagName] = useState('')
	const [editFlagColor, setEditFlagColor] = useState('')
	const [editUserName, setEditUserName] = useState('')
	const [editReceiptTypeName, setEditReceiptTypeName] = useState('')
	const [editReceiptTypeGroupId, setEditReceiptTypeGroupId] = useState<number | null>(null)
	const [editGroupName, setEditGroupName] = useState('')
	const [editGroupDisplayOrder, setEditGroupDisplayOrder] = useState(0)
	const [newUser, setNewUser] = useState('')
	const [newReceiptType, setNewReceiptType] = useState('')
	const [newReceiptTypeGroupId, setNewReceiptTypeGroupId] = useState<number | null>(null)
	const [newGroupName, setNewGroupName] = useState('')
	const [newGroupDisplayOrder, setNewGroupDisplayOrder] = useState(0)
	const [activeId, setActiveId] = useState<string | null>(null)

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	)
	const [filenamePattern, setFilenamePattern] = useState(DEFAULT_FILENAME_PATTERN)
	const [originalPattern, setOriginalPattern] = useState(DEFAULT_FILENAME_PATTERN)
	const [patternError, setPatternError] = useState<string | null>(null)
	const [isRenaming, setIsRenaming] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		loadData()
	}, [])

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
			// Load filename pattern
			const pattern = settingsRes.data?.filenamePattern || DEFAULT_FILENAME_PATTERN
			setFilenamePattern(pattern)
			setOriginalPattern(pattern)
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to load settings')
		} finally {
			setLoading(false)
		}
	}

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
		if (!confirm('Are you sure you want to delete this flag?')) return

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
			setUsers(users.map(u => u.id === id ? updatedUser.data : u))
			setEditingUser(null)
			setEditUserName('')
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to update user')
		}
	}

	const handleDeleteUser = async (id: number) => {
		const user = users.find(u => u.id === id)
		if (!confirm(`Are you sure you want to delete user "${user?.name}"?`)) return

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
			const newGroup = await receiptTypeGroupsApi.create({ name: newGroupName.trim(), display_order: newGroupDisplayOrder })
			setReceiptTypeGroups([...receiptTypeGroups, newGroup.data].sort((a, b) => {
				if (a.display_order !== b.display_order) return a.display_order - b.display_order
				return a.name.localeCompare(b.name)
			}))
			setNewGroupName('')
			setNewGroupDisplayOrder(0)
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
			const updatedGroup = await receiptTypeGroupsApi.update(id, { name: editGroupName.trim(), display_order: editGroupDisplayOrder })
			setReceiptTypeGroups(receiptTypeGroups.map(g => g.id === id ? updatedGroup.data : g).sort((a, b) => {
				if (a.display_order !== b.display_order) return a.display_order - b.display_order
				return a.name.localeCompare(b.name)
			}))
			setEditingGroup(null)
			setEditGroupName('')
			setEditGroupDisplayOrder(0)
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to update group')
		}
	}

	const handleDeleteGroup = async (id: number) => {
		const group = receiptTypeGroups.find(g => g.id === id)
		if (!confirm(`Are you sure you want to delete group "${group?.name}"? All types in this group will be ungrouped.`)) return

		try {
			await receiptTypeGroupsApi.delete(id)
			setReceiptTypeGroups(receiptTypeGroups.filter(g => g.id !== id))
			// Update types that were in this group to have null group_id
			setReceiptTypes(receiptTypes.map(t => t.group_id === id ? { ...t, group_id: null } : t))
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to delete group')
		}
	}

	const startEditGroup = (group: ReceiptTypeGroup) => {
		setEditingGroup(group.id)
		setEditGroupName(group.name)
		setEditGroupDisplayOrder(group.display_order)
	}

	const cancelEditGroup = () => {
		setEditingGroup(null)
		setEditGroupName('')
		setEditGroupDisplayOrder(0)
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
			setReceiptTypes(receiptTypes.map(t => t.id === id ? updatedType.data : t))
			setEditingReceiptType(null)
			setEditReceiptTypeName('')
			setEditReceiptTypeGroupId(null)
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to update receipt type')
		}
	}

	const handleMoveReceiptType = async (typeId: number, groupId: number | null) => {
		try {
			const movedType = await receiptTypesApi.move(typeId, groupId)
			setReceiptTypes(receiptTypes.map(t => t.id === typeId ? movedType.data : t))
			setMovingType(null)
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to move receipt type')
		}
	}

	const handleDeleteReceiptType = async (id: number) => {
		const type = receiptTypes.find(t => t.id === id)
		if (!confirm(`Are you sure you want to delete receipt type "${type?.name}"?`)) return

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

	// Organize types by group
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
	}

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event
		setActiveId(null)

		if (!over) return

		const activeId = active.id as string
		const overId = over.id as string

		// Handle group reordering
		if (activeId.startsWith('group-') && overId.startsWith('group-')) {
			const activeGroupId = parseInt(activeId.replace('group-', ''))
			const overGroupId = parseInt(overId.replace('group-', ''))

			if (activeGroupId === overGroupId) return

			const activeIndex = typesByGroup.sortedGroups.findIndex(g => g.id === activeGroupId)
			const overIndex = typesByGroup.sortedGroups.findIndex(g => g.id === overGroupId)

			if (activeIndex === -1 || overIndex === -1) return

			const newGroups = arrayMove(typesByGroup.sortedGroups, activeIndex, overIndex)

			// Update display_order for all affected groups
			const updatedGroups: ReceiptTypeGroup[] = []
			for (let i = 0; i < newGroups.length; i++) {
				if (newGroups[i].display_order !== i) {
					try {
						const updated = await receiptTypeGroupsApi.update(newGroups[i].id, { display_order: i })
						updatedGroups.push(updated.data)
					} catch (err) {
						console.error(`Failed to update group ${newGroups[i].id}:`, err)
						updatedGroups.push(newGroups[i])
					}
				} else {
					updatedGroups.push(newGroups[i])
				}
			}
			setReceiptTypeGroups(updatedGroups.sort((a, b) => {
				if (a.display_order !== b.display_order) return a.display_order - b.display_order
				return a.name.localeCompare(b.name)
			}))
		}
		// Handle type reordering within same group
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

				// Update display_order for all affected types
				const updatedTypes: ReceiptType[] = []
				for (let i = 0; i < newTypes.length; i++) {
					if (newTypes[i].display_order !== i) {
						try {
							const updated = await receiptTypesApi.update(newTypes[i].id, { display_order: i })
							updatedTypes.push(updated.data)
						} catch (err) {
							console.error(`Failed to update type ${newTypes[i].id}:`, err)
							updatedTypes.push(newTypes[i])
						}
					} else {
						updatedTypes.push(newTypes[i])
					}
				}
				// Update the types in state
				const typeMap = new Map(updatedTypes.map(t => [t.id, t]))
				setReceiptTypes(receiptTypes.map(t => typeMap.get(t.id) || t))
			}
		}
		// Handle type moved to different group (dropped on group container or another type in that group)
		else if (activeId.startsWith('type-')) {
			const activeTypeId = parseInt(activeId.replace('type-', ''))
			const activeType = receiptTypes.find(t => t.id === activeTypeId)
			if (!activeType) return

			// Check if dropped on a group (either group header or type in that group)
			let targetGroupId: number | null = null

			if (overId.startsWith('group-')) {
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
				const typesInTargetGroup = targetGroupId ? typesByGroup.grouped[targetGroupId] || [] : typesByGroup.grouped.ungrouped || []
				const newDisplayOrder = typesInTargetGroup.length

				try {
					const movedType = await receiptTypesApi.move(activeTypeId, targetGroupId, newDisplayOrder)
					setReceiptTypes(receiptTypes.map(t => t.id === activeTypeId ? movedType.data : t))
				} catch (err) {
					console.error(`Failed to move type ${activeTypeId}:`, err)
				}
			}
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

		return `${preview}${sampleExt}`
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
				const shouldRename = confirm('Pattern saved successfully. Would you like to rename all existing files to match the new pattern?')
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

		if (!confirm('Are you sure you want to rename all existing files? This action cannot be undone.')) {
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
				alert(`Successfully renamed ${result.data.renamed} files.`)
			}
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to rename files')
		} finally {
			setIsRenaming(false)
		}
	}

	if (loading) {
		return <div className="py-8 text-center">Loading settings...</div>
	}

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			<div>
				<h2 className="text-3xl font-bold">Settings</h2>
				<p className="text-muted-foreground">Manage flags and application settings</p>
			</div>

			{error && <div className="p-4 rounded-md bg-destructive/10 text-destructive">{error}</div>}

			{/* Flags Management */}
			<Card>
				<CardHeader>
					<CardTitle>Custom Flags</CardTitle>
					<CardDescription>Create and manage custom flags for categorizing receipts</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Create New Flag */}
					<div className="flex gap-2 p-4 border rounded-lg">
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
							<div className="flex gap-2">
								<ColorPicker value={newFlagColor} onChange={color => setNewFlagColor(color)} />
								<Button onClick={handleCreateFlag}>
									<Plus className="w-4 h-4 mr-2" />
									Add Flag
								</Button>
							</div>
						</div>
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

			{/* Users Management */}
			<Card>
				<CardHeader>
					<CardTitle>Users</CardTitle>
					<CardDescription>Manage users for categorizing receipts</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-2">
						<Input
							placeholder="Enter user name"
							value={newUser}
							onChange={e => setNewUser(e.target.value)}
							onKeyDown={e => e.key === 'Enter' && handleAddUser()}
							className="flex-1"
						/>
						<Button onClick={handleAddUser}>
							<Plus className="w-4 h-4 mr-2" />
							Add User
						</Button>
					</div>
					<div className="space-y-2">
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

			{/* Receipt Type Groups Management */}
			<Card>
				<CardHeader>
					<CardTitle>Receipt Type Groups</CardTitle>
					<CardDescription>Organize receipt types into groups for better organization</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Create New Group */}
					<div className="p-4 space-y-3 border rounded-lg">
						<Label>Create New Group</Label>
						<div className="flex gap-2">
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
							<Input
								type="number"
								placeholder="Order"
								value={newGroupDisplayOrder}
								onChange={e => setNewGroupDisplayOrder(parseInt(e.target.value) || 0)}
								className="w-24"
							/>
							<Button type="button" onClick={handleCreateGroup}>
								<Plus className="w-4 h-4 mr-2" />
								Add Group
							</Button>
						</div>
					</div>

					{/* Groups List */}
					<DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
													editGroupDisplayOrder={editGroupDisplayOrder}
													setEditGroupName={setEditGroupName}
													setEditGroupDisplayOrder={setEditGroupDisplayOrder}
													onEdit={() => startEditGroup(group)}
													onSave={() => handleUpdateGroup(group.id)}
													onCancel={cancelEditGroup}
													onDelete={() => handleDeleteGroup(group.id)}
												>
													<div className="space-y-2 ">
														{typesInGroup.length > 0 ? (
															<SortableContext items={typesInGroup.map(t => `type-${t.id}`)} strategy={verticalListSortingStrategy}>
																{typesInGroup.map(type => (
																	<SortableType
																		key={type.id}
																		type={type}
																		editingReceiptType={editingReceiptType}
																		movingType={movingType}
																		editReceiptTypeName={editReceiptTypeName}
																		setEditReceiptTypeName={setEditReceiptTypeName}
																		receiptTypeGroups={receiptTypeGroups}
																		onEdit={() => startEditReceiptType(type)}
																		onSave={() => handleUpdateReceiptType(type.id)}
																		onCancel={cancelEditReceiptType}
																		onMove={() => setMovingType(type.id)}
																		onCancelMove={() => setMovingType(null)}
																		onDelete={() => handleDeleteReceiptType(type.id)}
																		onMoveToGroup={groupId => handleMoveReceiptType(type.id, groupId)}
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
										movingType={movingType}
										editReceiptTypeName={editReceiptTypeName}
										setEditReceiptTypeName={setEditReceiptTypeName}
										receiptTypeGroups={receiptTypeGroups}
										onEditType={type => startEditReceiptType(type)}
										onSaveType={id => handleUpdateReceiptType(id)}
										onCancelEdit={cancelEditReceiptType}
										onMoveType={id => setMovingType(id)}
										onCancelMove={() => setMovingType(null)}
										onDeleteType={id => handleDeleteReceiptType(id)}
										onMoveToGroup={(typeId, groupId) => handleMoveReceiptType(typeId, groupId)}
									/>
								</>
							)}
						</div>
						<DragOverlay>
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

					{/* Create New Type */}
					<div className="p-4 space-y-3 border rounded-lg">
						<Label>Create New Receipt Type</Label>
						<div className="flex gap-2">
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
								className="flex-1"
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
							<Button type="button" onClick={handleAddReceiptType}>
								<Plus className="w-4 h-4 mr-2" />
								Add Type
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Filename Pattern */}
			<Card>
				<CardHeader>
					<CardTitle>Filename Pattern</CardTitle>
					<CardDescription>Customize how receipt files are named. File extension is automatically appended.</CardDescription>
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
								<p className="mt-2 text-muted-foreground">Note: File extension is automatically appended and cannot be customized.</p>
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
					<div className="flex gap-2">
						<Button onClick={handleSavePattern} disabled={!!patternError || filenamePattern === originalPattern}>
							<Save className="w-4 h-4 mr-2" />
							Save Pattern
						</Button>
						<Button variant="outline" onClick={handleRenameAll} disabled={!!patternError || isRenaming}>
							<RefreshCw className={`w-4 h-4 mr-2 ${isRenaming ? 'animate-spin' : ''}`} />
							{isRenaming ? 'Renaming...' : 'Rename All Files'}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
