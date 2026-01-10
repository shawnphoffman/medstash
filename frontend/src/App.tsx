import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import UploadPage from './pages/UploadPage'
import ReceiptsPage from './pages/ReceiptsPage'
import ReceiptDetailPage from './pages/ReceiptDetailPage'
import SettingsPage from './pages/SettingsPage'
import AboutPage from './pages/AboutPage'
import ErrorPage from './pages/ErrorPage'
import { Receipt, Upload, Settings, ReceiptText, HelpCircle, Github } from 'lucide-react'
import { Button } from './components/ui/button'
import { ThemeToggle } from './components/ThemeToggle'
import UserSetupDialog from './components/UserSetupDialog'
import { Toaster } from './components/ui/toaster'
import { usersApi, receiptTypesApi, setApiErrorHandler } from './lib/api'
import { cn } from './lib/utils'
import { ErrorProvider, useErrorContext } from './contexts/ErrorContext'
import { REPOSITORY_URL } from './lib/version'

function Navigation() {
	const location = useLocation()

	const navItems = [
		{ path: '/', label: 'Receipts', icon: Receipt },
		{ path: '/upload', label: 'Upload', icon: Upload },
		{ path: '/settings', label: 'Settings', icon: Settings },
	]

	return (
		<nav className="border-b bg-background">
			<div className="container px-4 py-4 mx-auto">
				<div className="flex items-center justify-between">
					<Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
						<ReceiptText className="w-6 h-6" />
						<h1 className="text-2xl font-bold cursor-pointer">MedStash</h1>
					</Link>
					<div className="flex items-center gap-2">
						{navItems.map(item => {
							const Icon = item.icon
							const isActive = location.pathname === item.path
							return (
								<Link key={item.path} to={item.path}>
									<Button
										variant={isActive ? 'default' : 'ghost'}
										className={cn('gap-2', isActive && 'bg-primary text-primary-foreground')}
									>
										<Icon className="w-4 h-4" />
										{item.label}
									</Button>
								</Link>
							)
						})}
						<Link to="/about">
							<Button
								variant="ghost"
								size="icon"
								className={cn(location.pathname === '/about' && 'bg-primary text-primary-foreground')}
								aria-label="About"
							>
								<HelpCircle className="h-5 w-5" />
							</Button>
						</Link>
						<a
							href={REPOSITORY_URL.replace('.git', '')}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="GitHub Repository"
						>
							<Button variant="ghost" size="icon">
								<Github className="h-5 w-5" />
							</Button>
						</a>
						<ThemeToggle />
					</div>
				</div>
			</div>
		</nav>
	)
}

function AppContent() {
	const [showUserSetup, setShowUserSetup] = useState(false)
	const [isChecking, setIsChecking] = useState(true)
	const { error, setError } = useErrorContext()

	// Set up API error handler
	useEffect(() => {
		setApiErrorHandler((type, message) => {
			setError({ type, message })
		})
	}, [setError])

	useEffect(() => {
		const initializeApp = async () => {
			try {
				const [usersRes, receiptTypesRes] = await Promise.all([
					usersApi.getAll().catch(() => ({ data: [] })),
					receiptTypesApi.getAll().catch(() => ({ data: [] })),
				])

				const users = usersRes.data || []
				const receiptTypes = receiptTypesRes.data || []

				// Show user setup if no users configured
				if (users.length === 0) {
					setShowUserSetup(true)
				}

				// Initialize receipt types with standard HSA types if none exist
				if (receiptTypes.length === 0) {
					const standardTypes = [
						'Prescription',
						'Doctor Visit',
						'Dental',
						'Vision',
						'Lab Test',
						'Medical Equipment',
						'Mental Health',
						'Physical Therapy',
						'Chiropractic',
						'Other',
					]
					// Create all standard types
					for (const typeName of standardTypes) {
						try {
							await receiptTypesApi.create({ name: typeName })
						} catch (err) {
							// Ignore errors (type might already exist)
							console.warn(`Failed to create receipt type ${typeName}:`, err)
						}
					}
				}
			} catch (err) {
				console.error('Failed to initialize app:', err)
				// Error interceptor will handle CORS/network errors
			} finally {
				setIsChecking(false)
			}
		}

		initializeApp()
	}, [])

	const handleUserSetupComplete = () => {
		setShowUserSetup(false)
	}

	// Show error page if there's a critical error
	if (error && (error.type === 'cors' || error.type === 'network')) {
		return (
			<div className="min-h-screen bg-background">
				<ErrorPage />
			</div>
		)
	}

	if (isChecking) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-background">
				<div className="text-center">
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		)
	}

	return (
		<BrowserRouter
			future={{
				v7_startTransition: true,
				v7_relativeSplatPath: true,
			}}
		>
			<div className="min-h-screen bg-background">
				<Navigation />
				<main className="container px-4 py-8 mx-auto">
					<Routes>
						<Route path="/" element={<ReceiptsPage />} />
						<Route path="/receipts/:id" element={<ReceiptDetailPage />} />
						<Route path="/upload" element={<UploadPage />} />
						<Route path="/settings" element={<SettingsPage />} />
						<Route path="/about" element={<AboutPage />} />
						<Route path="/error" element={<ErrorPage />} />
					</Routes>
				</main>
				<UserSetupDialog open={showUserSetup} onComplete={handleUserSetupComplete} />
				<Toaster />
			</div>
		</BrowserRouter>
	)
}

function App() {
	return (
		<ErrorProvider>
			<AppContent />
		</ErrorProvider>
	)
}

export default App
