import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'

const STORAGE_KEY = 'medstash:sidebar-collapsed'

interface SidebarContextType {
	/** Whether the desktop sidebar is collapsed (icon-only). */
	collapsed: boolean
	setCollapsed: (collapsed: boolean) => void
	toggleCollapsed: () => void
	/** Whether the mobile sidebar drawer is open. */
	mobileOpen: boolean
	setMobileOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

function readInitialCollapsed(): boolean {
	if (typeof window === 'undefined') return false
	try {
		return window.localStorage.getItem(STORAGE_KEY) === 'true'
	} catch {
		return false
	}
}

export function SidebarProvider({ children }: { children: ReactNode }) {
	const [collapsed, setCollapsedState] = useState<boolean>(readInitialCollapsed)
	const [mobileOpen, setMobileOpen] = useState(false)

	const setCollapsed = useCallback((value: boolean) => {
		setCollapsedState(value)
		try {
			window.localStorage.setItem(STORAGE_KEY, String(value))
		} catch {
			// Ignore storage errors (private mode, quota, etc.)
		}
	}, [])

	const toggleCollapsed = useCallback(() => {
		setCollapsed(!collapsed)
	}, [collapsed, setCollapsed])

	// Keyboard shortcut: Cmd/Ctrl+B toggles the sidebar (matches common IDE pattern).
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
				e.preventDefault()
				if (window.matchMedia('(min-width: 768px)').matches) {
					toggleCollapsed()
				} else {
					setMobileOpen(!mobileOpen)
				}
			}
		}
		window.addEventListener('keydown', handler)
		return () => window.removeEventListener('keydown', handler)
	}, [toggleCollapsed, mobileOpen])

	return (
		<SidebarContext.Provider value={{ collapsed, setCollapsed, toggleCollapsed, mobileOpen, setMobileOpen }}>
			{children}
		</SidebarContext.Provider>
	)
}

export function useSidebar() {
	const ctx = useContext(SidebarContext)
	if (!ctx) {
		throw new Error('useSidebar must be used within a SidebarProvider')
	}
	return ctx
}
