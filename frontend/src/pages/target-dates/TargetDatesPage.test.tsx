import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import TargetDatesPage from './TargetDatesPage';
import { useTargetDates } from '../../hooks/useTargetDates';

const mockDeleteTargetDate = jest.fn();
const mockRefetch = jest.fn();

jest.mock('../../hooks/useTargetDates', () => ({
  useTargetDates: jest.fn()
}));

jest.mock('./components/TargetDateModal', () => {
  return function MockTargetDateModal({ isOpen, onClose }: any) {
    return isOpen ? <div data-testid="target-date-modal">Modal</div> : null;
  };
});

jest.mock('./components/ReservationStatusModal', () => {
  const React = require('react');
  return function MockReservationStatusModal({ isOpen, targetDate, onClose, onSubmit, onDelete }: any) {
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
    const [error, setError] = React.useState('');
    
    if (!isOpen) return null;
    
    return (
      <div data-testid="reservation-status-modal">
        <h3>予約状況の更新</h3>
        {onDelete && (
          <button onClick={() => setShowDeleteConfirm(true)}>削除</button>
        )}
        <button onClick={onClose}>キャンセル</button>
        {showDeleteConfirm && (
          <div>
            <p>削除確認</p>
            <button onClick={() => setShowDeleteConfirm(false)}>キャンセル</button>
            <button onClick={async () => {
              const success = await onDelete(targetDate.id, targetDate.date);
              if (!success) {
                setError('削除に失敗しました。しばらくしてから再度お試しください。');
              }
            }}>削除</button>
          </div>
        )}
        {error && <div>{error}</div>}
      </div>
    );
  };
});

jest.mock('../../services/api', () => ({
  targetDatesApi: {
    updateTargetDate: jest.fn()
  }
}));


