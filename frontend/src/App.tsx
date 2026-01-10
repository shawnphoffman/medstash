import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import UploadPage from './pages/UploadPage'
import BulkUploadPage from './pages/BulkUploadPage'
import ReceiptsPage from './pages/ReceiptsPage'
import ReceiptDetailPage from './pages/ReceiptDetailPage'
import SettingsPage from './pages/SettingsPage'
import AboutPage from './pages/AboutPage'
import ErrorPage from './pages/ErrorPage'
import { Receipt, Upload, Settings, ReceiptText, HelpCircle, Github, Menu, X } from 'lucide-react'
import { Button } from './components/ui/button'
import { ThemeToggle } from './components/ThemeToggle'
import UserSetupDialog from './components/UserSetupDialog'
import { Toaster } from './components/ui/toaster'
import { usersApi, receiptTypesApi, receiptTypeGroupsApi, setApiErrorHandler } from './lib/api'
import { cn } from './lib/utils'
import { ErrorProvider, useErrorContext } from './contexts/ErrorContext'
import { REPOSITORY_URL } from './lib/version'

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
						<ReceiptText className="w-6 h-6" />
						<h1 className="text-2xl font-bold cursor-pointer">MedStash</h1>
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

				// Reset to default groups and types structure
				const defaultGroups = [
					{
						name: 'Medical Expenses',
						display_order: 0,
						types: ['Doctor Visits', 'Hospital Services', 'Prescription Medications', 'Medical Equipment'],
					},
					{ name: 'Dental Expenses', display_order: 1, types: ['Routine Care', 'Major Procedures'] },
					{ name: 'Vision Expenses', display_order: 2, types: ['Eye Exams', 'Eyewear', 'Surgical Procedures'] },
					{
						name: 'Other Eligible Expenses',
						display_order: 3,
						types: [
							'Vaccinations',
							'Physical Exams',
							'Family Planning',
							'Mental Health Services',
							'Over-the-Counter Medications',
							'Health-Related Travel',
						],
					},
				]

				

				// Check if we need to reset (if groups/types don't match expected structure)
				const expectedGroupNames = defaultGroups.map(g => g.name).sort()
				const existingGroupNames = groups.map(g => g.name).sort()
				const needsReset =
					groups.length === 0 ||
					receiptTypes.length === 0 ||
					expectedGroupNames.length !== existingGroupNames.length ||
					!expectedGroupNames.every(name => existingGroupNames.includes(name))

				if (needsReset) {
					// Delete all existing types first (to handle foreign key constraints)
					for (const type of receiptTypes) {
						try {
							await receiptTypesApi.delete(type.id)
						} catch (err) {
							console.warn(`Failed to delete receipt type ${type.id}:`, err)
						}
					}

					// Delete all existing groups
					for (const group of groups) {
						try {
							await receiptTypeGroupsApi.delete(group.id)
						} catch (err) {
							console.warn(`Failed to delete group ${group.id}:`, err)
						}
					}

					// Create new groups and types
					for (const groupData of defaultGroups) {
						try {
							const groupRes = await receiptTypeGroupsApi.create({
								name: groupData.name,
								display_order: groupData.display_order,
							})
							const groupId = groupRes.data.id

							// Create types for this group
							for (let i = 0; i < groupData.types.length; i++) {
								try {
									await receiptTypesApi.create({
										name: groupData.types[i],
										group_id: groupId,
										display_order: i,
									})
								} catch (err) {
									console.warn(`Failed to create receipt type ${groupData.types[i]}:`, err)
								}
							}
						} catch (err) {
							console.warn(`Failed to create group ${groupData.name}:`, err)
						}
					}

					// Create ungrouped types
					try {
						await receiptTypesApi.create({
							name: 'Other',
							group_id: null,
							display_order: 0,
						})
					} catch (err) {
						console.warn(`Failed to create ungrouped type "Other":`, err)
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
						<Route path="/bulk-upload" element={<BulkUploadPage />} />
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
