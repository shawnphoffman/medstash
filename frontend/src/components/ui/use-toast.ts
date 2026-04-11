/**
 * Compatibility shim — the legacy shadcn `useToast()` hook is deprecated and
 * has been replaced by `sonner`. This module preserves the old call signature
 * (`toast({ title, description, variant })`) so existing call sites keep
 * working without a sweeping refactor. New code should import `toast`
 * directly from `sonner`.
 */
import { toast as sonnerToast, type ExternalToast } from 'sonner'

interface LegacyToastOptions extends ExternalToast {
	title?: React.ReactNode
	description?: React.ReactNode
	variant?: 'default' | 'destructive'
}

function toast({ title, description, variant, ...rest }: LegacyToastOptions) {
	const message = (title ?? description ?? '') as string | React.ReactNode
	const opts: ExternalToast = {
		...rest,
		...(title && description ? { description } : {}),
	}

	if (variant === 'destructive') {
		return sonnerToast.error(message, opts)
	}
	return sonnerToast(message, opts)
}

function useToast() {
	return {
		toast,
		dismiss: sonnerToast.dismiss,
	}
}

export { useToast, toast }
