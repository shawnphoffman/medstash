import { useState, useCallback, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
	receiptsApi,
	flagsApi,
	usersApi,
	receiptTypesApi,
	receiptTypeGroupsApi,
	CreateReceiptInput,
	Flag,
	User,
	ReceiptType,
	ReceiptTypeGroup,
} from '../lib/api'
import { useToast } from '../components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../components/ui/select'
import { DatePicker } from '../components/DatePicker'
import { getBadgeClassName, getBorderClassName } from '../components/ui/color-picker'
import { Upload, X, File } from 'lucide-react'
import { cn } from '../lib/utils'

interface UploadFormData {
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

export default function UploadPage() {
	const navigate = useNavigate()
	const { toast } = useToast()
	const [files, setFiles] = useState<File[]>([])
	const [filePreviews, setFilePreviews] = useState<Map<number, string>>(new Map())
	const [flags, setFlags] = useState<Flag[]>([])
	const [users, setUsers] = useState<User[]>([])
	const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>([])
	const [receiptTypeGroups, setReceiptTypeGroups] = useState<ReceiptTypeGroup[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [quickVendors, setQuickVendors] = useState<Array<{ vendor: string; count: number }>>([])

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
		setValue,
		watch,
	} = useForm<UploadFormData>({
		defaultValues: {
			flag_ids: [],
			amount: '',
			vendor: '',
			provider_address: '',
			description: '',
			date: '',
			notes: '',
		},
	})

	const selectedFlagIds = watch('flag_ids') || []

	// Load flags, users, and receiptTypes on mount
	useEffect(() => {
		const loadData = async () => {
			try {
				const [flagsRes, usersRes, receiptTypesRes, groupsRes] = await Promise.all([
					flagsApi.getAll(),
					usersApi.getAll(),
					receiptTypesApi.getAll(),
					receiptTypeGroupsApi.getAll(),
				])
				setFlags(flagsRes.data)
				setUsers(usersRes.data)
				setReceiptTypes(receiptTypesRes.data)
				setReceiptTypeGroups(groupsRes.data)

				// Set default user to first user if users exist
				if (usersRes.data.length > 0) {
					setValue('user_id', usersRes.data[0].id)
				}
			} catch (err) {
				console.error('Failed to load data:', err)
			}
		}
		loadData()
		loadQuickVendors()
	}, [setValue])

	const loadQuickVendors = async () => {
		try {
			const response = await receiptsApi.getFrequentVendors()
			setQuickVendors(response.data)
		} catch (err: any) {
			// Silently fail - quick vendors are optional
			console.error('Failed to load quick vendors:', err)
		}
	}

	// Generate preview for a file
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
			// For PDFs, create an object URL for iframe preview
			const objectUrl = URL.createObjectURL(file)
			setFilePreviews(prev => {
				const newMap = new Map(prev)
				newMap.set(index, objectUrl)
				return newMap
			})
		}
	}, [])

	const onDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault()
			const droppedFiles = Array.from(e.dataTransfer.files)
			setFiles(prev => {
				const newFiles = [...prev, ...droppedFiles]
				// Generate previews for new files
				droppedFiles.forEach((file, offset) => {
					generatePreview(file, prev.length + offset)
				})
				return newFiles
			})
		},
		[generatePreview]
	)

	const onFileInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (e.target.files) {
				const selectedFiles = Array.from(e.target.files)
				setFiles(prev => {
					const newFiles = [...prev, ...selectedFiles]
					// Generate previews for new files
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

	const removeFile = (index: number) => {
		// Clean up preview URL if it exists
		const preview = filePreviews.get(index)
		if (preview) {
			// Revoke object URLs to free memory
			if (preview.startsWith('blob:')) {
				URL.revokeObjectURL(preview)
			}
		}

		// Reindex remaining previews
		setFilePreviews(prev => {
			const newMap = new Map<number, string>()
			let newIndex = 0
			files.forEach((_, i) => {
				if (i !== index && prev.has(i)) {
					newMap.set(newIndex, prev.get(i)!)
					newIndex++
				} else if (i === index && prev.has(i)) {
					// Revoke the URL for the removed file
					const url = prev.get(i)!
					if (url.startsWith('blob:')) {
						URL.revokeObjectURL(url)
					}
				}
			})
			return newMap
		})

		setFiles(prev => prev.filter((_, i) => i !== index))
	}

	const toggleFlag = (flagId: number) => {
		const current = selectedFlagIds
		const newIds = current.includes(flagId) ? current.filter(id => id !== flagId) : [...current, flagId]
		setValue('flag_ids', newIds)
	}

	// Validate currency amount
	const validateAmount = (value: string | undefined): boolean | string => {
		if (!value || value.trim() === '') {
			return true // Optional field
		}

		// Remove $ and commas, then validate
		const cleaned = value.replace(/[$,\s]/g, '')
		const numValue = parseFloat(cleaned)

		if (isNaN(numValue)) {
			return 'Please enter a valid number'
		}

		if (numValue < 0) {
			return 'Amount cannot be negative'
		}

		// Check for more than 2 decimal places
		const decimalParts = cleaned.split('.')
		if (decimalParts.length > 1 && decimalParts[1].length > 2) {
			return 'Amount cannot have more than 2 decimal places'
		}

		return true
	}

	const onSubmit = async (data: UploadFormData) => {
		if (files.length === 0) {
			setError('Please select at least one file')
			return
		}

		setLoading(true)
		setError(null)

		try {
			// Clean and parse amount
			let amount = 0
			if (data.amount) {
				const cleaned = data.amount.replace(/[$,\s]/g, '')
				amount = parseFloat(cleaned) || 0
			}

			const receiptData: CreateReceiptInput = {
				user_id: data.user_id,
				receipt_type_id: data.receipt_type_id,
				amount: amount,
				vendor: data.vendor || '',
				provider_address: data.provider_address || '',
				description: data.description || '',
				date: data.date || new Date().toISOString().split('T')[0],
				notes: data.notes || undefined,
				flag_ids: selectedFlagIds,
			}

			await receiptsApi.create(receiptData, files)

			// Clean up all object URLs
			filePreviews.forEach(url => {
				if (url.startsWith('blob:')) {
					URL.revokeObjectURL(url)
				}
			})

			setFiles([])
			setFilePreviews(new Map())
			reset()

			// Show success toast and navigate
			toast({
				title: 'Success',
				description: 'Receipt created successfully',
			})
			navigate('/')
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to upload receipt')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="w-full sm:px-4">
			<div className="flex flex-col max-w-full gap-6 lg:flex-row">
				{/* Main Form */}
				<div className="flex-1 min-w-0">
					<Card>
						<CardHeader>
							<CardTitle>Upload Receipt</CardTitle>
							<CardDescription>
								Upload medical receipts with HSA-compliant information
								<br />
								<Link to="/bulk-upload" className="mt-2 text-sm text-primary hover:underline">
									Or bulk upload multiple files →
								</Link>
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
								{/* File Upload */}
								<div>
									<Label>Files</Label>
									<div
										onDrop={onDrop}
										onDragOver={e => e.preventDefault()}
										className={cn(
											'mt-2 border-2 border-dashed rounded-lg p-8 text-center',
											'hover:border-primary transition-colors cursor-pointer'
										)}
									>
										<input type="file" multiple onChange={onFileInput} className="hidden" id="file-input" accept="image/*,.pdf" />
										<label htmlFor="file-input" className="cursor-pointer">
											<Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
											<p className="text-sm text-muted-foreground">Drag and drop files here, or click to select</p>
											<p className="mt-2 text-xs text-muted-foreground">Supports images and PDFs</p>
										</label>
									</div>
									<div className="flex gap-2 mt-4">
										<Button
											type="button"
											variant="outline"
											onClick={() => document.getElementById('file-input')?.click()}
											className="flex-1"
										>
											<Upload className="w-4 h-4 mr-1" />
											Select Files
										</Button>
									</div>
									{files.length > 0 && (
										<div className="mt-4 space-y-2">
											{files.map((file, index) => {
												const preview = filePreviews.get(index)
												const isImage = file.type.startsWith('image/')
												const isPdf = file.type === 'application/pdf'

												return (
													<div key={index} className="flex items-center gap-3 p-2 rounded bg-muted">
														{/* Preview */}
														<div className="flex items-center justify-center flex-shrink-0 w-16 h-16 overflow-hidden border rounded bg-background">
															{preview && isImage ? (
																<img src={preview} alt={file.name} className="object-cover w-full h-full" />
															) : isPdf ? (
																<div className="flex flex-col items-center justify-center p-2">
																	<File className="w-6 h-6 text-muted-foreground" />
																	<span className="text-xs text-muted-foreground">PDF</span>
																</div>
															) : (
																<File className="w-6 h-6 text-muted-foreground" />
															)}
														</div>

														{/* File Info */}
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2">
																<File className="flex-shrink-0 w-4 h-4" />
																<span className="text-sm truncate">{file.name}</span>
															</div>
															<span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
														</div>

														{/* Remove Button */}
														<Button type="button" variant="ghost" size="icon" onClick={() => removeFile(index)} className="flex-shrink-0">
															<X className="w-4 h-4" />
														</Button>
													</div>
												)
											})}
										</div>
									)}
								</div>

								{/* HSA-Compliant Fields */}
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
											<Input id="user_id" value="" placeholder="No users available" disabled />
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
											<Input id="receipt_type_id" value="" placeholder="No types available" disabled />
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
														value: watch('amount') || '',
														onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
															// Allow only numbers, decimal point, commas, and spaces
															const newValue = e.target.value.replace(/[^0-9.,\s]/g, '')
															e.target.value = newValue
															onChange(e)
															setValue('amount', newValue, { shouldValidate: true })
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
									{quickVendors.length > 0 && (
										<div className="mt-2">
											<div className="flex flex-wrap gap-2">
												{quickVendors.map((item, index) => (
													<Button
														key={index}
														type="button"
														variant="outline"
														size="sm"
														onClick={() => setValue('vendor', item.vendor, { shouldValidate: true })}
														className="text-xs"
													>
														{item.vendor}
													</Button>
												))}
											</div>
										</div>
									)}
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

								{error && <div className="p-4 rounded-md bg-destructive/10 text-destructive">{error}</div>}

								<Button type="submit" disabled={loading} className="w-full">
									{loading ? 'Uploading...' : 'Upload Receipt'}
								</Button>
							</form>
						</CardContent>
					</Card>
				</div>

				{/* Preview Sidebar - Only on widescreens */}
				{files.length > 0 && (
					<div className="flex-shrink-0">
						<Card>
							<CardHeader>
								<CardTitle>File Previews</CardTitle>
								<CardDescription>Preview of selected files</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{files.map((file, index) => {
										const preview = filePreviews.get(index)
										const isImage = file.type.startsWith('image/')
										const isPdf = file.type === 'application/pdf'

										return (
											<div key={index} className="overflow-hidden border rounded-lg">
												<div className="p-2 border-b bg-muted">
													<div className="flex items-center gap-2">
														<File className="w-4 h-4" />
														<span className="text-sm font-medium truncate">{file.name}</span>
													</div>
													<span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
												</div>
												<div className="bg-background">
													{preview && isImage ? (
														<img src={preview} alt={file.name} className="object-contain w-full h-auto max-h-96" />
													) : isPdf && preview ? (
														<iframe
															src={preview === 'pdf' ? URL.createObjectURL(file) : preview}
															className="w-full border-0 h-96"
															title={file.name}
														/>
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
