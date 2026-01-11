import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../helpers/testUtils';
import ReceiptCard from '../../components/ReceiptCard';
import { createReceiptFixture, createFlagFixture } from '../helpers/fixtures';
import userEvent from '@testing-library/user-event';

describe('ReceiptCard', () => {
  const mockOnDelete = vi.fn();
  const mockOnDownloadFile = vi.fn();

  it('should render receipt data correctly', () => {
    const receipt = createReceiptFixture({
      vendor: 'Test Clinic',
      amount: 100.50,
      type: 'doctor-visit',
      user: 'John Doe',
      description: 'Test description',
      date: '2024-01-15',
    });

    render(
      <ReceiptCard
        receipt={receipt}
        onDelete={mockOnDelete}
        onDownloadFile={mockOnDownloadFile}
      />
    );

    expect(screen.getByText('Test Clinic')).toBeInTheDocument();
    expect(screen.getByText('$100.50')).toBeInTheDocument();
    expect(screen.getByText('doctor-visit')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should display flags when present', () => {
    const flag1 = createFlagFixture({ id: 1, name: 'Flag 1', color: '#FF0000' });
    const flag2 = createFlagFixture({ id: 2, name: 'Flag 2', color: '#00FF00' });
    const receipt = createReceiptFixture({
      flags: [flag1, flag2],
    });

    render(
      <ReceiptCard
        receipt={receipt}
        onDelete={mockOnDelete}
        onDownloadFile={mockOnDownloadFile}
      />
    );

    expect(screen.getByText('Flag 1')).toBeInTheDocument();
    expect(screen.getByText('Flag 2')).toBeInTheDocument();
  });

  it('should display files when present', () => {
    const receipt = createReceiptFixture({
      files: [
        {
          id: 1,
          receipt_id: 1,
          filename: 'file1.pdf',
          original_filename: 'original1.pdf',
          file_order: 0,
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 2,
          receipt_id: 1,
          filename: 'file2.pdf',
          original_filename: 'original2.pdf',
          file_order: 1,
          created_at: '2024-01-15T10:00:00Z',
        },
      ],
    });

    render(
      <ReceiptCard
        receipt={receipt}
        onDelete={mockOnDelete}
        onDownloadFile={mockOnDownloadFile}
      />
    );

    // The original filename is split across text nodes ("Original: " and "original1.pdf")
    // Use a more flexible matcher that can find text across multiple nodes
    expect(screen.getByText(/original1\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/original2\.pdf/)).toBeInTheDocument();
  });

  it('should display notes when present', () => {
    const receipt = createReceiptFixture({
      notes: 'Test notes',
    });

    render(
      <ReceiptCard
        receipt={receipt}
        onDelete={mockOnDelete}
        onDownloadFile={mockOnDownloadFile}
      />
    );

    expect(screen.getByText('Test notes')).toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();

    const receipt = createReceiptFixture({ id: 1 });

    render(
      <ReceiptCard
        receipt={receipt}
        onDelete={mockOnDelete}
        onDownloadFile={mockOnDownloadFile}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(1);
  });

  it('should call onDownloadFile when download button is clicked', async () => {
    const user = userEvent.setup();

    const receipt = createReceiptFixture({
      id: 1,
      files: [
        {
          id: 10,
          receipt_id: 1,
          filename: 'file1.pdf',
          original_filename: 'original1.pdf',
          file_order: 0,
          created_at: '2024-01-15T10:00:00Z',
        },
      ],
    });

    render(
      <ReceiptCard
        receipt={receipt}
        onDelete={mockOnDelete}
        onDownloadFile={mockOnDownloadFile}
      />
    );

    const downloadButtons = screen.getAllByRole('button', { name: /download/i });
    await user.click(downloadButtons[0]);

    expect(mockOnDownloadFile).toHaveBeenCalledWith(1, 10, 'original1.pdf');
  });
});

