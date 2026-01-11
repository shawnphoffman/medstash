import { AlertTriangle, RefreshCw, Home, AlertCircle, Globe, Server } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useNavigate } from 'react-router-dom'
import { useErrorContext } from '../contexts/ErrorContext'

export type ErrorType = 'cors' | 'network' | 'server' | 'unknown'

interface ErrorPageProps {
	type?: ErrorType
	message?: string
	onRetry?: () => void
}

export function ErrorPage({ type, message, onRetry }: ErrorPageProps) {
	const navigate = useNavigate()
	const { error, clearError } = useErrorContext()

	// Use context error if no props provided
	const errorType = type || error?.type || 'unknown'
	const errorMessage = message || error?.message

	const handleRetry = () => {
		clearError()
		if (onRetry) {
			onRetry()
		} else {
			window.location.reload()
		}
	}

	const handleGoHome = () => {
		clearError()
		navigate('/')
	}

	const getErrorDetails = () => {
		switch (errorType) {
			case 'cors':
				return {
					icon: Globe,
					title: 'CORS Error',
					description: 'The application cannot connect to the server due to CORS (Cross-Origin Resource Sharing) restrictions.',
					solutions: [
						'Check that the server is running and accessible',
						'Verify CORS configuration on the server',
						'If using ALLOWED_ORIGINS, ensure your current URL is included',
						'Check browser console for detailed error messages',
					],
				}
			case 'network':
				return {
					icon: AlertCircle,
					title: 'Network Error',
					description: 'Unable to connect to the server. The server may be down or unreachable.',
					solutions: [
						'Check your internet connection',
						'Verify the server is running',
						'Check if the server URL is correct',
						'Try refreshing the page',
					],
				}
			case 'server':
				return {
					icon: Server,
					title: 'Server Error',
					description: 'The server encountered an error processing your request.',
					solutions: [
						'Try refreshing the page',
						'Check server logs for details',
						'Verify server configuration',
						'Contact the administrator if the problem persists',
					],
				}
			default:
				return {
					icon: AlertTriangle,
					title: 'Application Error',
					description: 'An unexpected error occurred.',
					solutions: [
						'Try refreshing the page',
						'Clear your browser cache',
						'Check browser console for details',
						'Contact support if the problem persists',
					],
				}
		}
	}

	const details = getErrorDetails()
	const Icon = details.icon

	return (
		<div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4">
			<Card className="w-full max-w-2xl">
				<CardHeader className="text-center">
					<div className="flex justify-center mb-4">
						<div className="p-4 rounded-full bg-destructive/10">
							<Icon className="w-12 h-12 text-destructive" />
						</div>
					</div>
					<CardTitle className="text-2xl">{details.title}</CardTitle>
					<CardDescription className="mt-2 text-base">{details.description}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{errorMessage && (
						<div className="p-4 rounded-lg bg-muted">
							<p className="mb-1 text-sm font-medium text-muted-foreground">Error Details:</p>
							<p className="text-sm">{errorMessage}</p>
						</div>
					)}

					<div>
						<p className="mb-3 text-sm font-medium">Possible Solutions:</p>
						<ul className="space-y-2">
							{details.solutions.map((solution, index) => (
								<li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
									<span className="mt-1 text-primary">•</span>
									<span>{solution}</span>
								</li>
							))}
						</ul>
					</div>

					<div className="flex flex-col gap-3 pt-4 sm:flex-row">
						<Button onClick={handleRetry} className="flex-1" variant="default">
							<RefreshCw className="w-4 h-4 mr-1" />
							Retry
						</Button>
						<Button onClick={handleGoHome} className="flex-1" variant="outline">
							<Home className="w-4 h-4 mr-1" />
							Go Home
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default ErrorPage
