import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActionButtons from './ActionButtons';

// TargetDateModalをモック化
jest.mock('./TargetDateModal', () => {
  return function MockTargetDateModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    return (
      <div data-testid="target-date-modal">
        <button onClick={onClose}>Close Modal</button>
      </div>
    );
  };
});

describe('ActionButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders both buttons', () => {
    render(<ActionButtons />);
    
    expect(screen.getByLabelText('練習日程登録')).toBeInTheDocument();
    expect(screen.getByLabelText('空き状況取得（手動）')).toBeInTheDocument();
  });

  test('opens modal when "練習日程登録" button is clicked', () => {
    render(<ActionButtons />);
    
    // モーダルが最初は表示されていないことを確認
    expect(screen.queryByTestId('target-date-modal')).not.toBeInTheDocument();
    
    // ボタンをクリック
    const registerButton = screen.getByLabelText('練習日程登録');
    fireEvent.click(registerButton);
    
    // モーダルが表示されることを確認
    expect(screen.getByTestId('target-date-modal')).toBeInTheDocument();
  });

  test('closes modal when onClose is called', () => {
    render(<ActionButtons />);
    
    // モーダルを開く
    const registerButton = screen.getByLabelText('練習日程登録');
    fireEvent.click(registerButton);
    
    expect(screen.getByTestId('target-date-modal')).toBeInTheDocument();
    
    // モーダルを閉じる
    const closeButton = screen.getByText('Close Modal');
    fireEvent.click(closeButton);
    
    // モーダルが閉じられることを確認
    expect(screen.queryByTestId('target-date-modal')).not.toBeInTheDocument();
  });

  test('shows "機能未実装" alert when "空き状況取得（手動）" button is clicked', async () => {
    render(<ActionButtons />);
    
    // アラートが最初は表示されていないことを確認
    expect(screen.queryByText('機能未実装です！')).not.toBeInTheDocument();
    
    // ボタンをクリック
    const manualFetchButton = screen.getByLabelText('空き状況取得（手動）');
    fireEvent.click(manualFetchButton);
    
    // アラートが表示されることを確認
    expect(screen.getByText('機能未実装です！')).toBeInTheDocument();
    expect(screen.getByText('この機能は現在開発中です。')).toBeInTheDocument();
    
    // アラートが3秒後に消えることを確認
    await waitFor(
      () => {
        expect(screen.queryByText('機能未実装です！')).not.toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });

  test('buttons have correct styling', () => {
    render(<ActionButtons />);
    
    const registerButton = screen.getByLabelText('練習日程登録');
    expect(registerButton).toHaveClass('bg-blue-600');
    expect(registerButton).toHaveClass('text-white');
    
    const manualFetchButton = screen.getByLabelText('空き状況取得（手動）');
    expect(manualFetchButton).toHaveClass('bg-green-600');
    expect(manualFetchButton).toHaveClass('text-white');
  });

  test('buttons container is positioned correctly', () => {
    const { container } = render(<ActionButtons />);
    
    const buttonsContainer = container.querySelector('.fixed.top-5.left-5');
    expect(buttonsContainer).toBeInTheDocument();
    expect(buttonsContainer).toHaveClass('z-10');
  });
});