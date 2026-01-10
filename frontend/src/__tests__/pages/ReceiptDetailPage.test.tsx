import * as React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../helpers/testUtils'
import userEvent from '@testing-library/user-event'
import ReceiptDetailPage from '../../pages/ReceiptDetailPage'
import { createReceiptFixture } from '../helpers/fixtures'

// Mock the API module
vi.mock('../../lib/api', () => {
	const createReceiptFixture = () => ({
		id: 1,
		user_id: 1,
		receipt_type_id: 1,
		user: 'Test User',
		type: 'doctor-visit',
		amount: 100.5,
		vendor: 'Test Clinic',
		provider_address: '123 Test St',
		description: 'Test description',
		date: '2024-01-15',
		notes: 'Test notes',
		created_at: '2024-01-15T10:00:00Z',
		updated_at: '2024-01-15T10:00:00Z',
		files: [],
		flags: [],
	})
	const createUserFixture = () => ({ id: 1, name: 'Test User', created_at: '2024-01-15T10:00:00Z' })
	const createFlagFixture = () => ({ id: 1, name: 'Test Flag', color: '#FF0000', created_at: '2024-01-15T10:00:00Z' })
	const createReceiptTypeFixture = () => ({ id: 1, name: 'doctor-visit', created_at: '2024-01-15T10:00:00Z' })
	const createReceiptTypeGroupFixture = () => ({ id: 1, name: 'Test Group', display_order: 0, created_at: '2024-01-15T10:00:00Z' })

	return {
		receiptsApi: {
			getById: vi.fn().mockResolvedValue({ data: createReceiptFixture() }),
			update: vi.fn().mockResolvedValue({ data: createReceiptFixture() }),
			addFiles: vi.fn().mockResolvedValue({ data: createReceiptFixture() }),
			replaceFile: vi.fn().mockResolvedValue({ data: createReceiptFixture() }),
			downloadFile: vi.fn().mockRejectedValue({ response: { status: 404 } }),
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
		useParams: () => ({ id: '1' }),
	}
})

describe('ReceiptDetailPage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should render camera button for adding files', async () => {
		render(<ReceiptDetailPage />)

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument()
		})
	})

	it('should render select files button for adding files', async () => {
		render(<ReceiptDetailPage />)

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /select files/i })).toBeInTheDocument()
		})
	})

	it('should trigger camera input when camera button is clicked for adding files', async () => {
		const user = userEvent.setup()
		render(<ReceiptDetailPage />)

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument()
		})

		const cameraButton = screen.getByRole('button', { name: /take photo/i })
		const cameraInput = document.getElementById('add-camera-input') as HTMLInputElement

		expect(cameraInput).toBeInTheDocument()
		expect(cameraInput).toHaveAttribute('accept', 'image/*')
		expect(cameraInput).toHaveAttribute('capture', 'environment')

		// Mock click on the input
		const clickSpy = vi.spyOn(cameraInput, 'click')
		await user.click(cameraButton)

		expect(clickSpy).toHaveBeenCalled()
	})

	it('should have camera input with correct attributes for adding files', async () => {
		render(<ReceiptDetailPage />)

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument()
		})

		const cameraInput = document.getElementById('add-camera-input') as HTMLInputElement
		expect(cameraInput).toBeInTheDocument()
		expect(cameraInput).toHaveAttribute('accept', 'image/*')
		expect(cameraInput).toHaveAttribute('capture', 'environment')
		expect(cameraInput.type).toBe('file')
	})

	it('should trigger file input when select files button is clicked', async () => {
		const user = userEvent.setup()
		render(<ReceiptDetailPage />)

		await waitFor(() => {
			expect(screen.getByRole('button', { name: /select files/i })).toBeInTheDocument()
		})

		const selectButton = screen.getByRole('button', { name: /select files/i })
		const fileInput = document.getElementById('add-files-input') as HTMLInputElement

		expect(fileInput).toBeInTheDocument()
		expect(fileInput).toHaveAttribute('accept', 'image/*,.pdf')

		// Mock click on the input
		const clickSpy = vi.spyOn(fileInput, 'click')
		await user.click(selectButton)

		expect(clickSpy).toHaveBeenCalled()
	})

	it('should render receipt with files and camera functionality', async () => {
		const receipt = createReceiptFixture({
			files: [
				{
					id: 1,
					receipt_id: 1,
					filename: 'test-file.jpg',
					original_filename: 'test-file.jpg',
					file_order: 0,
					created_at: '2024-01-15T10:00:00Z',
				},
			],
		})

		const { receiptsApi } = await import('../../lib/api')
		vi.mocked(receiptsApi.getById).mockResolvedValue({ data: receipt } as any)

		render(<ReceiptDetailPage />)

		await waitFor(() => {
			expect(screen.getAllByText('test-file.jpg').length).toBeGreaterThan(0)
		})

		// Verify camera button exists for adding files
		expect(screen.getByRole('button', { name: /take photo/i })).toBeInTheDocument()
		// Verify camera input exists for adding files
		const cameraInput = document.getElementById('add-camera-input') as HTMLInputElement
		expect(cameraInput).toBeInTheDocument()
		expect(cameraInput).toHaveAttribute('capture', 'environment')
	})
})
