import { useState } from 'react'
import { usersApi } from '../lib/api'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

interface UserSetupDialogProps {
	open: boolean
	onComplete: () => void
}

export default function UserSetupDialog({ open, onComplete }: UserSetupDialogProps) {
	const [userName, setUserName] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!userName.trim()) {
			setError('Please enter your name')
			return
		}

		setLoading(true)
		setError(null)

		try {
			await usersApi.create({ name: userName.trim() })
			onComplete()
		} catch (err: any) {
			setError(err.response?.data?.error || 'Failed to save user name')
		} finally {
			setLoading(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={() => {}}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Welcome to MedStash</DialogTitle>
					<DialogDescription>
						To get started, please enter your name. This will be used to categorize your medical receipts.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="space-y-4">
						<div>
							<Label htmlFor="user-name">Your Name</Label>
							<Input
								id="user-name"
								value={userName}
								onChange={e => setUserName(e.target.value)}
								placeholder="John Doe"
								autoFocus
								disabled={loading}
								onKeyDown={e => {
									if (e.key === 'Enter') {
										handleSubmit(e)
									}
								}}
							/>
							{error && <p className="mt-1 text-sm text-destructive">{error}</p>}
						</div>
					</div>
					<DialogFooter>
						<Button type="submit" disabled={loading}>
							{loading ? 'Saving...' : 'Continue'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
