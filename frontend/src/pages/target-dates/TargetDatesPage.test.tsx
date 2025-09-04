import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import TargetDatesPage from './TargetDatesPage';

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

import { useTargetDates } from '../../hooks/useTargetDates';

describe('TargetDatesPage', () => {
  const mockTargetDates = [
    {
      id: '1',
      date: '2025-01-15',
      label: 'バンド練習',
      isbooked: false
    },
    {
      id: '2',
      date: '2025-01-20',
      label: 'リハーサル',
      isbooked: true
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
      expect(screen.getByText('バンド練習')).toBeInTheDocument();
      expect(screen.getByText('リハーサル')).toBeInTheDocument();
    });

    expect(screen.getByText('予約済み')).toBeInTheDocument();
    expect(screen.getByText('未予約')).toBeInTheDocument();
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

  it('should show delete confirmation when row is clicked', async () => {
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
      expect(screen.getByText('バンド練習')).toBeInTheDocument();
    });

    const row = screen.getByText('バンド練習').closest('tr');
    fireEvent.click(row!);

    expect(screen.getByText('削除確認')).toBeInTheDocument();
    expect(screen.getByText('以下の日程を削除してもよろしいですか？')).toBeInTheDocument();
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
      expect(screen.getByText('バンド練習')).toBeInTheDocument();
    });

    const row = screen.getByText('バンド練習').closest('tr');
    fireEvent.click(row!);

    const deleteButton = screen.getByRole('button', { name: '削除' });
    fireEvent.click(deleteButton);

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
      expect(screen.getByText('バンド練習')).toBeInTheDocument();
    });

    const row = screen.getByText('バンド練習').closest('tr');
    fireEvent.click(row!);

    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);

    expect(screen.queryByText('削除確認')).not.toBeInTheDocument();
  });

  it('should format dates correctly', async () => {
    (useTargetDates as jest.Mock).mockReturnValue({
      data: [
        {
          id: '1',
          date: '2025-01-15',
          label: 'Test',
          isbooked: false
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
      expect(screen.getByText('01/15(水)')).toBeInTheDocument();
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
      expect(screen.getByText('バンド練習')).toBeInTheDocument();
    });

    const row = screen.getByText('バンド練習').closest('tr');
    fireEvent.click(row!);

    const deleteButton = screen.getByRole('button', { name: '削除' });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('削除に失敗しました。しばらくしてから再度お試しください。')).toBeInTheDocument();
    });
  });
});