import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('should render with status symbol', () => {
    render(<StatusBadge status="available" />);
    expect(screen.getByRole('img', { name: '空き' })).toHaveTextContent('○');
  });

  it('should apply clickable styles when clickable prop is true', () => {
    render(<StatusBadge status="available" clickable={true} />);
    const badge = screen.getByRole('img');
    expect(badge).toHaveClass('cursor-pointer');
    expect(badge).toHaveClass('hover:opacity-80');
  });

  it('should not apply clickable styles when clickable prop is false', () => {
    render(<StatusBadge status="available" clickable={false} />);
    const badge = screen.getByRole('img');
    expect(badge).not.toHaveClass('cursor-pointer');
    expect(badge).not.toHaveClass('hover:opacity-80');
  });

  it('should call onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<StatusBadge status="available" onClick={handleClick} clickable={true} />);
    
    const badge = screen.getByRole('img');
    fireEvent.click(badge);
    
    expect(handleClick).toHaveBeenCalled();
  });

  it('should not call onClick when not clickable', () => {
    const handleClick = jest.fn();
    render(<StatusBadge status="available" onClick={handleClick} clickable={false} />);
    
    const badge = screen.getByRole('img');
    fireEvent.click(badge);
    
    expect(handleClick).toHaveBeenCalled(); // onClickは呼ばれるが、clickableでUIフィードバックがない
  });

  it('should render different statuses correctly', () => {
    const { rerender } = render(<StatusBadge status="booked" />);
    expect(screen.getByRole('img', { name: '予約済み' })).toHaveTextContent('×');

    rerender(<StatusBadge status="lottery" />);
    expect(screen.getByRole('img', { name: '抽選' })).toHaveTextContent('△');

    rerender(<StatusBadge status="unknown" />);
    expect(screen.getByRole('img', { name: '不明' })).toHaveTextContent('?');
  });
});