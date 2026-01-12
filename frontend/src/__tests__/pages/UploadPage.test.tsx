import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../helpers/testUtils'
import userEvent from '@testing-library/user-event'
import UploadPage from '../../pages/UploadPage'

// Mock the API module
vi.mock('../../lib/api', () => {
	const createUserFixture = () => ({ id: 1, name: 'Test User', created_at: '2024-01-15T10:00:00Z' })
	const createFlagFixture = () => ({ id: 1, name: 'Test Flag', color: '#FF0000', created_at: '2024-01-15T10:00:00Z' })
	const createReceiptTypeFixture = () => ({ id: 1, name: 'doctor-visit', created_at: '2024-01-15T10:00:00Z' })
	const createReceiptTypeGroupFixture = () => ({ id: 1, name: 'Test Group', display_order: 0, created_at: '2024-01-15T10:00:00Z' })

	return {
		receiptsApi: {
			create: vi.fn().mockResolvedValue({ data: {} }),
			getFrequentVendors: vi.fn().mockResolvedValue({ data: [] }),
		},
		flagsApi: {
			getAll: vi.fn().mockResolvedValue({ data: [createFlagFixture()] }),
		},
		usersApi: {
			getAll: vi.fn().mockResolvedValue({ data: [createUserFixture()] }),
		},
		receiptTypesApi: {
			getAll: vi.fn().mockResolvedValue({ data: [createReceiptTypeFixture()] }),
		},
		receiptTypeGroupsApi: {
			getAll: vi.fn().mockResolvedValue({ data: [createReceiptTypeGroupFixture()] }),
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

describe('UploadPage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should trigger file input when select files button is clicked', async () => {
		const user = userEvent.setup()
		render(<UploadPage />)

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /select files/i })).toBeInTheDocument()
		})

		const selectButton = screen.getByRole('button', { name: /select files/i })
		const fileInput = document.getElementById('file-input') as HTMLInputElement

		expect(fileInput).toBeInTheDocument()
		expect(fileInput).toHaveAttribute('accept', 'image/*,.pdf')

		// Mock click on the input
		const clickSpy = vi.spyOn(fileInput, 'click')
		await user.click(selectButton)

		expect(clickSpy).toHaveBeenCalled()
	})
})
