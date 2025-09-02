import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import LoadingOverlay from './LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders when isVisible is true', async () => {
    render(<LoadingOverlay isVisible={true} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
      expect(screen.getByText('更新中...')).toBeInTheDocument();
    });
  });

  it('does not render when isVisible is false', () => {
    const { container } = render(<LoadingOverlay isVisible={false} />);
    
    // react-modalはポータルを使用するため、body直下を確認
    const modalRoot = document.querySelector('.ReactModal__Content');
    expect(modalRoot).not.toBeInTheDocument();
  });

  it('renders with custom message', async () => {
    render(<LoadingOverlay isVisible={true} message="データを取得しています..." />);
    
    await waitFor(() => {
      expect(screen.getByText('データを取得しています...')).toBeInTheDocument();
    });
  });

  it('contains animated spinner', async () => {
    render(<LoadingOverlay isVisible={true} />);
    
    await waitFor(() => {
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('border-primary-400', 'border-t-transparent');
    });
  });
});