import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingOverlay from './LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders when isVisible is true', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
    expect(screen.getByText('更新中...')).toBeInTheDocument();
  });

  it('does not render when isVisible is false', () => {
    render(<LoadingOverlay isVisible={false} />);
    
    expect(screen.queryByTestId('loading-overlay')).not.toBeInTheDocument();
    expect(screen.queryByText('更新中...')).not.toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingOverlay isVisible={true} message="データを取得しています..." />);
    
    expect(screen.getByText('データを取得しています...')).toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    const overlay = screen.getByTestId('loading-overlay');
    expect(overlay).toHaveClass('fixed', 'inset-0', 'z-40', 'bg-black', 'bg-opacity-50');
  });

  it('contains animated spinner', () => {
    const { container } = render(<LoadingOverlay isVisible={true} />);
    
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('border-primary-400', 'border-t-transparent');
  });

  it('renders with white background modal', () => {
    const { container } = render(<LoadingOverlay isVisible={true} />);
    
    const modal = container.querySelector('.bg-white');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('rounded-lg', 'shadow-xl');
  });
});