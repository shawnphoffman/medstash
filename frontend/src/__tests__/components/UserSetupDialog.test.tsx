import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '../helpers/testUtils'
import userEvent from '@testing-library/user-event'
import UserSetupDialog from '../../components/UserSetupDialog'
import { usersApi } from '../../lib/api'

// Mock the API
vi.mock('../../lib/api', () => ({
	usersApi: {
		create: vi.fn(),
	},
}))

describe('UserSetupDialog', () => {
	const mockOnComplete = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should render dialog when open', () => {
		render(<UserSetupDialog open={true} onComplete={mockOnComplete} />)

		expect(screen.getByText('Welcome to MedStash')).toBeInTheDocument()
		expect(screen.getByText(/To get started, please enter your name/)).toBeInTheDocument()
		expect(screen.getByLabelText('Your Name')).toBeInTheDocument()
	})

	it('should not render dialog when closed', () => {
		render(<UserSetupDialog open={false} onComplete={mockOnComplete} />)

		expect(screen.queryByText('Welcome to MedStash')).not.toBeInTheDocument()
	})

	it('should have submit button enabled to allow form validation', () => {
		render(<UserSetupDialog open={true} onComplete={mockOnComplete} />)

		const submitButton = screen.getByRole('button', { name: /continue/i })
		expect(submitButton).not.toBeDisabled()
	})

	it('should enable submit button when input has value', async () => {
		const user = userEvent.setup()
		render(<UserSetupDialog open={true} onComplete={mockOnComplete} />)

		const input = screen.getByLabelText('Your Name')
		await act(async () => {
			await user.type(input, 'John Doe')
		})

		const submitButton = screen.getByRole('button', { name: /continue/i })
		expect(submitButton).not.toBeDisabled()
	})

	it('should show error when submitting empty input', async () => {
		const user = userEvent.setup()
		render(<UserSetupDialog open={true} onComplete={mockOnComplete} />)

		const submitButton = screen.getByRole('button', { name: /continue/i })
		await act(async () => {
			await user.click(submitButton)
		})

		await waitFor(() => {
			expect(screen.getByText('Please enter your name')).toBeInTheDocument()
		})
		expect(mockOnComplete).not.toHaveBeenCalled()
	})

	it('should show error when submitting whitespace-only input', async () => {
		const user = userEvent.setup()
		render(<UserSetupDialog open={true} onComplete={mockOnComplete} />)

		const input = screen.getByLabelText('Your Name')
		await act(async () => {
			await user.type(input, '   ')
		})

		const submitButton = screen.getByRole('button', { name: /continue/i })
		await act(async () => {
			await user.click(submitButton)
		})

		await waitFor(() => {
			expect(screen.getByText('Please enter your name')).toBeInTheDocument()
		})
		expect(mockOnComplete).not.toHaveBeenCalled()
	})

	it('should submit form with trimmed name', async () => {
		const user = userEvent.setup()
		vi.mocked(usersApi.create).mockResolvedValue({ data: { id: 1, name: 'John Doe', created_at: '2024-01-01' } })

		render(<UserSetupDialog open={true} onComplete={mockOnComplete} />)

		const input = screen.getByLabelText('Your Name')
		await act(async () => {
			await user.type(input, '  John Doe  ')
		})

		const submitButton = screen.getByRole('button', { name: /continue/i })
		await act(async () => {
			await user.click(submitButton)
		})

		await waitFor(() => {
			expect(usersApi.create).toHaveBeenCalledWith({ name: 'John Doe' })
			expect(mockOnComplete).toHaveBeenCalled()
		})
	})

	it('should show loading state during submission', async () => {
		const user = userEvent.setup()
		let resolvePromise: (value: any) => void
		const promise = new Promise(resolve => {
			resolvePromise = resolve
		})
		vi.mocked(usersApi.create).mockReturnValue(promise as any)

		render(<UserSetupDialog open={true} onComplete={mockOnComplete} />)

		const input = screen.getByLabelText('Your Name')
		await act(async () => {
			await user.type(input, 'John Doe')
		})

		const submitButton = screen.getByRole('button', { name: /continue/i })
		await act(async () => {
			await user.click(submitButton)
		})

		await waitFor(() => {
			expect(screen.getByText('Saving...')).toBeInTheDocument()
		})
		expect(submitButton).toBeDisabled()

		await act(async () => {
			resolvePromise!({ data: { id: 1, name: 'John Doe', created_at: '2024-01-01' } })
		})
		await waitFor(() => {
			expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
		})
	})

	it('should show error message on API failure', async () => {
		const user = userEvent.setup()
		vi.mocked(usersApi.create).mockRejectedValue({
			response: { data: { error: 'API Error' } },
		})

		render(<UserSetupDialog open={true} onComplete={mockOnComplete} />)

		const input = screen.getByLabelText('Your Name')
		await act(async () => {
			await user.type(input, 'John Doe')
		})

		const submitButton = screen.getByRole('button', { name: /continue/i })
		await act(async () => {
			await user.click(submitButton)
		})

		await waitFor(() => {
			expect(screen.getByText('API Error')).toBeInTheDocument()
		})

		expect(mockOnComplete).not.toHaveBeenCalled()
	})

	it('should show generic error message on API failure without error details', async () => {
		const user = userEvent.setup()
		vi.mocked(usersApi.create).mockRejectedValue(new Error('Network error'))

		render(<UserSetupDialog open={true} onComplete={mockOnComplete} />)

		const input = screen.getByLabelText('Your Name')
		await act(async () => {
			await user.type(input, 'John Doe')
		})

		const submitButton = screen.getByRole('button', { name: /continue/i })
		await act(async () => {
			await user.click(submitButton)
		})

		await waitFor(() => {
			expect(screen.getByText('Failed to save user name')).toBeInTheDocument()
		})
	})

	it('should disable input during submission', async () => {
		const user = userEvent.setup()
		let resolvePromise: (value: any) => void
		const promise = new Promise(resolve => {
			resolvePromise = resolve
		})
		vi.mocked(usersApi.create).mockReturnValue(promise as any)

		render(<UserSetupDialog open={true} onComplete={mockOnComplete} />)

		const input = screen.getByLabelText('Your Name')
		await act(async () => {
			await user.type(input, 'John Doe')
		})

		const submitButton = screen.getByRole('button', { name: /continue/i })
		await act(async () => {
			await user.click(submitButton)
		})

		await waitFor(() => {
			expect(input).toBeDisabled()
		})

		await act(async () => {
			resolvePromise!({ data: { id: 1, name: 'John Doe', created_at: '2024-01-01' } })
		})
		await waitFor(() => {
			expect(input).not.toBeDisabled()
		})
	})
})
