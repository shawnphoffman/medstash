import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect, Suspense, lazy } from 'react'
import { Loader2, Menu } from 'lucide-react'

import AboutPage from './pages/AboutPage'
import ErrorPage from './pages/ErrorPage'

// Lazy load pages for code splitting
const ReceiptsPage = lazy(() => import('./pages/ReceiptsPage'))
const ReceiptDetailPage = lazy(() => import('./pages/ReceiptDetailPage'))
const UploadPage = lazy(() => import('./pages/UploadPage'))
const BulkUploadPage = lazy(() => import('./pages/BulkUploadPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

import { Button } from './components/ui/button'
import { Sidebar } from './components/Sidebar'
import { ThemeToggle } from './components/ThemeToggle'
import UserSetupDialog from './components/UserSetupDialog'
import SupportDialog from './components/SupportDialog'
import { Toaster } from './components/ui/sonner'
import { usersApi, receiptTypesApi, receiptTypeGroupsApi, setApiErrorHandler } from './lib/api'
import { cn } from './lib/utils'
import { ErrorProvider, useErrorContext } from './contexts/ErrorContext'
import { SidebarProvider, useSidebar } from './contexts/SidebarContext'
import { APP_NAME } from './lib/version'
import { DEFAULT_RECEIPT_TYPE_GROUPS, DEFAULT_UNGROUPED_TYPES } from './lib/defaults'
import { usePullToRefresh } from './hooks/usePullToRefresh'
import { PullToRefreshIndicator } from './components/PullToRefreshIndicator'

function MobileTopBar() {
	const { setMobileOpen } = useSidebar()

	return (
		<header className="sticky top-0 z-20 flex items-center h-14 gap-3 px-4 border-b md:hidden bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/80">
			<Button
				variant="ghost"
				size="icon"
				className="-ml-2"
				onClick={() => setMobileOpen(true)}
				aria-label="Open navigation"
			>
				<Menu className="size-5" />
			</Button>
			<Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
				<img src="/logo.png" alt={APP_NAME} className="size-7" />
				<span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
			</Link>
			<div className="ml-auto">
				<ThemeToggle />
			</div>
		</header>
	)
}

function AppShell({ children }: { children: React.ReactNode }) {
	const { collapsed } = useSidebar()
	return (
		<div
			className={cn(
				'flex flex-col min-h-screen transition-[padding] duration-200 ease-in-out',
				collapsed ? 'md:pl-16' : 'md:pl-60'
			)}
		>
			<MobileTopBar />
			<main className="flex-1 w-full px-4 py-6 mx-auto sm:px-6 lg:px-8 lg:py-8 max-w-7xl">{children}</main>
		</div>
	)
}

function FullScreenLoader() {
	return (
		<div className="flex items-center justify-center min-h-screen bg-background">
			<div className="flex flex-col items-center gap-3 text-muted-foreground">
				<Loader2 className="size-6 animate-spin" />
				<p className="text-sm">Loading…</p>
			</div>
		</div>
	)
}

function PageLoader() {
	return (
		<div className="flex items-center justify-center min-h-[400px]">
			<div className="flex flex-col items-center gap-3 text-muted-foreground">
				<Loader2 className="size-6 animate-spin" />
				<p className="text-sm">Loading…</p>
			</div>
		</div>
	)
}

function AppContent() {
	const [showUserSetup, setShowUserSetup] = useState(false)
	const [showSupport, setShowSupport] = useState(false)
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
		return <FullScreenLoader />
	}

	return (
		<BrowserRouter
			future={{
				v7_startTransition: true,
				v7_relativeSplatPath: true,
			}}
		>
			<SidebarProvider>
				<div className="min-h-screen bg-background">
					<PullToRefreshIndicator isPulling={isPulling} progress={progress} shouldRefresh={shouldRefresh} />
					<Sidebar onSupportClick={() => setShowSupport(true)} />
					<AppShell>
						<Suspense fallback={<PageLoader />}>
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
					</AppShell>
					<UserSetupDialog open={showUserSetup} onComplete={handleUserSetupComplete} />
					<SupportDialog open={showSupport} onOpenChange={setShowSupport} />
					<Toaster />
				</div>
			</SidebarProvider>
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
