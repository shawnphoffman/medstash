import { Heart, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'

interface SupportDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export default function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Heart className="w-5 h-5 text-amber-500" />
						Support MedStash
					</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					MedStash is free and open source. If it saves you time, consider supporting these causes.
				</p>
				<SupportContent />
			</DialogContent>
		</Dialog>
	)
}

export function SupportContent() {
	return (
		<div className="space-y-4">
			<a
				href="https://www.pcta.org/donate/"
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center justify-between p-4 transition-colors border rounded-lg hover:bg-muted/50"
			>
				<div>
					<p className="font-medium">Pacific Crest Trail Association</p>
					<p className="text-sm text-muted-foreground">Protecting the PCT from Mexico to Canada</p>
				</div>
				<ExternalLink className="shrink-0 w-4 h-4 text-muted-foreground" />
			</a>

			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t" />
				</div>
				<div className="relative flex justify-center text-xs uppercase">
					<span className="px-2 bg-background text-muted-foreground">Support the Developer</span>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<Button variant="outline" className="w-full" asChild>
					<a href="https://ko-fi.com/shawnhoffman" target="_blank" rel="noopener noreferrer">
						Ko-fi
					</a>
				</Button>
				<Button variant="outline" className="w-full" asChild>
					<a href="https://buymeacoffee.com/shawnhoffman" target="_blank" rel="noopener noreferrer">
						Buy Me a Coffee
					</a>
				</Button>
			</div>
		</div>
	)
}
