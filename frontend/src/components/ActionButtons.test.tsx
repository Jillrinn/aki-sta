import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActionButtons from './ActionButtons';
import { scraperApi } from '../services/api';

jest.mock('../services/api', () => ({
  scraperApi: {
    triggerBatchScraping: jest.fn(),
  },
}));

jest.mock('./ConfirmationModal', () => {
  return function MockConfirmationModal({ isOpen, onConfirm, onCancel }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="confirmation-modal">
        <button onClick={onConfirm}>実行する</button>
        <button onClick={onCancel}>キャンセル</button>
      </div>
    );
  };
});

describe('ActionButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders manual fetch button only', () => {
    render(<ActionButtons />);
    
    expect(screen.getByLabelText('今すぐ情報を集める')).toBeInTheDocument();
    expect(screen.queryByLabelText('新規登録')).not.toBeInTheDocument();
  });

  test('shows confirmation modal when button is clicked', () => {
    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('今すぐ情報を集める');
    fireEvent.click(fetchButton);
    
    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
  });

  test('closes confirmation modal when cancel is clicked', () => {
    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('今すぐ情報を集める');
    fireEvent.click(fetchButton);
    
    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    
    const cancelButton = screen.getByText('キャンセル');
    fireEvent.click(cancelButton);
    
    expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument();
  });

  test('triggers batch scraping when confirmed', async () => {
    (scraperApi.triggerBatchScraping as jest.Mock).mockResolvedValue({
      success: true,
      message: '空き状況取得を開始しました',
      targetDates: ['2025-09-15', '2025-09-20'],
    });

    render(<ActionButtons />);
    
    // ボタンをクリック
    const fetchButton = screen.getByLabelText('今すぐ情報を集める');
    fireEvent.click(fetchButton);
    
    // 確認モーダルで実行をクリック
    const confirmButton = screen.getByText('実行する');
    fireEvent.click(confirmButton);
    
    // ローディング中の表示
    expect(screen.getByText('処理中...')).toBeInTheDocument();
    
    // API呼び出しを待つ
    await waitFor(() => {
      expect(screen.getByText('空き状況取得を開始しました')).toBeInTheDocument();
    });
    
    expect(scraperApi.triggerBatchScraping).toHaveBeenCalledTimes(1);
    
    // 成功時は3秒後に自動で閉じる
    await waitFor(
      () => {
        expect(screen.queryByText('空き状況取得を開始しました')).not.toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });

  test('shows error modal when no target dates are found', async () => {
    (scraperApi.triggerBatchScraping as jest.Mock).mockResolvedValue({
      success: false,
      message: '練習日程が登録されていません',
    });

    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('今すぐ情報を集める');
    fireEvent.click(fetchButton);
    
    const confirmButton = screen.getByText('実行する');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText('練習日程が登録されていません')).toBeInTheDocument();
    });
    
    // エラー時は自動で閉じない
    expect(screen.getByText('閉じる')).toBeInTheDocument();
  });

  test('shows error modal when API call fails', async () => {
    (scraperApi.triggerBatchScraping as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('今すぐ情報を集める');
    fireEvent.click(fetchButton);
    
    const confirmButton = screen.getByText('実行する');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText('通信エラーが発生しました')).toBeInTheDocument();
    });
    
    expect(screen.getByText('閉じる')).toBeInTheDocument();
  });

  test('button has correct styling', () => {
    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('今すぐ情報を集める');
    expect(fetchButton).toHaveClass('bg-brand-orange-dark');
    expect(fetchButton).toHaveClass('text-white');
  });

  test('button has proper sizing', () => {
    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('今すぐ情報を集める');
    expect(fetchButton).toHaveClass('px-4');
    expect(fetchButton).toHaveClass('py-2');
  });
});