describe('TargetDatesPage', () => {
  const mockTargetDates = [
    {
      id: '1',
      date: '2025-01-15',
      label: 'バンド練習',
      isbooked: false,
      memo: ''
    },
    {
      id: '2',
      date: '2025-01-20',
      label: 'リハーサル',
      isbooked: true,
      memo: '重要なリハ'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteTargetDate.mockReset();
    mockRefetch.mockReset();
  });

  it('should render loading state initially', () => {
    (useTargetDates as jest.Mock).mockReturnValue({
      data: [],
      loading: true,
      error: null,
      deleteTargetDate: mockDeleteTargetDate,
      refetch: mockRefetch
    });

    render(
      <BrowserRouter>
        <TargetDatesPage />
      </BrowserRouter>
    );

    expect(screen.getByText('データを読み込み中...')).toBeInTheDocument();
  });

  it('should render target dates list', async () => {
    (useTargetDates as jest.Mock).mockReturnValue({
      data: mockTargetDates,
      loading: false,
      error: null,
      deleteTargetDate: mockDeleteTargetDate,
      refetch: mockRefetch
    });

    render(
      <BrowserRouter>
        <TargetDatesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('バンド練習')[0]).toBeInTheDocument();
      expect(screen.getAllByText('リハーサル')[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText('予約済み').length).toBeGreaterThan(0);
    expect(screen.getAllByText('未予約').length).toBeGreaterThan(0);
  });

  it('should render empty state when no data', async () => {
    (useTargetDates as jest.Mock).mockReturnValue({
      data: [],
      loading: false,
      error: null,
      deleteTargetDate: mockDeleteTargetDate,
      refetch: mockRefetch
    });

    render(
      <BrowserRouter>
        <TargetDatesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('登録されている日程はありません')).toBeInTheDocument();
    });
  });

  it('should render error state when API fails', async () => {
    (useTargetDates as jest.Mock).mockReturnValue({
      data: [],
      loading: false,
      error: { message: 'エラーが発生しました' },
      deleteTargetDate: mockDeleteTargetDate,
      refetch: mockRefetch
    });

    render(
      <BrowserRouter>
        <TargetDatesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });
  });

  it('should render header with navigation and register button', () => {
    (useTargetDates as jest.Mock).mockReturnValue({
      data: mockTargetDates,
      loading: false,
      error: null,
      deleteTargetDate: mockDeleteTargetDate,
      refetch: mockRefetch
    });

    render(
      <BrowserRouter>
        <TargetDatesPage />
      </BrowserRouter>
    );

    expect(screen.getByText('練習日程一覧')).toBeInTheDocument();
    expect(screen.getByText('← 空き状況一覧に戻る')).toBeInTheDocument();
    expect(screen.getByText('新規登録')).toBeInTheDocument();
  });

  it('should open modal when register button is clicked', async () => {
    (useTargetDates as jest.Mock).mockReturnValue({
      data: mockTargetDates,
      loading: false,
      error: null,
      deleteTargetDate: mockDeleteTargetDate,
      refetch: mockRefetch
    });

    render(
      <BrowserRouter>
        <TargetDatesPage />
      </BrowserRouter>
    );

    const registerButton = screen.getByText('新規登録');
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(screen.getByTestId('target-date-modal')).toBeInTheDocument();
    });
  });

  it('should show reservation status modal when row is clicked', async () => {
    (useTargetDates as jest.Mock).mockReturnValue({
      data: mockTargetDates,
      loading: false,
      error: null,
      deleteTargetDate: mockDeleteTargetDate,
      refetch: mockRefetch
    });

    render(
      <BrowserRouter>
        <TargetDatesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('バンド練習')[0]).toBeInTheDocument();
    });

    // Desktop view - click the row
    const rows = screen.getAllByRole('row');
    // Skip header row, click data row
    const dataRow = rows.find(row => row.textContent?.includes('バンド練習'));
    if (dataRow) {
      fireEvent.click(dataRow);
      expect(screen.getByText('予約状況の更新')).toBeInTheDocument();
    }
  });

  it('should delete target date when confirmed', async () => {
    mockDeleteTargetDate.mockResolvedValue(true);
    (useTargetDates as jest.Mock).mockReturnValue({
      data: mockTargetDates,
      loading: false,
      error: null,
      deleteTargetDate: mockDeleteTargetDate,
      refetch: mockRefetch
    });

    render(
      <BrowserRouter>
        <TargetDatesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('バンド練習')[0]).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row');
    // Find the row that contains 'バンド練習'
    const targetRow = rows.find(row => row.textContent?.includes('バンド練習'));
    expect(targetRow).toBeTruthy();
    fireEvent.click(targetRow!);

    // Wait for ReservationStatusModal to appear
    await waitFor(() => {
      expect(screen.getByText('予約状況の更新')).toBeInTheDocument();
    });

    // Click the delete button in the modal
    const deleteButton = screen.getByRole('button', { name: '削除' });
    fireEvent.click(deleteButton);

    // Wait for delete confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('削除確認')).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmButtons = screen.getAllByRole('button', { name: '削除' });
    const confirmDeleteButton = confirmButtons[confirmButtons.length - 1];
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(mockDeleteTargetDate).toHaveBeenCalledWith('1', '2025-01-15');
    });
  });

  it('should cancel delete when cancel button is clicked', async () => {
    (useTargetDates as jest.Mock).mockReturnValue({
      data: mockTargetDates,
      loading: false,
      error: null,
      deleteTargetDate: mockDeleteTargetDate,
      refetch: mockRefetch
    });

    render(
      <BrowserRouter>
        <TargetDatesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('バンド練習')[0]).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row');
    // Find the row that contains 'バンド練習'
    const targetRow = rows.find(row => row.textContent?.includes('バンド練習'));
    expect(targetRow).toBeTruthy();
    fireEvent.click(targetRow!);

    // Wait for ReservationStatusModal
    await waitFor(() => {
      expect(screen.getByText('予約状況の更新')).toBeInTheDocument();
    });

    // Click delete to show confirmation
    const deleteButton = screen.getByRole('button', { name: '削除' });
    fireEvent.click(deleteButton);

    // Wait for delete confirmation
    await waitFor(() => {
      expect(screen.getByText('削除確認')).toBeInTheDocument();
    });

    // Click cancel in the confirmation dialog
    const cancelButtons = screen.getAllByRole('button', { name: 'キャンセル' });
    const confirmCancelButton = cancelButtons[cancelButtons.length - 1];
    fireEvent.click(confirmCancelButton);

    // Confirmation should be closed but modal should still be open
    expect(screen.queryByText('削除確認')).not.toBeInTheDocument();
    expect(screen.getByText('予約状況の更新')).toBeInTheDocument();
  });

  it('should format dates correctly', async () => {
    (useTargetDates as jest.Mock).mockReturnValue({
      data: [
        {
          id: '1',
          date: '2025-01-15',
          label: 'Test',
          isbooked: false,
          memo: ''
        }
      ],
      loading: false,
      error: null,
      deleteTargetDate: mockDeleteTargetDate,
      refetch: mockRefetch
    });

    render(
      <BrowserRouter>
        <TargetDatesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Check that the date is formatted in MM/DD format
      const dateElements = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('01/15') || false;
      });
      expect(dateElements.length).toBeGreaterThan(0);
    });
  });

  it('should show error message when delete fails', async () => {
    mockDeleteTargetDate.mockResolvedValue(false);
    (useTargetDates as jest.Mock).mockReturnValue({
      data: mockTargetDates,
      loading: false,
      error: null,
      deleteTargetDate: mockDeleteTargetDate,
      refetch: mockRefetch
    });

    render(
      <BrowserRouter>
        <TargetDatesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('バンド練習')[0]).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row');
    // Find the row that contains 'バンド練習'
    const targetRow = rows.find(row => row.textContent?.includes('バンド練習'));
    expect(targetRow).toBeTruthy();
    fireEvent.click(targetRow!);

    // Wait for ReservationStatusModal
    await waitFor(() => {
      expect(screen.getByText('予約状況の更新')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: '削除' });
    fireEvent.click(deleteButton);

    // Wait for delete confirmation
    await waitFor(() => {
      expect(screen.getByText('削除確認')).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmButtons = screen.getAllByRole('button', { name: '削除' });
    const confirmDeleteButton = confirmButtons[confirmButtons.length - 1];
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(screen.getByText('削除に失敗しました。しばらくしてから再度お試しください。')).toBeInTheDocument();
    });
  });
});