import { createContext, useContext, useState, ReactNode } from 'react'
import { ErrorType } from '../pages/ErrorPage'

interface ErrorInfo {
	type: ErrorType
	message?: string
}

interface ErrorContextType {
	error: ErrorInfo | null
	setError: (error: ErrorInfo | null) => void
	clearError: () => void
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

export function ErrorProvider({ children }: { children: ReactNode }) {
	const [error, setError] = useState<ErrorInfo | null>(null)

	const clearError = () => {
		setError(null)
	}

	return <ErrorContext.Provider value={{ error, setError, clearError }}>{children}</ErrorContext.Provider>
}

export function useErrorContext() {
	const context = useContext(ErrorContext)
	if (context === undefined) {
		throw new Error('useErrorContext must be used within an ErrorProvider')
	}
	return context
}
