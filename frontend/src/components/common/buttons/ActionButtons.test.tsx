import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ActionButtons from './ActionButtons';
import { scraperApi, rateLimitsApi } from '../../../services/api';

jest.mock('../../../services/api', () => ({
  scraperApi: {
    triggerBatchScraping: jest.fn(),
  },
  rateLimitsApi: {
    getRateLimitByDate: jest.fn(),
  },
}));

jest.mock('../modals/ConfirmationModal', () => {
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

jest.mock('../modals/RateLimitWarningModal', () => {
  return function MockRateLimitWarningModal({ isOpen, onClose }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="rate-limit-warning-modal">
        <p>現在、情報取得処理が実行中です</p>
        <button onClick={onClose}>閉じる</button>
      </div>
    );
  };
});

jest.mock('../modals/CheckingModal', () => {
  return function MockCheckingModal({ isOpen }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="checking-modal">
        <p>実行状況を確認中...</p>
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
    
    expect(screen.getByLabelText('今すぐ情報を取得')).toBeInTheDocument();
    expect(screen.queryByLabelText('新規登録')).not.toBeInTheDocument();
  });

  test('shows confirmation modal when button is clicked', async () => {
    (rateLimitsApi.getRateLimitByDate as jest.Mock).mockResolvedValue(null);
    
    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('今すぐ情報を取得');
    fireEvent.click(fetchButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    });
  });

  test('closes confirmation modal when cancel is clicked', async () => {
    (rateLimitsApi.getRateLimitByDate as jest.Mock).mockResolvedValue(null);
    
    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('今すぐ情報を取得');
    fireEvent.click(fetchButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    });
    
    const cancelButton = screen.getByText('キャンセル');
    fireEvent.click(cancelButton);
    
    expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument();
  });

  test('shows rate limit warning when scraping is running', async () => {
    const today = new Date().toISOString().split('T')[0];
    (rateLimitsApi.getRateLimitByDate as jest.Mock).mockResolvedValue({
      id: `rate-limit-${today}`,
      date: today,
      status: 'running',
      count: 1,
      lastRequestedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('今すぐ情報を取得');
    fireEvent.click(fetchButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('rate-limit-warning-modal')).toBeInTheDocument();
      expect(screen.getByText('現在、情報取得処理が実行中です')).toBeInTheDocument();
    });
    
    expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument();
  });

  test('triggers batch scraping when confirmed', async () => {
    (rateLimitsApi.getRateLimitByDate as jest.Mock).mockResolvedValue(null);
    (scraperApi.triggerBatchScraping as jest.Mock).mockResolvedValue({
      success: true,
      message: '空き状況取得を開始しました',
      targetDates: ['2025-09-15', '2025-09-20'],
    });

    render(<ActionButtons />);
    
    // ボタンをクリック
    const fetchButton = screen.getByLabelText('今すぐ情報を取得');
    fireEvent.click(fetchButton);
    
    // 確認モーダルが表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    });
    
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

  test('shows confirmation modal when rate limit check fails', async () => {
    (rateLimitsApi.getRateLimitByDate as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('今すぐ情報を取得');
    fireEvent.click(fetchButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    });
    
    expect(screen.queryByTestId('rate-limit-warning-modal')).not.toBeInTheDocument();
  });

  test('shows error modal when no target dates are found', async () => {
    (rateLimitsApi.getRateLimitByDate as jest.Mock).mockResolvedValue(null);
    (scraperApi.triggerBatchScraping as jest.Mock).mockResolvedValue({
      success: false,
      message: '練習日程が登録されていません',
    });

    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('今すぐ情報を取得');
    fireEvent.click(fetchButton);
    
    // 確認モーダルが表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByText('実行する');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText('練習日程が登録されていません')).toBeInTheDocument();
    });
    
    // エラー時は自動で閉じない
    expect(screen.getByText('閉じる')).toBeInTheDocument();
  });

  test('shows error modal when API call fails', async () => {
    (rateLimitsApi.getRateLimitByDate as jest.Mock).mockResolvedValue(null);
    (scraperApi.triggerBatchScraping as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('今すぐ情報を取得');
    fireEvent.click(fetchButton);
    
    // 確認モーダルが表示されるのを待つ
    await waitFor(() => {
      expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByText('実行する');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText('通信エラーが発生しました')).toBeInTheDocument();
    });
    
    expect(screen.getByText('閉じる')).toBeInTheDocument();
  });

  test('button has correct styling', () => {
    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('今すぐ情報を取得');
    expect(fetchButton).toHaveClass('bg-brand-orange-dark');
    expect(fetchButton).toHaveClass('text-white');
  });

  test('button has proper sizing', () => {
    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('今すぐ情報を取得');
    expect(fetchButton).toHaveClass('px-4');
    expect(fetchButton).toHaveClass('py-2');
  });
});