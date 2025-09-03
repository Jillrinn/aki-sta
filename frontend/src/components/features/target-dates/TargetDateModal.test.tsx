import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TargetDateModal from './TargetDateModal';
import { targetDatesApi } from '../../../services/api';

// APIをモック化
jest.mock('../../../services/api', () => ({
  targetDatesApi: {
    createTargetDate: jest.fn()
  }
}));

describe('TargetDateModal', () => {
  const mockOnClose = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not render when isOpen is false', () => {
    render(<TargetDateModal isOpen={false} onClose={mockOnClose} />);
    
    expect(screen.queryByText('練習日程登録')).not.toBeInTheDocument();
  });

  test('renders when isOpen is true', () => {
    render(<TargetDateModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('練習日程登録')).toBeInTheDocument();
    expect(screen.getByLabelText(/日付/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ラベル/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登録' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
  });

  test('closes modal when clicking overlay', () => {
    const { container } = render(<TargetDateModal isOpen={true} onClose={mockOnClose} />);
    
    const overlay = container.querySelector('.bg-black.bg-opacity-50');
    fireEvent.click(overlay!);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('closes modal when clicking cancel button', () => {
    render(<TargetDateModal isOpen={true} onClose={mockOnClose} />);
    
    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('shows validation error when submitting empty form', async () => {
    render(<TargetDateModal isOpen={true} onClose={mockOnClose} />);
    
    const submitButton = screen.getByRole('button', { name: '登録' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('日付とラベルは必須項目です')).toBeInTheDocument();
    });
    
    expect(targetDatesApi.createTargetDate).not.toHaveBeenCalled();
  });

  test('shows validation error when date is empty', async () => {
    render(<TargetDateModal isOpen={true} onClose={mockOnClose} />);
    
    const labelInput = screen.getByLabelText(/ラベル/);
    fireEvent.change(labelInput, { target: { value: 'テストラベル' } });
    
    const submitButton = screen.getByRole('button', { name: '登録' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('日付とラベルは必須項目です')).toBeInTheDocument();
    });
    
    expect(targetDatesApi.createTargetDate).not.toHaveBeenCalled();
  });

  test('shows validation error when label is empty', async () => {
    render(<TargetDateModal isOpen={true} onClose={mockOnClose} />);
    
    const dateInput = screen.getByLabelText(/日付/);
    fireEvent.change(dateInput, { target: { value: '2025-12-01' } });
    
    const submitButton = screen.getByRole('button', { name: '登録' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('日付とラベルは必須項目です')).toBeInTheDocument();
    });
    
    expect(targetDatesApi.createTargetDate).not.toHaveBeenCalled();
  });

  test('successfully submits form with valid data', async () => {
    (targetDatesApi.createTargetDate as jest.Mock).mockResolvedValue({
      id: '2025-12-01',
      date: '2025-12-01',
      label: 'テストライブ',
      updatedAt: '2025-08-25T10:00:00Z'
    });

    render(<TargetDateModal isOpen={true} onClose={mockOnClose} />);
    
    const dateInput = screen.getByLabelText(/日付/);
    const labelInput = screen.getByLabelText(/ラベル/);
    
    fireEvent.change(dateInput, { target: { value: '2025-12-01' } });
    fireEvent.change(labelInput, { target: { value: 'テストライブ' } });
    
    const submitButton = screen.getByRole('button', { name: '登録' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(targetDatesApi.createTargetDate).toHaveBeenCalledWith({
        date: '2025-12-01',
        label: 'テストライブ'
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('登録しました')).toBeInTheDocument();
    });
    
    // モーダルが閉じられることを確認
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  test('shows error when API returns 409 (already exists)', async () => {
    const error = {
      response: {
        status: 409,
        data: { message: 'Target date already exists' }
      }
    };
    (targetDatesApi.createTargetDate as jest.Mock).mockRejectedValue(error);

    render(<TargetDateModal isOpen={true} onClose={mockOnClose} />);
    
    const dateInput = screen.getByLabelText(/日付/);
    const labelInput = screen.getByLabelText(/ラベル/);
    
    fireEvent.change(dateInput, { target: { value: '2025-12-01' } });
    fireEvent.change(labelInput, { target: { value: 'テストライブ' } });
    
    const submitButton = screen.getByRole('button', { name: '登録' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('この日付は既に登録されています')).toBeInTheDocument();
    });
  });

  test('shows error when API returns 400 (bad request)', async () => {
    const error = {
      response: {
        status: 400,
        data: { message: 'Invalid date format' }
      }
    };
    (targetDatesApi.createTargetDate as jest.Mock).mockRejectedValue(error);

    render(<TargetDateModal isOpen={true} onClose={mockOnClose} />);
    
    const dateInput = screen.getByLabelText(/日付/);
    const labelInput = screen.getByLabelText(/ラベル/);
    
    fireEvent.change(dateInput, { target: { value: '2025-12-01' } });
    fireEvent.change(labelInput, { target: { value: 'テストライブ' } });
    
    const submitButton = screen.getByRole('button', { name: '登録' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid date format')).toBeInTheDocument();
    });
  });

  test('shows generic error for network errors', async () => {
    const error = new Error('Network error');
    (targetDatesApi.createTargetDate as jest.Mock).mockRejectedValue(error);

    render(<TargetDateModal isOpen={true} onClose={mockOnClose} />);
    
    const dateInput = screen.getByLabelText(/日付/);
    const labelInput = screen.getByLabelText(/ラベル/);
    
    fireEvent.change(dateInput, { target: { value: '2025-12-01' } });
    fireEvent.change(labelInput, { target: { value: 'テストライブ' } });
    
    const submitButton = screen.getByRole('button', { name: '登録' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('通信エラーが発生しました')).toBeInTheDocument();
    });
  });

  test('disables form while submitting', async () => {
    (targetDatesApi.createTargetDate as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<TargetDateModal isOpen={true} onClose={mockOnClose} />);
    
    const dateInput = screen.getByLabelText(/日付/);
    const labelInput = screen.getByLabelText(/ラベル/);
    
    fireEvent.change(dateInput, { target: { value: '2025-12-01' } });
    fireEvent.change(labelInput, { target: { value: 'テストライブ' } });
    
    const submitButton = screen.getByRole('button', { name: '登録' });
    fireEvent.click(submitButton);
    
    // ボタンのテキストが変わることを確認
    expect(screen.getByRole('button', { name: '登録中...' })).toBeInTheDocument();
    
    // フォーム要素が無効化されていることを確認
    expect(dateInput).toBeDisabled();
    expect(labelInput).toBeDisabled();
    expect(screen.getByRole('button', { name: '登録中...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled();
  });
});