import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RefreshButton from './RefreshButton';

describe('RefreshButton', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('renders with default text', () => {
    render(
      <RefreshButton 
        onClick={mockOnClick} 
        isRefreshing={false} 
      />
    );
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('更新')).toBeInTheDocument();
  });

  it('shows refreshing state', () => {
    render(
      <RefreshButton 
        onClick={mockOnClick} 
        isRefreshing={true} 
      />
    );
    
    expect(screen.getByText('更新中...')).toBeInTheDocument();
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('calls onClick when clicked', () => {
    render(
      <RefreshButton 
        onClick={mockOnClick} 
        isRefreshing={false} 
      />
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    render(
      <RefreshButton 
        onClick={mockOnClick} 
        isRefreshing={false}
        disabled={true}
      />
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when refreshing', () => {
    render(
      <RefreshButton 
        onClick={mockOnClick} 
        isRefreshing={true}
      />
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('has proper aria-label', () => {
    render(
      <RefreshButton 
        onClick={mockOnClick} 
        isRefreshing={false}
      />
    );
    
    const button = screen.getByLabelText('データを更新');
    expect(button).toBeInTheDocument();
  });

  it('applies animation classes when refreshing', () => {
    const { rerender } = render(
      <RefreshButton 
        onClick={mockOnClick} 
        isRefreshing={false}
      />
    );
    
    // 更新中でない時はアニメーションクラスがない - アイコンをaria-hiddenで検索
    const button = screen.getByRole('button');
    const svgIcon = button.querySelector('[aria-hidden="true"]');
    expect(svgIcon).toBeInTheDocument();
    expect(svgIcon).not.toHaveClass('animate-spin');
    
    // 更新中の時はアニメーションクラスがある
    rerender(
      <RefreshButton 
        onClick={mockOnClick} 
        isRefreshing={true}
      />
    );
    
    const refreshButton = screen.getByRole('button');
    const svgRefreshing = refreshButton.querySelector('[aria-hidden="true"]');
    expect(svgRefreshing).toBeInTheDocument();
    expect(svgRefreshing).toHaveClass('animate-spin');
  });
});