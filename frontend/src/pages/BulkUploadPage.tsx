import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { receiptsApi, usersApi, User } from '../lib/api'
import { useToast } from '../components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Upload, X, File } from 'lucide-react'
import { cn } from '../lib/utils'

export default function BulkUploadPage() {
	const navigate = useNavigate()
	const { toast } = useToast()
	const [files, setFiles] = useState<File[]>([])
	const [filePreviews, setFilePreviews] = useState<Map<number, string>>(new Map())
	const [users, setUsers] = useState<User[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	// Load users on mount
	useEffect(() => {
		const loadUsers = async () => {
			try {
				const usersRes = await usersApi.getAll()
				setUsers(usersRes.data)
			} catch (err) {
				console.error('Failed to load users:', err)
			}
		}
		loadUsers()
	}, [])

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
		(e: React.DragEvent<HTMLLabelElement>) => {
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

	const handleUpload = async () => {
		if (files.length === 0) {
			setError('Please select at least one file')
			return
		}

		if (users.length === 0) {
			setError('No users available. Please create a user in Settings first.')
			return
		}

		setLoading(true)
		setError(null)

		const currentDate = new Date().toISOString().split('T')[0]
		const defaultUserId = users[0].id

		try {
			// Create a receipt for each file
			const uploadPromises = files.map(file => {
				const receiptData = {
					user_id: defaultUserId,
					date: currentDate,
					amount: 0,
					vendor: '',
					provider_address: '',
					description: '',
					flag_ids: [],
				}

				return receiptsApi.create(receiptData, [file])
			})

			await Promise.all(uploadPromises)

			// Clean up all object URLs
			filePreviews.forEach(url => {
				if (url.startsWith('blob:')) {
					URL.revokeObjectURL(url)
				}
			})

			setFiles([])
			setFilePreviews(new Map())

			// Show success toast and navigate
			toast({
				title: 'Success',
				description: `Successfully created ${files.length} receipt${files.length > 1 ? 's' : ''}`,
			})
			navigate('/')
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to upload receipts')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="w-full px-4 -mx-4">
			<div className="flex flex-col max-w-full gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Bulk Upload Receipts</CardTitle>
						<CardDescription>Upload multiple files to create separate receipts with the current date</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-6">
							{/* File Upload */}
							<div>
								<input
									type="file"
									ref={fileInputRef}
									multiple
									onChange={onFileInput}
									className="hidden"
									id="file-input"
									accept="image/*,.pdf"
								/>
								<label
									htmlFor="file-input"
									onDrop={onDrop}
									onDragOver={e => e.preventDefault()}
									className={cn(
										'block mt-2 border-2 border-dashed rounded-lg p-8 text-center',
										'hover:border-primary transition-colors cursor-pointer'
									)}
								>
									<Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
									<p className="text-sm text-muted-foreground">Drag and drop files here, or click to select</p>
									<p className="mt-2 text-xs text-muted-foreground">Supports images and PDFs</p>
								</label>
								<div className="flex gap-2 mt-4">
									<Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
										<Upload className="w-4 h-4 mr-1" />
										Select Files
									</Button>
								</div>
							</div>

							{/* File List */}
							{files.length > 0 && (
								<div>
									<h3 className="mb-4 text-lg font-semibold">Selected Files ({files.length})</h3>
									<div className="space-y-2">
										{files.map((file, index) => {
											const preview = filePreviews.get(index)
											const isImage = file.type.startsWith('image/')
											const isPdf = file.type === 'application/pdf'

											return (
												<div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
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
															<span className="text-sm font-medium truncate">{file.name}</span>
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
								</div>
							)}

							{error && <div className="p-4 rounded-md bg-destructive/10 text-destructive">{error}</div>}

							<div className="flex gap-2">
								<Button type="button" variant="outline" onClick={() => navigate('/upload')} disabled={loading}>
									Cancel
								</Button>
								<Button type="button" onClick={handleUpload} disabled={loading || files.length === 0} className="flex-1">
									{loading
										? `Uploading ${files.length} receipt${files.length > 1 ? 's' : ''}...`
										: `Create ${files.length} Receipt${files.length > 1 ? 's' : ''}`}
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
