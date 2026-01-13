import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useState, useEffect, Suspense, lazy } from 'react'
import AboutPage from './pages/AboutPage'
import ErrorPage from './pages/ErrorPage'

// Lazy load pages for code splitting
const ReceiptsPage = lazy(() => import('./pages/ReceiptsPage'))
const ReceiptDetailPage = lazy(() => import('./pages/ReceiptDetailPage'))
const UploadPage = lazy(() => import('./pages/UploadPage'))
const BulkUploadPage = lazy(() => import('./pages/BulkUploadPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
import { Receipt, Upload, Settings, HelpCircle, Github, Menu, X } from 'lucide-react'
import { Button } from './components/ui/button'
import { ThemeToggle } from './components/ThemeToggle'
import UserSetupDialog from './components/UserSetupDialog'
import { Toaster } from './components/ui/toaster'
import { usersApi, receiptTypesApi, receiptTypeGroupsApi, setApiErrorHandler } from './lib/api'
import { cn } from './lib/utils'
import { ErrorProvider, useErrorContext } from './contexts/ErrorContext'
import { REPOSITORY_URL } from './lib/version'
import { DEFAULT_RECEIPT_TYPE_GROUPS, DEFAULT_UNGROUPED_TYPES } from './lib/defaults'
import { usePullToRefresh } from './hooks/usePullToRefresh'
import { PullToRefreshIndicator } from './components/PullToRefreshIndicator'

function Navigation() {
	const location = useLocation()
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

	const navItems = [
		{ path: '/', label: 'Receipts', icon: Receipt },
		{ path: '/upload', label: 'Upload', icon: Upload },
		{ path: '/settings', label: 'Settings', icon: Settings },
	]

	const toggleMobileMenu = () => {
		setIsMobileMenuOpen(!isMobileMenuOpen)
	}

	const closeMobileMenu = () => {
		setIsMobileMenuOpen(false)
	}

	return (
		<nav className="border-b bg-background">
			<div className="container px-4 py-4 mx-auto">
				<div className="flex items-center justify-between">
					<Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80" onClick={closeMobileMenu}>
						<img src="/logo.png" alt="MedStash" className="size-9" />
						<h1 className="max-[400px]:hidden text-2xl font-bold cursor-pointer">MedStash</h1>
					</Link>

					{/* Desktop Navigation */}
					<div className="items-center hidden gap-2 md:flex">
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
								<HelpCircle className="w-5 h-5" />
							</Button>
						</Link>
						<a href={REPOSITORY_URL.replace('.git', '')} target="_blank" rel="noopener noreferrer" aria-label="GitHub Repository">
							<Button variant="ghost" size="icon">
								<Github className="w-5 h-5" />
							</Button>
						</a>
						<ThemeToggle />
					</div>

					{/* Mobile Menu Button */}
					<div className="flex items-center gap-2 md:hidden">
						<Link to="/upload">
							<Button
								variant="ghost"
								size="icon"
								className={cn(location.pathname === '/upload' && 'bg-primary text-primary-foreground')}
								aria-label="Upload"
							>
								<Upload className="w-5 h-5" />
							</Button>
						</Link>
						<ThemeToggle />
						<Button variant="ghost" size="icon" onClick={toggleMobileMenu} aria-label="Toggle menu">
							{isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
						</Button>
					</div>
				</div>

				{/* Mobile Menu Dropdown */}
				{isMobileMenuOpen && (
					<div className="pt-4 pb-4 mt-4 border-t md:hidden">
						<div className="flex flex-col gap-2">
							{navItems.map(item => {
								const Icon = item.icon
								const isActive = location.pathname === item.path
								return (
									<Link key={item.path} to={item.path} onClick={closeMobileMenu}>
										<Button
											variant={isActive ? 'default' : 'ghost'}
											className={cn('w-full justify-start gap-2', isActive && 'bg-primary text-primary-foreground')}
										>
											<Icon className="w-4 h-4" />
											{item.label}
										</Button>
									</Link>
								)
							})}
							<Link to="/about" onClick={closeMobileMenu}>
								<Button
									variant="ghost"
									className={cn('w-full justify-start gap-2', location.pathname === '/about' && 'bg-primary text-primary-foreground')}
								>
									<HelpCircle className="w-4 h-4" />
									About
								</Button>
							</Link>
							<a href={REPOSITORY_URL.replace('.git', '')} target="_blank" rel="noopener noreferrer" onClick={closeMobileMenu}>
								<Button variant="ghost" className="justify-start w-full gap-2">
									<Github className="w-4 h-4" />
									GitHub
								</Button>
							</a>
						</div>
					</div>
				)}
			</div>
		</nav>
	)
}

function AppContent() {
	const [showUserSetup, setShowUserSetup] = useState(false)
	const [isChecking, setIsChecking] = useState(true)
	const { error, setError } = useErrorContext()

	// Enable pull-to-refresh for iOS home screen web apps
	const { isPulling, progress, shouldRefresh } = usePullToRefresh({
		enabled: true,
		hardRefresh: true,
	})

	// Set up API error handler
	useEffect(() => {
		setApiErrorHandler((type, message) => {
			setError({ type, message })
		})
	}, [setError])

	useEffect(() => {
		const initializeApp = async () => {
			try {
				const [usersRes, receiptTypesRes, groupsRes] = await Promise.all([
					usersApi.getAll().catch(() => ({ data: [] })),
					receiptTypesApi.getAll().catch(() => ({ data: [] })),
					receiptTypeGroupsApi.getAll().catch(() => ({ data: [] })),
				])

				const users = usersRes.data || []
				const receiptTypes = receiptTypesRes.data || []
				const groups = groupsRes.data || []

				// Show user setup if no users configured
				if (users.length === 0) {
					setShowUserSetup(true)
				}

				// Check if we need to reset (if groups/types don't match expected structure)
				const expectedGroupNames = DEFAULT_RECEIPT_TYPE_GROUPS.map(g => g.name).sort()
				const existingGroupNames = groups.map(g => g.name).sort()
				const needsReset =
					groups.length === 0 ||
					receiptTypes.length === 0 ||
					expectedGroupNames.length !== existingGroupNames.length ||
					!expectedGroupNames.every(name => existingGroupNames.includes(name))

				if (needsReset) {
					// Use the bulk reset endpoint with defaults from constants
					await receiptTypesApi.resetToDefaults(DEFAULT_RECEIPT_TYPE_GROUPS, DEFAULT_UNGROUPED_TYPES)
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
				<PullToRefreshIndicator isPulling={isPulling} progress={progress} shouldRefresh={shouldRefresh} />
				<Navigation />
				<main className="container px-4 py-8 mx-auto">
					<Suspense
						fallback={
							<div className="flex items-center justify-center min-h-[400px]">
								<div className="text-center">
									<p className="text-muted-foreground">Loading...</p>
								</div>
							</div>
						}
					>
						<Routes>
							<Route path="/" element={<ReceiptsPage />} />
							<Route path="/receipts/:id" element={<ReceiptDetailPage />} />
							<Route path="/upload" element={<UploadPage />} />
							<Route path="/bulk-upload" element={<BulkUploadPage />} />
							<Route path="/settings" element={<SettingsPage />} />
							<Route path="/about" element={<AboutPage />} />
							<Route path="/error" element={<ErrorPage />} />
						</Routes>
					</Suspense>
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
