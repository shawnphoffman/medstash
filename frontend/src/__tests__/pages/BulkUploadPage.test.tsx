import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '../helpers/testUtils'
import userEvent from '@testing-library/user-event'
import BulkUploadPage from '../../pages/BulkUploadPage'

// Mock the API module
vi.mock('../../lib/api', () => {
	const createUserFixture = () => ({ id: 1, name: 'Test User', created_at: '2024-01-15T10:00:00Z' })

	return {
		receiptsApi: {
			create: vi.fn().mockResolvedValue({ data: {} }),
		},
		usersApi: {
			getAll: vi.fn().mockResolvedValue({ data: [createUserFixture()] }),
		},
	}
})

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom')
	return {
		...actual,
		useNavigate: () => vi.fn(),
	}
})

// Mock URL.createObjectURL and URL.revokeObjectURL
;(globalThis as any).URL.createObjectURL = vi.fn(() => 'blob:mock-url')
;(globalThis as any).URL.revokeObjectURL = vi.fn()

describe('BulkUploadPage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should render bulk upload title', async () => {
		render(<BulkUploadPage />)

		await waitFor(() => {
			expect(screen.getByText('Bulk Upload Receipts')).toBeInTheDocument()
		})
	})

	it('should render file upload area', async () => {
		render(<BulkUploadPage />)

		await waitFor(() => {
			expect(screen.getByText(/drag and drop files here/i)).toBeInTheDocument()
		})
		expect(screen.getByText(/supports images and pdfs/i)).toBeInTheDocument()
	})

	it('should render select files button', async () => {
		render(<BulkUploadPage />)

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /select files/i })).toBeInTheDocument()
		})
	})

	it('should have file input with correct attributes', async () => {
		render(<BulkUploadPage />)

		await waitFor(() => {
			expect(screen.getByText(/drag and drop files here/i)).toBeInTheDocument()
		})

		const fileInput = document.getElementById('file-input') as HTMLInputElement
		expect(fileInput).toBeInTheDocument()
		expect(fileInput).toHaveAttribute('accept', 'image/*,.pdf')
		expect(fileInput).toHaveAttribute('multiple')
		expect(fileInput.type).toBe('file')
	})

	it('should trigger file input when select files button is clicked', async () => {
		const user = userEvent.setup()
		render(<BulkUploadPage />)

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /select files/i })).toBeInTheDocument()
		})

		const selectButton = screen.getByRole('button', { name: /select files/i })
		const fileInput = document.getElementById('file-input') as HTMLInputElement

		expect(fileInput).toBeInTheDocument()

		// Mock click on the input
		const clickSpy = vi.spyOn(fileInput, 'click')
		await user.click(selectButton)

		expect(clickSpy).toHaveBeenCalled()
	})

	it('should show cancel button', async () => {
		render(<BulkUploadPage />)

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
		})
	})

	it('should show create receipts button when files are selected', async () => {
		render(<BulkUploadPage />)

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /select files/i })).toBeInTheDocument()
		})

		// Create a mock file
		const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
		const fileInput = document.getElementById('file-input') as HTMLInputElement

		// Create a mock FileList object
		const fileList = {
			0: file,
			length: 1,
			item: (index: number) => (index === 0 ? file : null),
			[Symbol.iterator]: function* () {
				yield file
			},
		} as FileList

		// Simulate file selection by directly setting files and triggering change event
		Object.defineProperty(fileInput, 'files', {
			value: fileList,
			writable: false,
			configurable: true,
		})

		// Create and dispatch a change event
		const changeEvent = new Event('change', { bubbles: true })
		Object.defineProperty(changeEvent, 'target', {
			value: fileInput,
			writable: false,
		})
		await act(async () => {
			fileInput.dispatchEvent(changeEvent)
		})

		await waitFor(() => {
			expect(screen.getByText(/selected files \(1\)/i)).toBeInTheDocument()
		})

		expect(screen.getByRole('button', { name: /create 1 receipt/i })).toBeInTheDocument()
	})
})
