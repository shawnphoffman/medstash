import { Link, useLocation } from 'react-router-dom'
import {
	Receipt,
	Upload,
	Settings,
	HelpCircle,
	Github,
	Heart,
	PanelLeftClose,
	PanelLeftOpen,
	type LucideIcon,
} from 'lucide-react'

import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { ThemeToggle } from './ThemeToggle'
import { useSidebar } from '../contexts/SidebarContext'
import { cn } from '../lib/utils'
import { APP_NAME, REPOSITORY_URL, VERSION } from '../lib/version'

interface NavItem {
	path: string
	label: string
	icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
	{ path: '/', label: 'Receipts', icon: Receipt },
	{ path: '/upload', label: 'Upload', icon: Upload },
	{ path: '/settings', label: 'Settings', icon: Settings },
]

const REPOSITORY_HREF = REPOSITORY_URL.replace('.git', '')

interface SidebarBodyProps {
	collapsed: boolean
	onNavigate?: () => void
	onSupportClick: () => void
}

function NavLink({
	item,
	collapsed,
	isActive,
	onNavigate,
}: {
	item: NavItem
	collapsed: boolean
	isActive: boolean
	onNavigate?: () => void
}) {
	const Icon = item.icon
	const button = (
		<Button
			variant={isActive ? 'secondary' : 'ghost'}
			className={cn(
				'w-full gap-3 h-10 font-medium',
				collapsed ? 'justify-center px-0' : 'justify-start px-3',
				isActive && 'text-foreground'
			)}
			aria-current={isActive ? 'page' : undefined}
		>
			<Icon className="size-[18px] shrink-0" />
			{!collapsed && <span className="truncate">{item.label}</span>}
		</Button>
	)

	const link = (
		<Link to={item.path} onClick={onNavigate} className="block">
			{button}
		</Link>
	)

	if (!collapsed) return link

	return (
		<Tooltip delayDuration={0}>
			<TooltipTrigger asChild>{link}</TooltipTrigger>
			<TooltipContent side="right" sideOffset={8}>
				{item.label}
			</TooltipContent>
		</Tooltip>
	)
}

function IconLink({
	icon: Icon,
	label,
	collapsed,
	onClick,
	href,
	to,
	isActive,
	onNavigate,
}: {
	icon: LucideIcon
	label: string
	collapsed: boolean
	onClick?: () => void
	href?: string
	to?: string
	isActive?: boolean
	onNavigate?: () => void
}) {
	const button = (
		<Button
			variant={isActive ? 'secondary' : 'ghost'}
			className={cn(
				'w-full gap-3 h-9 font-normal text-muted-foreground hover:text-foreground',
				collapsed ? 'justify-center px-0' : 'justify-start px-3',
				isActive && 'text-foreground'
			)}
			onClick={onClick}
			aria-label={label}
		>
			<Icon className="size-[18px] shrink-0" />
			{!collapsed && <span className="truncate">{label}</span>}
		</Button>
	)

	let inner: React.ReactNode = button
	if (href) {
		inner = (
			<a href={href} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className="block">
				{button}
			</a>
		)
	} else if (to) {
		inner = (
			<Link to={to} onClick={onNavigate} className="block">
				{button}
			</Link>
		)
	}

	if (!collapsed) return <>{inner}</>

	return (
		<Tooltip delayDuration={0}>
			<TooltipTrigger asChild>{inner}</TooltipTrigger>
			<TooltipContent side="right" sideOffset={8}>
				{label}
			</TooltipContent>
		</Tooltip>
	)
}

