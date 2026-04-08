import { Heart } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { SupportContent } from '../components/SupportDialog'
import { VERSION, APP_NAME, DESCRIPTION, AUTHOR, LICENSE, REPOSITORY_URL } from '../lib/version'

export default function AboutPage() {
	return (
		<div className="max-w-2xl mx-auto space-y-6">
			<div>
				<h2 className="text-3xl font-bold">About</h2>
				<p className="text-muted-foreground">Information about MedStash</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{APP_NAME}</CardTitle>
					<CardDescription>{DESCRIPTION}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<p className="text-sm font-medium text-muted-foreground">Version</p>
						<p className="text-lg font-semibold">{VERSION}</p>
					</div>
					<div>
						<p className="text-sm font-medium text-muted-foreground">License</p>
						<p>{LICENSE}</p>
					</div>
					<div>
						<p className="text-sm font-medium text-muted-foreground">Repository</p>
						<a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
							{REPOSITORY_URL.replace('https://', '').replace('.git', '')}
						</a>
					</div>
					<div>
						<p className="text-sm font-medium text-muted-foreground">Author</p>
						<p>{AUTHOR}</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Heart className="w-5 h-5 text-amber-500" />
						Support MedStash
					</CardTitle>
					<CardDescription>
						MedStash is free and open source. If it saves you time, consider supporting these causes.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<SupportContent />
				</CardContent>
			</Card>
		</div>
	)
}
