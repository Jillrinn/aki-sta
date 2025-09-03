import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScrapeResultModal from './ScrapeResultModal';

describe('ScrapeResultModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    message: '',
    isLoading: false,
    isError: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<ScrapeResultModal {...defaultProps} isOpen={false} />);
    const modalRoot = document.querySelector('.ReactModal__Content');
    expect(modalRoot).not.toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(<ScrapeResultModal {...defaultProps} isLoading={true} />);
    expect(screen.getByText('処理中...')).toBeInTheDocument();
    expect(screen.queryByText('閉じる')).not.toBeInTheDocument();
  });

  it('should render success message', () => {
    render(
      <ScrapeResultModal 
        {...defaultProps} 
        message="空き状況取得を開始しました" 
        isError={false}
      />
    );
    expect(screen.getByText('空き状況取得を開始しました')).toBeInTheDocument();
    expect(screen.getByText('閉じる')).toBeInTheDocument();
  });

  it('should render error message', () => {
    render(
      <ScrapeResultModal 
        {...defaultProps} 
        message="練習日程が登録されていません" 
        isError={true}
      />
    );
    expect(screen.getByText('練習日程が登録されていません')).toBeInTheDocument();
    expect(screen.getByText('閉じる')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <ScrapeResultModal 
        {...defaultProps} 
        onClose={onClose}
        message="テストメッセージ"
      />
    );
    
    const closeButton = screen.getByText('閉じる');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    render(
      <ScrapeResultModal 
        {...defaultProps} 
        onClose={onClose}
        message="テストメッセージ"
      />
    );
    
    // react-modalのオーバーレイをクリック
    const overlay = document.querySelector('.ReactModal__Overlay');
    if (overlay) {
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });
});