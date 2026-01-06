import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import UploadPage from './pages/UploadPage'
import ReceiptsPage from './pages/ReceiptsPage'
import ReceiptDetailPage from './pages/ReceiptDetailPage'
import SettingsPage from './pages/SettingsPage'
import { Receipt, Upload, Settings } from 'lucide-react'
import { Button } from './components/ui/button'
import { ThemeToggle } from './components/ThemeToggle'
import UserSetupDialog from './components/UserSetupDialog'
import { Toaster } from './components/ui/toaster'
import { settingsApi } from './lib/api'
import { cn } from './lib/utils'

function Navigation() {
	const location = useLocation()

	const navItems = [
		{ path: '/', label: 'Receipts', icon: Receipt },
		{ path: '/upload', label: 'Upload', icon: Upload },
		{ path: '/settings', label: 'Settings', icon: Settings },
	]

	return (
		<nav className="border-b bg-background">
			<div className="container mx-auto px-4 py-4">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">MedStash</h1>
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
										<Icon className="h-4 w-4" />
										{item.label}
									</Button>
								</Link>
							)
						})}
						<ThemeToggle />
					</div>
				</div>
			</div>
		</nav>
	)
}

function App() {
	const [showUserSetup, setShowUserSetup] = useState(false)
	const [isChecking, setIsChecking] = useState(true)

	useEffect(() => {
		const initializeApp = async () => {
			try {
				const settings = await settingsApi.getAll()
				const users = Array.isArray(settings.data?.users) ? settings.data.users : []
				const receiptTypes = Array.isArray(settings.data?.receiptTypes) ? settings.data.receiptTypes : []

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
					await settingsApi.set('receiptTypes', standardTypes)
				}
			} catch (err) {
				console.error('Failed to initialize app:', err)
			} finally {
				setIsChecking(false)
			}
		}

		initializeApp()
	}, [])

	const handleUserSetupComplete = () => {
		setShowUserSetup(false)
	}

	if (isChecking) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		)
	}

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<ReceiptsPage />} />
            <Route path="/receipts/:id" element={<ReceiptDetailPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <UserSetupDialog open={showUserSetup} onComplete={handleUserSetupComplete} />
        <Toaster />
      </div>
    </BrowserRouter>
  )
}

export default App
