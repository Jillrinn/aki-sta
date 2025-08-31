import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActionButtons from './ActionButtons';

describe('ActionButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders manual fetch button only', () => {
    render(<ActionButtons />);
    
    expect(screen.getByLabelText('空き状況取得（手動）')).toBeInTheDocument();
    expect(screen.queryByLabelText('新規登録')).not.toBeInTheDocument();
  });

  test('shows "機能未実装" alert when "空き状況取得（手動）" button is clicked', async () => {
    render(<ActionButtons />);
    
    // 初期状態ではアラートは表示されない
    expect(screen.queryByText('機能未実装です！')).not.toBeInTheDocument();
    
    // ボタンをクリック
    const fetchButton = screen.getByLabelText('空き状況取得（手動）');
    fireEvent.click(fetchButton);
    
    // アラートが表示される
    expect(screen.getByText('機能未実装です！')).toBeInTheDocument();
    expect(screen.getByText('この機能は現在開発中です。')).toBeInTheDocument();
    
    // 3秒後にアラートが消える
    await waitFor(
      () => {
        expect(screen.queryByText('機能未実装です！')).not.toBeInTheDocument();
      },
      { timeout: 4000 }
    );
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