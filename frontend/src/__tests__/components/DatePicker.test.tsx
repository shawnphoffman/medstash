import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '../helpers/testUtils'
import userEvent from '@testing-library/user-event'
import { DatePicker } from '../../components/DatePicker'

describe('DatePicker', () => {
	it('allows typing a date and calls onChange', async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()

		render(<DatePicker value="" onChange={onChange} />)

		const input = screen.getByPlaceholderText('YYYY-MM-DD')
		await user.type(input, '2026-01-15')

		expect(onChange).toHaveBeenCalledWith('2026-01-15')
	})

	it('opens the calendar when clicking the icon', async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()

		render(<DatePicker value="" onChange={onChange} />)

		const openButton = screen.getByRole('button', { name: 'Open calendar' })
		await user.click(openButton)

		await waitFor(() => {
			expect(document.querySelector('[data-slot="calendar"]')).toBeInTheDocument()
		})
	})
})
