import { useState, useEffect, useMemo } from 'react'
import { flagsApi, settingsApi, filenamesApi, usersApi, receiptTypesApi, Flag, User, ReceiptType } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { ColorPicker, TAILWIND_COLORS } from '../components/ui/color-picker'
import { FlagBadge } from '../components/FlagBadge'
import { Plus, Trash2, Edit2, Save, X, RefreshCw, Info, Flag as FlagIcon } from 'lucide-react'

export default function SettingsPage() {
	const [flags, setFlags] = useState<Flag[]>([])
	const [users, setUsers] = useState<User[]>([])
	const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([])
	const [loading, setLoading] = useState(true)
	const [editingFlag, setEditingFlag] = useState<number | null>(null)
	const [editingUser, setEditingUser] = useState<number | null>(null)
	const [editingReceiptType, setEditingReceiptType] = useState<number | null>(null)
	const [newFlagName, setNewFlagName] = useState('')
	const [newFlagColor, setNewFlagColor] = useState<string>(TAILWIND_COLORS[0].value)
	const [editFlagName, setEditFlagName] = useState('')
	const [editFlagColor, setEditFlagColor] = useState('')
	const [editUserName, setEditUserName] = useState('')
	const [editReceiptTypeName, setEditReceiptTypeName] = useState('')
	const [newUser, setNewUser] = useState('')
	const [newReceiptType, setNewReceiptType] = useState('')
	const [filenamePattern, setFilenamePattern] = useState('{date}_{user}_{vendor}_{amount}_{type}_{index}')
	const [originalPattern, setOriginalPattern] = useState('{date}_{user}_{vendor}_{amount}_{type}_{index}')
	const [patternError, setPatternError] = useState<string | null>(null)
	const [isRenaming, setIsRenaming] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		loadData()
	}, [])

	const loadData = async () => {
		try {
			setLoading(true)
			const [flagsRes, usersRes, receiptTypesRes, settingsRes] = await Promise.all([
				flagsApi.getAll(),
				usersApi.getAll(),
				receiptTypesApi.getAll(),
				settingsApi.getAll(),
			])
			setFlags(flagsRes.data)
			setUsers(usersRes.data)
			setReceiptTypes(receiptTypesRes.data)
			// Load filename pattern
			const pattern = settingsRes.data?.filenamePattern || '{date}_{user}_{vendor}_{amount}_{type}_{index}'
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
			await usersApi.update(id, { name: editUserName.trim() })
			setEditingUser(null)
			setEditUserName('')
			await loadData()
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

	const handleAddReceiptType = async () => {
		if (!newReceiptType.trim()) {
			setError('Receipt type is required')
			return
		}
		if (receiptTypes.some(t => t.name === newReceiptType.trim())) {
			setError('Receipt type already exists')
			return
		}

		try {
			const newTypeData = await receiptTypesApi.create({ name: newReceiptType.trim() })
			setReceiptTypes([...receiptTypes, newTypeData.data])
			setNewReceiptType('')
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
			await receiptTypesApi.update(id, { name: editReceiptTypeName.trim() })
			setEditingReceiptType(null)
			setEditReceiptTypeName('')
			await loadData()
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to update receipt type')
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
	}

	const cancelEditReceiptType = () => {
		setEditingReceiptType(null)
		setEditReceiptTypeName('')
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

			{/* Receipt Types Management */}
			<Card>
				<CardHeader>
					<CardTitle>Receipt Types</CardTitle>
					<CardDescription>Manage receipt types for categorizing receipts</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-2">
						<Input
							placeholder="e.g., Prescription, Doctor Visit, Lab Test"
							value={newReceiptType}
							onChange={e => setNewReceiptType(e.target.value)}
							onKeyDown={e => e.key === 'Enter' && handleAddReceiptType()}
							className="flex-1"
						/>
						<Button onClick={handleAddReceiptType}>
							<Plus className="w-4 h-4 mr-2" />
							Add Type
						</Button>
					</div>
					<div className="space-y-2">
						{receiptTypes.length === 0 ? (
							<p className="py-4 text-sm text-center text-muted-foreground">No receipt types configured yet</p>
						) : (
							receiptTypes.map(type => (
								<div key={type.id} className="flex items-center justify-between px-3 py-1 border rounded-lg">
									{editingReceiptType === type.id ? (
										<div className="flex items-center flex-1 gap-2">
											<Input value={editReceiptTypeName} onChange={e => setEditReceiptTypeName(e.target.value)} className="flex-1" />
											<Button size="icon" variant="ghost" onClick={() => handleUpdateReceiptType(type.id)}>
												<Save className="size-4" />
											</Button>
											<Button size="icon" variant="ghost" onClick={cancelEditReceiptType}>
												<X className="size-4" />
											</Button>
										</div>
									) : (
										<>
											<span className="font-medium">{type.name}</span>
											<div className="flex gap-2">
												<Button size="icon" variant="ghost" onClick={() => startEditReceiptType(type)}>
													<Edit2 className="size-4" />
												</Button>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => handleDeleteReceiptType(type.id)}
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

			{/* Filename Pattern */}
			<Card>
				<CardHeader>
					<CardTitle>Filename Pattern</CardTitle>
					<CardDescription>Customize how receipt files are named. File extension is automatically appended.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="filename-pattern">Pattern</Label>
						<Input
							id="filename-pattern"
							placeholder="{date}_{user}_{vendor}_{amount}_{type}_{index}"
							value={filenamePattern}
							onChange={e => handlePatternChange(e.target.value)}
							onKeyDown={e => e.key === 'Enter' && !patternError && handleSavePattern()}
							className={patternError ? 'border-destructive' : ''}
						/>
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
