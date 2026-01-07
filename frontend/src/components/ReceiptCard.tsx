import { Receipt } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { FlagBadge } from './FlagBadge'
import { Trash2, Download, File } from 'lucide-react'

interface ReceiptCardProps {
	receipt: Receipt
	onDelete: (id: number) => void
	onDownloadFile: (receiptId: number, fileId: number, filename: string) => void
}

export default function ReceiptCard({ receipt, onDelete, onDownloadFile }: ReceiptCardProps) {
	const formatDate = (dateString: string) => {
		// Parse date as local date to avoid timezone issues
		// If dateString is in YYYY-MM-DD format, parse it as local date
		const [year, month, day] = dateString.split('-').map(Number)
		return new Date(year, month - 1, day).toLocaleDateString()
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
		}).format(amount)
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<CardTitle className="text-lg">{receipt.vendor}</CardTitle>
						<CardDescription>{formatDate(receipt.date)}</CardDescription>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => onDelete(receipt.id)}
						className="text-destructive hover:text-destructive"
						aria-label="Delete receipt"
					>
						<Trash2 className="w-4 h-4" />
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<p className="text-sm text-muted-foreground">Amount</p>
					<p className="text-2xl font-bold">{formatCurrency(receipt.amount)}</p>
				</div>

				<div>
					<p className="text-sm text-muted-foreground">Type</p>
					<p className="font-medium">{receipt.type}</p>
				</div>

				<div>
					<p className="text-sm text-muted-foreground">User</p>
					<p className="font-medium">{receipt.user}</p>
				</div>

				<div>
					<p className="text-sm text-muted-foreground">Description</p>
					<p className="text-sm">{receipt.description}</p>
				</div>

				{receipt.provider_address && (
					<div>
						<p className="text-sm text-muted-foreground">Provider Address</p>
						<p className="text-sm">{receipt.provider_address}</p>
					</div>
				)}

				{receipt.flags.length > 0 && (
					<div>
						<p className="mb-2 text-sm text-muted-foreground">Flags</p>
						<div className="flex flex-wrap gap-2">
							{receipt.flags.map(flag => (
								<FlagBadge key={flag.id} flag={flag} />
							))}
						</div>
					</div>
				)}

				{receipt.files.length > 0 && (
					<div>
						<p className="mb-2 text-sm text-muted-foreground">Files</p>
						<div className="space-y-2">
							{receipt.files.map(file => {
								const filenameChanged = file.filename !== file.original_filename
								return (
									<div key={file.id} className="flex items-center justify-between p-2 rounded bg-muted">
										<div className="flex flex-col flex-1 min-w-0 gap-1">
											<div className="flex items-center gap-2">
												<File className="flex-shrink-0 w-4 h-4" />
												<span className="text-sm font-medium truncate">{file.filename}</span>
											</div>
											{filenameChanged && (
												<span className="ml-6 text-xs truncate text-muted-foreground">Original: {file.original_filename}</span>
											)}
										</div>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => onDownloadFile(receipt.id, file.id, file.original_filename)}
											className="flex-shrink-0"
											aria-label={`Download ${file.filename}`}
										>
											<Download className="w-4 h-4" />
										</Button>
									</div>
								)
							})}
						</div>
					</div>
				)}

				{receipt.notes && (
					<div>
						<p className="text-sm text-muted-foreground">Notes</p>
						<p className="text-sm italic">{receipt.notes}</p>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
