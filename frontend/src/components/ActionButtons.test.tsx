import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActionButtons from './ActionButtons';
import { scraperApi } from '../services/api';

jest.mock('../services/api', () => ({
  scraperApi: {
    triggerBatchScraping: jest.fn(),
  },
}));

describe('ActionButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders manual fetch button only', () => {
    render(<ActionButtons />);
    
    expect(screen.getByLabelText('空き状況取得（手動）')).toBeInTheDocument();
    expect(screen.queryByLabelText('新規登録')).not.toBeInTheDocument();
  });

  test('triggers batch scraping and shows success modal when button is clicked', async () => {
    (scraperApi.triggerBatchScraping as jest.Mock).mockResolvedValue({
      success: true,
      message: '空き状況取得を開始しました',
      targetDates: ['2025-09-15', '2025-09-20'],
    });

    render(<ActionButtons />);
    
    // ボタンをクリック
    const fetchButton = screen.getByLabelText('空き状況取得（手動）');
    fireEvent.click(fetchButton);
    
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
    
    const fetchButton = screen.getByLabelText('空き状況取得（手動）');
    fireEvent.click(fetchButton);
    
    await waitFor(() => {
      expect(screen.getByText('練習日程が登録されていません')).toBeInTheDocument();
    });
    
    // エラー時は自動で閉じない
    expect(screen.getByText('閉じる')).toBeInTheDocument();
  });

  test('shows error modal when API call fails', async () => {
    (scraperApi.triggerBatchScraping as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('空き状況取得（手動）');
    fireEvent.click(fetchButton);
    
    await waitFor(() => {
      expect(screen.getByText('通信エラーが発生しました')).toBeInTheDocument();
    });
    
    expect(screen.getByText('閉じる')).toBeInTheDocument();
  });

  test('button has correct styling', () => {
    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('空き状況取得（手動）');
    expect(fetchButton).toHaveClass('bg-brand-orange-dark');
    expect(fetchButton).toHaveClass('text-white');
  });

  test('button container has right alignment', () => {
    const { container } = render(<ActionButtons />);
    
    const buttonsContainer = container.querySelector('.flex');
    expect(buttonsContainer).toBeInTheDocument();
    expect(buttonsContainer).toHaveClass('justify-end');
  });

  test('button has proper sizing', () => {
    render(<ActionButtons />);
    
    const fetchButton = screen.getByLabelText('空き状況取得（手動）');
    expect(fetchButton).toHaveClass('px-4');
    expect(fetchButton).toHaveClass('py-2');
  });
});