function SidebarBody({ collapsed, onNavigate, onSupportClick }: SidebarBodyProps) {
	const location = useLocation()
	const { toggleCollapsed } = useSidebar()
	const isAboutActive = location.pathname === '/about'

	return (
		<TooltipProvider delayDuration={300}>
			<div className="flex flex-col h-full">
				{/* Brand header */}
				<div
					className={cn(
						'flex items-center h-16 border-b shrink-0',
						collapsed ? 'justify-center px-2' : 'justify-between px-4'
					)}
				>
					<Link
						to="/"
						onClick={onNavigate}
						className="flex items-center gap-2 transition-opacity hover:opacity-80 min-w-0"
					>
						<img src="/logo.png" alt={APP_NAME} className="size-9 shrink-0" />
						{!collapsed && <span className="text-xl font-bold tracking-tight truncate">{APP_NAME}</span>}
					</Link>
					{!collapsed && (
						<Tooltip delayDuration={300}>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									onClick={toggleCollapsed}
									className="hidden md:inline-flex size-8 text-muted-foreground hover:text-foreground"
									aria-label="Collapse sidebar"
								>
									<PanelLeftClose className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="right">Collapse sidebar (⌘B)</TooltipContent>
						</Tooltip>
					)}
				</div>

				{/* Primary navigation */}
				<nav className={cn('flex-1 overflow-y-auto py-3 space-y-1', collapsed ? 'px-2' : 'px-3')}>
					{NAV_ITEMS.map(item => (
						<NavLink
							key={item.path}
							item={item}
							collapsed={collapsed}
							isActive={location.pathname === item.path}
							onNavigate={onNavigate}
						/>
					))}
				</nav>

				<Separator />

				{/* Secondary actions */}
				<div className={cn('py-3 space-y-1 shrink-0', collapsed ? 'px-2' : 'px-3')}>
					<IconLink
						icon={HelpCircle}
						label="About"
						collapsed={collapsed}
						to="/about"
						isActive={isAboutActive}
						onNavigate={onNavigate}
					/>
					<IconLink
						icon={Github}
						label="GitHub"
						collapsed={collapsed}
						href={REPOSITORY_HREF}
						onNavigate={onNavigate}
					/>
					<IconLink icon={Heart} label="Support MedStash" collapsed={collapsed} onClick={onSupportClick} />
				</div>

				<Separator />

				{/* Footer: theme toggle, expand button (when collapsed), version */}
				<div
					className={cn(
						'shrink-0 py-3 flex items-center',
						collapsed ? 'flex-col gap-2 px-2' : 'justify-between gap-2 px-4'
					)}
				>
					<ThemeToggle />
					{collapsed ? (
						<Tooltip delayDuration={300}>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									onClick={toggleCollapsed}
									className="hidden md:inline-flex size-9 text-muted-foreground hover:text-foreground"
									aria-label="Expand sidebar"
								>
									<PanelLeftOpen className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="right">Expand sidebar (⌘B)</TooltipContent>
						</Tooltip>
					) : (
						<span className="text-xs text-muted-foreground tabular-nums">v{VERSION}</span>
					)}
				</div>
			</div>
		</TooltipProvider>
	)
}

interface SidebarProps {
	onSupportClick: () => void
}

export function Sidebar({ onSupportClick }: SidebarProps) {
	const { collapsed, mobileOpen, setMobileOpen } = useSidebar()

	return (
		<>
			{/* Desktop sidebar */}
			<aside
				className={cn(
					'hidden md:flex fixed inset-y-0 left-0 z-30 flex-col border-r bg-background transition-[width] duration-200 ease-in-out',
					collapsed ? 'w-16' : 'w-60'
				)}
			>
				<SidebarBody collapsed={collapsed} onSupportClick={onSupportClick} />
			</aside>

			{/* Mobile drawer */}
			<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
				<SheetContent side="left" className="w-64 p-0 flex flex-col" showCloseButton={false}>
					<SheetTitle className="sr-only">Navigation</SheetTitle>
					<SheetDescription className="sr-only">Primary navigation menu</SheetDescription>
					<SidebarBody
						collapsed={false}
						onNavigate={() => setMobileOpen(false)}
						onSupportClick={() => {
							setMobileOpen(false)
							onSupportClick()
						}}
					/>
				</SheetContent>
			</Sheet>
		</>
	)
}

/** Width of the desktop sidebar in its current state, used to offset main content. */
export function useSidebarOffset() {
	const { collapsed } = useSidebar()
	return collapsed ? 'md:pl-16' : 'md:pl-60'
}
