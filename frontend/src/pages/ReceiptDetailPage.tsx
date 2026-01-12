import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useToast } from '../components/ui/use-toast'
import {
	receiptsApi,
	flagsApi,
	usersApi,
	receiptTypesApi,
	receiptTypeGroupsApi,
	Receipt,
	Flag,
	UpdateReceiptInput,
	User,
	ReceiptType,
	ReceiptTypeGroup,
} from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../components/ui/select'
import { DatePicker } from '../components/DatePicker'
import { Badge } from '../components/ui/badge'
import { getBadgeClassName, getBorderClassName } from '../components/ui/color-picker'
import { ArrowLeft, Download, Trash2, Upload, X, File, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'
import { useConfirmDialog } from '../components/ConfirmDialog'

interface ReceiptFormData {
	user_id?: number
	receipt_type_id?: number
	amount?: string
	vendor?: string
	provider_address?: string
	description?: string
	date?: string
	notes?: string
	flag_ids: number[]
}

export default function ReceiptDetailPage() {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const { toast } = useToast()
	const [receipt, setReceipt] = useState<Receipt | null>(null)
	const [allReceipts, setAllReceipts] = useState<Receipt[]>([])
	const [flags, setFlags] = useState<Flag[]>([])
	const [users, setUsers] = useState<User[]>([])
	const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([])
	const [receiptTypeGroups, setReceiptTypeGroups] = useState<ReceiptTypeGroup[]>([])
	const [_loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [newFiles, setNewFiles] = useState<File[]>([])
	const [filePreviews, setFilePreviews] = useState<Map<number, string>>(new Map())
	const [existingFilePreviews, setExistingFilePreviews] = useState<Map<number, string>>(new Map())
	const [failedFilePreviews, setFailedFilePreviews] = useState<Set<number>>(new Set())
	const [filesToDelete, setFilesToDelete] = useState<Set<number>>(new Set())
	const [replacingFileId, setReplacingFileId] = useState<number | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const fileReplaceInputRefs = useRef<Map<number, HTMLInputElement>>(new Map())
	const { confirm, ConfirmDialog } = useConfirmDialog()

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		setValue,
		watch,
	} = useForm<ReceiptFormData>({
		defaultValues: {
			flag_ids: [],
		},
	})

	const selectedFlagIds = watch('flag_ids') || []

	useEffect(() => {
		if (id) {
			loadData()
		}
	}, [id])

	// Find current receipt index in sorted list - use id from params to avoid stale data
	const currentReceiptIndex = id && allReceipts.length > 0 ? allReceipts.findIndex(r => r.id === parseInt(id)) : -1

	const hasPrevious = currentReceiptIndex > 0
	const hasNext = currentReceiptIndex >= 0 && currentReceiptIndex < allReceipts.length - 1

	const handlePrevious = useCallback(() => {
		if (!id || allReceipts.length === 0) return
		const currentIndex = allReceipts.findIndex(r => r.id === parseInt(id))
		if (currentIndex > 0) {
			const previousReceipt = allReceipts[currentIndex - 1]
			navigate(`/receipts/${previousReceipt.id}`)
		}
	}, [id, allReceipts, navigate])

	const handleNext = useCallback(() => {
		if (!id || allReceipts.length === 0) return
		const currentIndex = allReceipts.findIndex(r => r.id === parseInt(id))
		if (currentIndex >= 0 && currentIndex < allReceipts.length - 1) {
			const nextReceipt = allReceipts[currentIndex + 1]
			navigate(`/receipts/${nextReceipt.id}`)
		}
	}, [id, allReceipts, navigate])

	// Keyboard navigation with arrow keys
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Check if user is in a form input
			const activeElement = document.activeElement
			const isInInput =
				activeElement &&
				(activeElement.tagName === 'INPUT' ||
					activeElement.tagName === 'TEXTAREA' ||
					activeElement.tagName === 'SELECT' ||
					activeElement.getAttribute('contenteditable') === 'true')

			// Only handle arrow keys if not in an input
			if (!isInInput) {
				// Recalculate index on each keypress to avoid stale data
				if (!id || allReceipts.length === 0) return
				const currentIndex = allReceipts.findIndex(r => r.id === parseInt(id))

				if (e.key === 'ArrowLeft' && currentIndex >= 0 && currentIndex < allReceipts.length - 1) {
					e.preventDefault()
					const nextReceipt = allReceipts[currentIndex + 1]
					navigate(`/receipts/${nextReceipt.id}`)
				} else if (e.key === 'ArrowRight' && currentIndex > 0) {
					e.preventDefault()
					const previousReceipt = allReceipts[currentIndex - 1]
					navigate(`/receipts/${previousReceipt.id}`)
				}
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [id, allReceipts, navigate])

	const loadData = async () => {
		if (!id) return

		try {
			setLoading(true)
			const [receiptRes, allReceiptsRes, flagsRes, usersRes, receiptTypesRes, groupsRes] = await Promise.all([
				receiptsApi.getById(parseInt(id)),
				receiptsApi.getAll(),
				flagsApi.getAll(),
				usersApi.getAll(),
				receiptTypesApi.getAll(),
				receiptTypeGroupsApi.getAll(),
			])

			const receiptData = receiptRes.data
			setReceipt(receiptData)

			// Sort all receipts by date descending (newest first) to match receipts page default
			const sortedReceipts = [...allReceiptsRes.data].sort((a, b) => {
				const aDate = new Date(a.date).getTime()
				const bDate = new Date(b.date).getTime()
				return bDate - aDate
			})
			setAllReceipts(sortedReceipts)

			setFlags(flagsRes.data)
			setUsers(usersRes.data)
			setReceiptTypes(receiptTypesRes.data)
			setReceiptTypeGroups(groupsRes.data)

			// Populate form
			reset({
				user_id: receiptData.user_id,
				receipt_type_id: receiptData.receipt_type_id,
				amount: receiptData.amount.toString(),
				vendor: receiptData.vendor,
				provider_address: receiptData.provider_address,
				description: receiptData.description,
				date: receiptData.date,
				notes: receiptData.notes || '',
				flag_ids: receiptData.flags.map(f => f.id),
			})

			// Generate preview URLs for existing files
			if (receiptData.files.length > 0 && id) {
				const previews = new Map<number, string>()
				receiptData.files.forEach(file => {
					const previewUrl = `/api/receipts/${id}/files/${file.id}`
					previews.set(file.id, previewUrl)
				})
				setExistingFilePreviews(previews)
				// Reset failed previews when loading new data
				setFailedFilePreviews(new Set())
			}

			// Reset files marked for deletion when loading new data
			setFilesToDelete(new Set())
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to load receipt')
		} finally {
			setLoading(false)
		}
	}

	// Generate preview for new files
	const generatePreview = useCallback((file: File, index: number) => {
		if (file.type.startsWith('image/')) {
			const reader = new FileReader()
			reader.onload = e => {
				const result = e.target?.result as string
				setFilePreviews(prev => {
					const newMap = new Map(prev)
					newMap.set(index, result)
					return newMap
				})
			}
			reader.readAsDataURL(file)
		} else if (file.type === 'application/pdf') {
			const objectUrl = URL.createObjectURL(file)
			setFilePreviews(prev => {
				const newMap = new Map(prev)
				newMap.set(index, objectUrl)
				return newMap
			})
		}
	}, [])

	const onFileInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (e.target.files) {
				const selectedFiles = Array.from(e.target.files)
				setNewFiles(prev => {
					const newFiles = [...prev, ...selectedFiles]
					selectedFiles.forEach((file, offset) => {
						generatePreview(file, prev.length + offset)
					})
					return newFiles
				})
			}
			// Reset input so the same file can be selected again
			e.target.value = ''
		},
		[generatePreview]
	)

	const removeNewFile = (index: number) => {
		const preview = filePreviews.get(index)
		if (preview && preview.startsWith('blob:')) {
			URL.revokeObjectURL(preview)
		}
		setFilePreviews(prev => {
			const newMap = new Map<number, string>()
			let newIndex = 0
			newFiles.forEach((_, i) => {
				if (i !== index && prev.has(i)) {
					newMap.set(newIndex, prev.get(i)!)
					newIndex++
				}
			})
			return newMap
		})
		setNewFiles(prev => prev.filter((_, i) => i !== index))
	}

	const toggleFlag = (flagId: number) => {
		const current = selectedFlagIds
		const newIds = current.includes(flagId) ? current.filter(id => id !== flagId) : [...current, flagId]
		setValue('flag_ids', newIds)
	}

	const validateAmount = (value: string | undefined): boolean | string => {
		if (!value || value.trim() === '') {
			return true
		}
		const cleaned = value.replace(/[$,\s]/g, '')
		const numValue = parseFloat(cleaned)
		if (isNaN(numValue)) {
			return 'Please enter a valid number'
		}
		if (numValue < 0) {
			return 'Amount cannot be negative'
		}
		const decimalParts = cleaned.split('.')
		if (decimalParts.length > 1 && decimalParts[1].length > 2) {
			return 'Amount cannot have more than 2 decimal places'
		}
		return true
	}

	const onSubmit = async (data: ReceiptFormData) => {
		if (!id) return

		setSaving(true)
		setError(null)

		try {
			// Clean and parse amount
			let amount = 0
			if (data.amount) {
				const cleaned = data.amount.replace(/[$,\s]/g, '')
				amount = parseFloat(cleaned) || 0
			}

			const updateData: UpdateReceiptInput = {
				user_id: data.user_id,
				receipt_type_id: data.receipt_type_id,
				amount: amount,
				vendor: data.vendor,
				provider_address: data.provider_address,
				description: data.description,
				date: data.date,
				notes: data.notes || undefined,
				flag_ids: selectedFlagIds,
			}

			// Update receipt
			const updatedReceiptResponse = await receiptsApi.update(parseInt(id), updateData)
			const updatedReceipt = updatedReceiptResponse.data

			// Delete files marked for deletion
			if (filesToDelete.size > 0) {
				for (const fileId of filesToDelete) {
					await receiptsApi.deleteFile(parseInt(id), fileId)
				}
			}

			// Add new files if any (use updated receipt data for file naming)
			if (newFiles.length > 0 && updatedReceipt) {
				await receiptsApi.addFiles(parseInt(id), newFiles, {
					date: updatedReceipt.date,
					user: updatedReceipt.user,
					vendor: updatedReceipt.vendor,
					amount: updatedReceipt.amount,
					type: updatedReceipt.type,
				})
			}

			// Clean up preview URLs
			filePreviews.forEach(url => {
				if (url.startsWith('blob:')) {
					URL.revokeObjectURL(url)
				}
			})

			setNewFiles([])
			setFilePreviews(new Map())
			setFilesToDelete(new Set())

			// Show success toast and navigate
			toast({
				title: 'Success',
				description: 'Receipt updated successfully',
			})
			navigate('/')
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to update receipt')
		} finally {
			setSaving(false)
		}
	}

	const handleDeleteFile = (fileId: number) => {
		// Mark file for deletion (will be deleted when form is saved)
		setFilesToDelete(prev => new Set(prev).add(fileId))
	}

	const handleRestoreFile = (fileId: number) => {
		// Remove file from deletion list
		setFilesToDelete(prev => {
			const newSet = new Set(prev)
			newSet.delete(fileId)
			return newSet
		})
	}

	const handleDownloadFile = async (fileId: number, filename: string) => {
		if (!id) return

		try {
			const response = await receiptsApi.downloadFile(parseInt(id), fileId)

			// Check if response is actually a blob (success) or an error JSON
			if (response.data instanceof Blob && response.data.size === 0) {
				toast({
					title: 'Download Failed',
					description: 'The file appears to be empty or could not be retrieved.',
					variant: 'destructive',
				})
				return
			}

			const url = window.URL.createObjectURL(new Blob([response.data]))
			const link = document.createElement('a')
			link.href = url
			link.setAttribute('download', filename)
			document.body.appendChild(link)
			link.click()
			link.remove()
			window.URL.revokeObjectURL(url)

			toast({
				title: 'Download Started',
				description: `Downloading ${filename}...`,
			})
		} catch (err: any) {
			const errorMessage =
				err.response?.data?.error || err.message || 'Failed to download file. The file may not exist or may have been deleted.'

			// Mark file as failed if it's a 404 (file not found)
			if (err.response?.status === 404) {
				setFailedFilePreviews(prev => new Set(prev).add(fileId))
				// Don't show toast for missing files - the preview indication is enough
				return
			}

			toast({
				title: 'Download Failed',
				description: errorMessage,
				variant: 'destructive',
			})
			setError(errorMessage)
		}
	}

	const handleReplaceFile = async (fileId: number, file: File) => {
		if (!id) return

		try {
			setReplacingFileId(fileId)
			const updatedReceipt = await receiptsApi.replaceFile(parseInt(id), fileId, file)
			setReceipt(updatedReceipt.data)

			// Remove from failed previews and regenerate preview
			setFailedFilePreviews(prev => {
				const newSet = new Set(prev)
				newSet.delete(fileId)
				return newSet
			})

			// Regenerate preview URL
			const previewUrl = `/api/receipts/${id}/files/${fileId}`
			setExistingFilePreviews(prev => {
				const newMap = new Map(prev)
				newMap.set(fileId, previewUrl)
				return newMap
			})

			toast({
				title: 'Success',
				description: 'File replaced successfully',
			})
		} catch (err: any) {
			const errorMessage = err.response?.data?.error || err.message || 'Failed to replace file'
			toast({
				title: 'Replace Failed',
				description: errorMessage,
				variant: 'destructive',
			})
			setError(errorMessage)
		} finally {
			setReplacingFileId(null)
		}
	}

	const handleReplaceFileInput = (fileId: number, e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			const file = e.target.files[0]
			handleReplaceFile(fileId, file)
			// Reset input so the same file can be selected again
			e.target.value = ''
		}
	}

	const handleDeleteReceipt = async () => {
		if (!id) return
		const confirmed = await confirm({
			message: 'Are you sure you want to delete this receipt? This action cannot be undone.',
			variant: 'destructive',
		})
		if (!confirmed) return

		try {
			await receiptsApi.delete(parseInt(id))
			navigate('/')
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to delete receipt')
		}
	}

	// if (loading) {
	// 	return <div className="py-8 text-center">Loading receipt...</div>
	// }

	if (!receipt) {
		return (
			<div className="py-8 text-center">
				<p className="text-muted-foreground">Receipt not found</p>
				<Button onClick={() => navigate('/')} className="mt-4" variant="outline">
					<ArrowLeft className="w-4 h-4 mr-1" />
					Back
				</Button>
			</div>
		)
	}

	return (
		<div className="w-full sm:px-4">
			{ConfirmDialog}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={() => navigate('/')}>
						<ArrowLeft className="w-4 h-4 mr-1" />
						Back
					</Button>
					<div className="flex items-center gap-1">
						<Button variant="outline" size="icon" onClick={handleNext} disabled={!hasNext} title="Next receipt">
							<ChevronLeft className="w-4 h-4" />
						</Button>
						<Button variant="outline" size="icon" onClick={handlePrevious} disabled={!hasPrevious} title="Previous receipt">
							<ChevronRight className="w-4 h-4" />
						</Button>
					</div>
				</div>

				<div className="flex gap-2">
					<Button variant="destructive" onClick={handleDeleteReceipt}>
						<Trash2 className="w-4 h-4 mr-1" />
						Delete
					</Button>
					<Button type="submit" form="receipt-form" disabled={saving}>
						{saving ? 'Saving...' : 'Save'}
					</Button>
				</div>
			</div>

			<div className="flex flex-col max-w-full gap-6 lg:flex-row">
				{/* Main Form */}
				<div className="flex-1 min-w-0">
					<Card>
						<CardHeader>
							<CardTitle>Edit Receipt ({id})</CardTitle>
							<CardDescription>Update receipt information and manage files</CardDescription>
						</CardHeader>
						<CardContent>
							<form id="receipt-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
								{/* Basic Info */}
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label htmlFor="user_id">User</Label>
										{users.length > 1 ? (
											<Select
												value={watch('user_id')?.toString() || ''}
												onValueChange={value => setValue('user_id', parseInt(value), { shouldValidate: true })}
											>
												<SelectTrigger id="user_id">
													<SelectValue placeholder="Select a user..." />
												</SelectTrigger>
												<SelectContent>
													{users.map(user => (
														<SelectItem key={user.id} value={user.id.toString()}>
															{user.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										) : users.length === 1 ? (
											<Input id="user_id" value={users[0].name} readOnly className="cursor-not-allowed bg-muted" />
										) : (
											<Input id="user_id" placeholder="No users available" disabled />
										)}
									</div>
									<div>
										<Label htmlFor="receipt_type_id">Receipt Type</Label>
										{receiptTypes.length > 1 ? (
											<Select
												value={watch('receipt_type_id')?.toString() || ''}
												onValueChange={value => setValue('receipt_type_id', value ? parseInt(value) : undefined, { shouldValidate: true })}
											>
												<SelectTrigger id="receipt_type_id">
													<SelectValue placeholder="Select a type..." />
												</SelectTrigger>
												<SelectContent>
													{(() => {
														// Organize types by group
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

														// Render grouped options
														const hasGroups = sortedGroups.length > 0 && sortedGroups.some(g => grouped[g.id]?.length > 0)
														const hasUngrouped = grouped.ungrouped.length > 0

														if (!hasGroups && !hasUngrouped) {
															return receiptTypes.map(type => (
																<SelectItem key={type.id} value={type.id.toString()}>
																	{type.name}
																</SelectItem>
															))
														}

														return (
															<>
																{sortedGroups.map(group => {
																	const typesInGroup = grouped[group.id] || []
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
																		<SelectLabel>Ungrouped</SelectLabel>
																		{grouped.ungrouped.map(type => (
																			<SelectItem key={type.id} value={type.id.toString()}>
																				{type.name}
																			</SelectItem>
																		))}
																	</SelectGroup>
																)}
															</>
														)
													})()}
												</SelectContent>
											</Select>
										) : receiptTypes.length === 1 ? (
											<Input id="receipt_type_id" value={receiptTypes[0].name} readOnly className="cursor-not-allowed bg-muted" />
										) : (
											<Input id="receipt_type_id" placeholder="No types available" disabled />
										)}
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label htmlFor="date">Date of Service</Label>
										<DatePicker id="date" value={watch('date')} onChange={value => setValue('date', value, { shouldValidate: true })} />
									</div>
									<div>
										<Label htmlFor="amount">Amount Paid</Label>
										<div className="relative">
											<span className="absolute -translate-y-1/2 left-3 top-1/2 text-muted-foreground">$</span>
											<Input
												id="amount"
												type="text"
												inputMode="decimal"
												{...(() => {
													const { onChange, ...rest } = register('amount', {
														validate: validateAmount,
													})
													return {
														...rest,
														onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
															const value = e.target.value.replace(/[^0-9.,\s]/g, '')
															e.target.value = value
															onChange(e)
															setValue('amount', value, { shouldValidate: true })
														},
													}
												})()}
												placeholder="0.00"
												className="pl-7"
											/>
										</div>
										{errors.amount && <p className="mt-1 text-sm text-destructive">{errors.amount.message as string}</p>}
									</div>
								</div>

								<div>
									<Label htmlFor="description">Description</Label>
									<Textarea id="description" {...register('description')} placeholder="Description of service or item purchased" rows={3} />
								</div>

								<div>
									<Label htmlFor="vendor">Provider Name</Label>
									<Input id="vendor" {...register('vendor')} placeholder="CVS Pharmacy" />
								</div>

								<div>
									<Label htmlFor="provider_address">Provider Address</Label>
									<Textarea id="provider_address" {...register('provider_address')} placeholder="123 Main St, City, State ZIP" rows={2} />
								</div>

								<div>
									<Label htmlFor="notes">Notes (Optional)</Label>
									<Textarea id="notes" {...register('notes')} placeholder="Additional notes" rows={2} />
								</div>

								{/* Flags */}
								{flags.length > 0 && (
									<div>
										<Label>Flags</Label>
										<div className="flex flex-wrap gap-2 mt-2">
											{flags.map(flag => (
												<Button
													key={flag.id}
													type="button"
													variant={'outline'}
													size="sm"
													onClick={() => toggleFlag(flag.id)}
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
									</div>
								)}

								{/* Existing Files */}
								<div>
									<Label>Existing Files</Label>
									<div className="mt-2 space-y-2">
										{receipt.files.length === 0 ? (
											<p className="text-sm text-muted-foreground">No files attached</p>
										) : (
											receipt.files.map(file => {
												const isMarkedForDeletion = filesToDelete.has(file.id)
												const filenameChanged = file.filename !== file.original_filename
												return (
													<div
														key={file.id}
														className={cn(
															'flex items-center justify-between p-2 rounded border bg-muted/50',
															isMarkedForDeletion && 'border-destructive border-2 bg-destructive/5'
														)}
													>
														<div className="flex flex-col flex-1 min-w-0 gap-1">
															<div className="flex items-center gap-2">
																<File className={cn('w-4 h-4 flex-shrink-0', isMarkedForDeletion && 'text-destructive')} />
																<span
																	className={cn('text-sm font-medium truncate', isMarkedForDeletion && 'text-destructive line-through')}
																>
																	{file.filename}
																</span>
															</div>
															{filenameChanged && (
																<span className="ml-6 text-xs truncate text-muted-foreground">Original: {file.original_filename}</span>
															)}
														</div>
														<div className="flex gap-2">
															{!isMarkedForDeletion && (
																<>
																	{!failedFilePreviews.has(file.id) && (
																		<Button
																			type="button"
																			variant="ghost"
																			size="icon"
																			onClick={() => handleDownloadFile(file.id, file.original_filename)}
																		>
																			<Download className="w-4 h-4" />
																		</Button>
																	)}
																	{failedFilePreviews.has(file.id) && (
																		<>
																			<input
																				type="file"
																				ref={el => {
																					if (el) {
																						fileReplaceInputRefs.current.set(file.id, el)
																					} else {
																						fileReplaceInputRefs.current.delete(file.id)
																					}
																				}}
																				onChange={e => handleReplaceFileInput(file.id, e)}
																				className="hidden"
																				accept="image/*,.pdf"
																				id={`replace-file-${file.id}`}
																			/>
																			<Button
																				type="button"
																				variant="outline"
																				size="sm"
																				onClick={() => fileReplaceInputRefs.current.get(file.id)?.click()}
																				disabled={replacingFileId === file.id}
																			>
																				{replacingFileId === file.id ? (
																					<>Replacing...</>
																				) : (
																					<>
																						<Upload className="w-4 h-4 mr-1" />
																						Replace
																					</>
																				)}
																			</Button>
																		</>
																	)}
																</>
															)}
															<Button
																type="button"
																variant="ghost"
																size="icon"
																onClick={() => (isMarkedForDeletion ? handleRestoreFile(file.id) : handleDeleteFile(file.id))}
																className={cn(
																	isMarkedForDeletion ? 'text-primary hover:text-primary' : 'text-destructive hover:text-destructive'
																)}
															>
																{isMarkedForDeletion ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
															</Button>
														</div>
													</div>
												)
											})
										)}
									</div>
								</div>

								{/* Add New Files */}
								<div>
									<Label>Add Files</Label>
									<div className="mt-2">
										<input
											ref={fileInputRef}
											type="file"
											multiple
											onChange={onFileInput}
											className="hidden"
											id="add-files-input"
											accept="image/*,.pdf"
										/>
										<Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
											<Upload className="w-4 h-4 mr-1" />
											Select Files
										</Button>
									</div>
									{newFiles.length > 0 && (
										<div className="mt-4 space-y-2">
											{newFiles.map((file, index) => (
												<div
													key={index}
													className="flex items-center justify-between p-2 border-2 border-dashed rounded border-primary/50 bg-primary/5"
												>
													<div className="flex items-center flex-1 min-w-0 gap-2">
														<File className="flex-shrink-0 w-4 h-4" />
														<span className="text-sm truncate">{file.name}</span>
														<Badge variant="secondary" className="ml-2 text-xs">
															New
														</Badge>
													</div>
													<div className="flex items-center gap-2">
														<span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															onClick={() => removeNewFile(index)}
															className="flex-shrink-0"
														>
															<X className="w-4 h-4" />
														</Button>
													</div>
												</div>
											))}
										</div>
									)}
								</div>

								{error && <div className="p-4 rounded-md bg-destructive/10 text-destructive">{error}</div>}

								<div className="flex flex-col justify-end gap-4 sm:flex-row">
									<Button
										type="button"
										variant="outline"
										onClick={() => {
											setFilesToDelete(new Set())
											setNewFiles([])
											setFilePreviews(new Map())
											navigate('/')
										}}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={saving}>
										{saving ? 'Saving...' : 'Save'}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</div>

				{/* Preview Sidebar - Only on widescreens */}
				{(receipt.files.length > 0 || newFiles.length > 0) && (
					<div className="flex-shrink-0">
						<Card>
							<CardHeader>
								<CardTitle>File Previews</CardTitle>
								<CardDescription>Preview of existing and new files</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{/* Existing Files Previews */}
									{receipt.files.map(file => {
										const previewUrl = existingFilePreviews.get(file.id)
										const isImage = file.original_filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)
										const isPdf = file.original_filename.match(/\.pdf$/i)
										const isMarkedForDeletion = filesToDelete.has(file.id)
										const filenameChanged = file.filename !== file.original_filename

										return (
											<div
												key={file.id}
												className={cn('overflow-hidden border rounded-lg', isMarkedForDeletion && 'border-destructive border-2')}
											>
												<div className={cn('p-2 border-b', isMarkedForDeletion ? 'bg-destructive/10' : 'bg-muted')}>
													<div className="flex flex-col gap-1">
														<div className="flex items-center gap-2">
															<File className={cn('w-4 h-4 flex-shrink-0', isMarkedForDeletion && 'text-destructive')} />
															<span className={cn('text-sm font-medium truncate', isMarkedForDeletion && 'text-destructive line-through')}>
																{file.filename}
															</span>
														</div>
														{filenameChanged && (
															<span className="ml-6 text-xs truncate text-muted-foreground">Original: {file.original_filename}</span>
														)}
													</div>
												</div>
												<div className="bg-background">
													{previewUrl && isImage && !failedFilePreviews.has(file.id) ? (
														<img
															src={previewUrl}
															alt={file.original_filename}
															className="object-contain w-full h-auto max-h-96"
															onError={() => {
																setFailedFilePreviews(prev => new Set(prev).add(file.id))
															}}
														/>
													) : previewUrl && isPdf && !failedFilePreviews.has(file.id) ? (
														<iframe src={previewUrl} className="w-full border-0 h-96" title={file.original_filename} />
													) : failedFilePreviews.has(file.id) ? (
														<div className="flex items-center justify-center w-full h-96 bg-muted">
															<div className="text-center">
																<File className="w-12 h-12 mx-auto mb-2 text-destructive" />
																<p className="text-sm text-destructive">File not available</p>
																<p className="mb-4 text-xs text-muted-foreground">The file may have been deleted or moved</p>
																<input
																	type="file"
																	ref={el => {
																		if (el) {
																			fileReplaceInputRefs.current.set(file.id, el)
																		} else {
																			fileReplaceInputRefs.current.delete(file.id)
																		}
																	}}
																	onChange={e => handleReplaceFileInput(file.id, e)}
																	className="hidden"
																	accept="image/*,.pdf"
																	id={`replace-file-preview-${file.id}`}
																/>
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	onClick={() => fileReplaceInputRefs.current.get(file.id)?.click()}
																	disabled={replacingFileId === file.id}
																>
																	{replacingFileId === file.id ? (
																		<>Replacing...</>
																	) : (
																		<>
																			<Upload className="w-4 h-4 mr-1" />
																			Replace File
																		</>
																	)}
																</Button>
															</div>
														</div>
													) : (
														<div className="flex items-center justify-center w-full h-48 bg-muted">
															<File className="w-8 h-8 text-muted-foreground" />
														</div>
													)}
												</div>
											</div>
										)
									})}

									{/* New Files Previews - Different style */}
									{newFiles.map((file, index) => {
										const preview = filePreviews.get(index)
										const isImage = file.type.startsWith('image/')
										const isPdf = file.type === 'application/pdf'

										return (
											<div
												key={`new-${index}`}
												className="overflow-hidden border-2 border-dashed rounded-lg border-primary/50 bg-primary/5"
											>
												<div className="p-2 border-b bg-primary/10">
													<div className="flex items-center gap-2">
														<File className="flex-shrink-0 w-4 h-4" />
														<span className="text-sm font-medium truncate">{file.name}</span>
														<Badge variant="secondary" className="ml-2 text-xs">
															New
														</Badge>
													</div>
												</div>
												<div className="bg-background">
													{preview && isImage ? (
														<img src={preview} alt={file.name} className="object-contain w-full h-auto max-h-96" />
													) : isPdf && preview ? (
														<iframe src={preview} className="w-full border-0 h-96" title={file.name} />
													) : isPdf ? (
														<div className="flex items-center justify-center w-full h-96 bg-muted">
															<div className="text-center">
																<File className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
																<p className="text-sm text-muted-foreground">Loading PDF preview...</p>
															</div>
														</div>
													) : (
														<div className="flex items-center justify-center w-full h-48 bg-muted">
															<File className="w-8 h-8 text-muted-foreground" />
														</div>
													)}
												</div>
											</div>
										)
									})}
								</div>
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</div>
	)
}
