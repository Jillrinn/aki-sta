import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RateLimitWarningModal from './RateLimitWarningModal';

describe('RateLimitWarningModal', () => {
  it('モーダルが開いているときに内容が表示される', () => {
    render(
      <RateLimitWarningModal 
        isOpen={true} 
        onClose={() => {}}
      />
    );

    expect(screen.getByText('しばらくお待ちください')).toBeInTheDocument();
    expect(screen.getByText('情報取得処理は実行中です')).toBeInTheDocument();
    expect(screen.getByText('完了するまでしばらくお待ちください')).toBeInTheDocument();
    expect(screen.getByText('ブラウザを更新すると順次最新の情報が表示されます')).toBeInTheDocument();
  });

  it('モーダルが閉じているときは何も表示されない', () => {
    const { container } = render(
      <RateLimitWarningModal 
        isOpen={false} 
        onClose={() => {}}
      />
    );

    const modal = container.querySelector('.ReactModal__Content');
    expect(modal).not.toBeInTheDocument();
  });

  it('閉じるボタンをクリックするとonCloseが呼ばれる', () => {
    const mockOnClose = jest.fn();
    render(
      <RateLimitWarningModal 
        isOpen={true} 
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByRole('button', { name: '閉じる' });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});