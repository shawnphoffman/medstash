import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { receiptsApi, flagsApi, exportApi, Receipt, Flag } from '../lib/api'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Checkbox } from '../components/ui/checkbox'
import { Download, Search, File, ArrowUp, ArrowDown, ArrowUpDown, Flag as FlagIcon, Edit, RefreshCw } from 'lucide-react'
import { cn } from '../lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip'
import BulkEditDialog from '../components/BulkEditDialog'

type SortField = 'date' | 'vendor' | 'type' | 'user' | 'amount' | 'created_at' | 'updated_at'
type SortDirection = 'asc' | 'desc'

export default function ReceiptsPage() {
	const navigate = useNavigate()
	const [receipts, setReceipts] = useState<Receipt[]>([])
	const [flags, setFlags] = useState<Flag[]>([])
	const [searchTerm, setSearchTerm] = useState('')
	const [selectedFlagId, setSelectedFlagId] = useState<number | undefined>()
	const [error, setError] = useState<string | null>(null)
	const [sortField, setSortField] = useState<SortField>('date')
	const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
	const [selectedReceiptIds, setSelectedReceiptIds] = useState<Set<number>>(new Set())
	const [showBulkEditDialog, setShowBulkEditDialog] = useState(false)
	const [isRefreshing, setIsRefreshing] = useState(false)
	const [_lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
	const [autoRefreshEnabled] = useState(true)

	const loadData = useCallback(async () => {
		try {
			setIsRefreshing(true)
			const [receiptsRes, flagsRes] = await Promise.all([receiptsApi.getAll(selectedFlagId), flagsApi.getAll()])
			setReceipts(receiptsRes.data)
			setFlags(flagsRes.data)
			setLastRefreshTime(new Date())
			setError(null)
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to load receipts')
		} finally {
			setIsRefreshing(false)
		}
	}, [selectedFlagId])

	const handleRefresh = useCallback(() => {
		loadData()
	}, [loadData])

	useEffect(() => {
		loadData()
	}, [loadData])

	// Auto-refresh every 2 minutes
	useEffect(() => {
		if (!autoRefreshEnabled) return

		const interval = setInterval(() => {
			loadData()
		}, 120000) // 2 minutes (120 seconds)

		return () => clearInterval(interval)
	}, [autoRefreshEnabled, loadData])

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString()
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(amount)
	}

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			// Cycle through: desc -> asc -> desc (back to desc)
			if (sortDirection === 'desc') {
				setSortDirection('asc')
			} else {
				setSortDirection('desc')
			}
		} else {
			setSortField(field)
			setSortDirection('desc')
		}
	}

	const getSortIcon = (field: SortField) => {
		if (sortField !== field) {
			return <ArrowUpDown className="opacity-50 size-4 text-muted-foreground" />
		}
		if (sortDirection === 'asc') {
			return <ArrowUp className="size-4" />
		}
		return <ArrowDown className="size-4" />
	}

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

	const filteredReceipts = receipts.filter(receipt => {
		if (!searchTerm) return true
		const search = searchTerm.toLowerCase()
		return (
			receipt.vendor.toLowerCase().includes(search) ||
			receipt.description.toLowerCase().includes(search) ||
			receipt.user.toLowerCase().includes(search) ||
			receipt.type.toLowerCase().includes(search)
		)
	})

	const sortedReceipts = [...filteredReceipts].sort((a, b) => {
		let aValue: any
		let bValue: any

		switch (sortField) {
			case 'date':
				aValue = new Date(a.date).getTime()
				bValue = new Date(b.date).getTime()
				break
			case 'vendor':
				aValue = a.vendor.toLowerCase()
				bValue = b.vendor.toLowerCase()
				break
			case 'type':
				aValue = a.type.toLowerCase()
				bValue = b.type.toLowerCase()
				break
			case 'user':
				aValue = a.user.toLowerCase()
				bValue = b.user.toLowerCase()
				break
			case 'amount':
				aValue = a.amount
				bValue = b.amount
				break
			case 'created_at':
				aValue = new Date(a.created_at).getTime()
				bValue = new Date(b.created_at).getTime()
				break
			case 'updated_at':
				aValue = new Date(a.updated_at).getTime()
				bValue = new Date(b.updated_at).getTime()
				break
			default:
				return 0
		}

		if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
		if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
		return 0
	})

	const handleSelectReceipt = (receiptId: number, checked: boolean) => {
		setSelectedReceiptIds(prev => {
			const newSet = new Set(prev)
			if (checked) {
				newSet.add(receiptId)
			} else {
				newSet.delete(receiptId)
			}
			return newSet
		})
	}

	const handleSelectAll = (checked: boolean | 'indeterminate') => {
		if (checked === true) {
			setSelectedReceiptIds(new Set(sortedReceipts.map(r => r.id)))
		} else {
			setSelectedReceiptIds(new Set())
		}
	}

	const allSelected = sortedReceipts.length > 0 && sortedReceipts.every(r => selectedReceiptIds.has(r.id))
	const someSelected = sortedReceipts.some(r => selectedReceiptIds.has(r.id))

	// Determine checked state for select all checkbox (supports indeterminate)
	const selectAllChecked = someSelected && !allSelected ? 'indeterminate' : allSelected

	const handleBulkEditSuccess = () => {
		// Refresh receipts list
		loadData()
		// Clear selections
		setSelectedReceiptIds(new Set())
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-3xl font-bold">Receipts</h2>
					<p className="text-muted-foreground">
						Manage your medical receipts ({receipts.length} total)
						{/* {lastRefreshTime && <span className="ml-2 text-xs">Last refreshed: {lastRefreshTime.toLocaleTimeString()}</span>} */}
					</p>
				</div>
				<div className="flex gap-2">
					{selectedReceiptIds.size > 0 && (
						<Button onClick={() => setShowBulkEditDialog(true)} variant="secondary">
							<Edit className="mr-1 size-4" />
							Bulk Edit ({selectedReceiptIds.size})
						</Button>
					)}
					<Button onClick={handleRefresh} variant="outline" disabled={isRefreshing} className="relative">
						<RefreshCw className={cn('mr-1 size-4', isRefreshing && 'animate-spin')} />
						Refresh
					</Button>
					<Button onClick={handleExport} variant="outline">
						<Download className="mr-1 size-4" />
						Export All
					</Button>
				</div>
			</div>

			{/* Filters */}
			<Card className="border-0">
				<CardContent className="p-0">
					<div className="flex gap-4">
						<div className="flex-1">
							<div className="relative">
								<Search className="absolute transform -translate-y-1/2 size-4 left-3 top-1/2 text-muted-foreground" />
								<Input
									placeholder="Search receipts..."
									value={searchTerm}
									onChange={e => setSearchTerm(e.target.value)}
									className="pl-10"
								/>
							</div>
						</div>
						<Select
							value={selectedFlagId?.toString() || 'all'}
							onValueChange={value => setSelectedFlagId(value === 'all' ? undefined : parseInt(value))}
						>
							<SelectTrigger className="w-48">
								<SelectValue placeholder="All Flags" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">
									<div className="flex items-center gap-2">
										<FlagIcon className="size-4 text-muted-foreground" />
										<span>All Flags</span>
									</div>
								</SelectItem>
								{flags.map(flag => (
									<SelectItem key={flag.id} value={flag.id.toString()}>
										<div className="flex items-center gap-2">
											<FlagIcon className="size-4" style={flag.color ? { color: flag.color } : undefined} />
											<span>{flag.name}</span>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{error && <div className="p-4 rounded-md bg-destructive/10 text-destructive">{error}</div>}

			{/* Receipts Table */}
			{filteredReceipts.length === 0 ? (
				<Card>
					<CardContent className="py-12 text-center">
						<p className="text-muted-foreground">No receipts found</p>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardContent className="p-0">
						<div className={cn('overflow-x-auto transition-opacity duration-200', isRefreshing && 'opacity-75')}>
							<table className="w-full">
								<thead>
									<tr className="border-b bg-muted/50">
										<th className="w-12 px-4 py-3 text-sm font-medium text-left">
											<Checkbox checked={selectAllChecked} onCheckedChange={handleSelectAll} onClick={e => e.stopPropagation()} />
										</th>
										<th
											className="px-4 py-3 text-sm font-medium text-left transition-colors cursor-pointer hover:bg-muted"
											onClick={e => {
												e.stopPropagation()
												handleSort('date')
											}}
										>
											<div className="flex items-center gap-2">
												Date
												{getSortIcon('date')}
											</div>
										</th>
										<th
											className="px-4 py-3 text-sm font-medium text-left transition-colors cursor-pointer hover:bg-muted"
											onClick={e => {
												e.stopPropagation()
												handleSort('vendor')
											}}
										>
											<div className="flex items-center gap-2">
												Vendor
												{getSortIcon('vendor')}
											</div>
										</th>
										<th
											className="px-4 py-3 text-sm font-medium text-left transition-colors cursor-pointer hover:bg-muted"
											onClick={e => {
												e.stopPropagation()
												handleSort('type')
											}}
										>
											<div className="flex items-center gap-2">
												Type
												{getSortIcon('type')}
											</div>
										</th>
										<th
											className="px-4 py-3 text-sm font-medium text-left transition-colors cursor-pointer hover:bg-muted"
											onClick={e => {
												e.stopPropagation()
												handleSort('user')
											}}
										>
											<div className="flex items-center gap-2">
												User
												{getSortIcon('user')}
											</div>
										</th>
										<th
											className="px-4 py-3 text-sm font-medium text-left transition-colors cursor-pointer hover:bg-muted"
											onClick={e => {
												e.stopPropagation()
												handleSort('amount')
											}}
										>
											<div className="flex items-center gap-2">
												Amount
												{getSortIcon('amount')}
											</div>
										</th>
										<th className="px-4 py-3 text-sm font-medium text-left">Files</th>
										<th className="px-4 py-3 text-sm font-medium text-left">Flags</th>
										<th
											className="px-4 py-3 text-sm font-medium text-left transition-colors cursor-pointer hover:bg-muted"
											onClick={e => {
												e.stopPropagation()
												handleSort('created_at')
											}}
										>
											<div className="flex items-center gap-2">
												Created
												{getSortIcon('created_at')}
											</div>
										</th>
										<th
											className="px-4 py-3 text-sm font-medium text-left transition-colors cursor-pointer hover:bg-muted"
											onClick={e => {
												e.stopPropagation()
												handleSort('updated_at')
											}}
										>
											<div className="flex items-center gap-2">
												Modified
												{getSortIcon('updated_at')}
											</div>
										</th>
									</tr>
								</thead>
								<tbody>
									{sortedReceipts.map(receipt => (
										<tr
											key={receipt.id}
											onClick={() => navigate(`/receipts/${receipt.id}`)}
											className={cn(
												'border-b cursor-pointer hover:bg-muted/50 transition-colors',
												selectedReceiptIds.has(receipt.id) && 'bg-muted'
											)}
										>
											<td
												className="px-4 py-3"
												onClick={e => {
													e.stopPropagation()
												}}
											>
												<Checkbox
													checked={selectedReceiptIds.has(receipt.id)}
													onCheckedChange={checked => handleSelectReceipt(receipt.id, checked === true)}
													onClick={e => e.stopPropagation()}
												/>
											</td>
											<td className="px-4 py-3 text-sm">{formatDate(receipt.date)}</td>
											<td className="px-4 py-3 text-sm font-medium">{receipt.vendor}</td>
											<td className="px-4 py-3 text-sm">{receipt.type}</td>
											<td className="px-4 py-3 text-sm">{receipt.user}</td>
											<td className="px-4 py-3 text-sm font-medium">{formatCurrency(receipt.amount)}</td>
											<td className="px-4 py-3 text-sm">
												<div className="flex items-center gap-1">
													<File className="size-4 text-muted-foreground" />
													<span>{receipt.files.length}</span>
												</div>
											</td>
											<td className="px-4 py-3">
												<TooltipProvider>
													<div className="flex flex-wrap gap-1">
														{receipt.flags.map(flag => (
															<Tooltip key={flag.id}>
																<TooltipTrigger asChild>
																	<FlagIcon className="size-4" style={flag.color ? { color: flag.color } : undefined} />
																</TooltipTrigger>
																<TooltipContent>
																	<p>{flag.name}</p>
																</TooltipContent>
															</Tooltip>
														))}
													</div>
												</TooltipProvider>
											</td>
											<td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(receipt.created_at)}</td>
											<td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(receipt.updated_at)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Bulk Edit Dialog */}
			<BulkEditDialog
				open={showBulkEditDialog}
				onOpenChange={setShowBulkEditDialog}
				selectedReceiptIds={Array.from(selectedReceiptIds)}
				onSuccess={handleBulkEditSuccess}
			/>
		</div>
	)
}
