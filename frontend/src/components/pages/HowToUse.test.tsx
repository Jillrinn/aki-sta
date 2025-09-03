import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HowToUse from './HowToUse';

describe('HowToUse', () => {
  it('should render the component with title', () => {
    render(<HowToUse />);
    expect(screen.getByText('使い方はかんたん３ステップ')).toBeInTheDocument();
  });

  it('should display welcome message', () => {
    render(<HowToUse />);
    expect(screen.getByText('ようこそ！')).toBeInTheDocument();
    expect(screen.getByText(/面倒なスタジオ探しは/)).toBeInTheDocument();
    expect(screen.getByText(/あんさんぶるスタジオ/)).toBeInTheDocument();
  });

  it('should display all steps when initially opened', () => {
    render(<HowToUse />);
    
    expect(screen.getByText('【登録】')).toBeInTheDocument();
    expect(screen.getByText('練習したい日を教えよう')).toBeInTheDocument();
    expect(screen.getByText(/「練習日程一覧」ページで練習日を登録/)).toBeInTheDocument();
    
    expect(screen.getByText('【自動チェック】')).toBeInTheDocument();
    expect(screen.getByText('あとは待つだけ！')).toBeInTheDocument();
    expect(screen.getByText(/毎日2回（朝8時・夕方17時）/)).toBeInTheDocument();
    
    expect(screen.getByText('【即時チェック】')).toBeInTheDocument();
    expect(screen.getByText('今すぐ知りたい！')).toBeInTheDocument();
    expect(screen.getByText(/下の「今すぐ情報を集める」ボタン/)).toBeInTheDocument();
  });

  it('should toggle content visibility when header is clicked', async () => {
    render(<HowToUse />);
    
    const toggleButton = screen.getByRole('button', { name: /使い方はかんたん/ });
    const content = document.getElementById('how-to-use-content');
    
    expect(content).toHaveClass('opacity-100');
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(content).toHaveClass('opacity-0');
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });
    
    fireEvent.click(toggleButton);
    
    await waitFor(() => {
      expect(content).toHaveClass('opacity-100');
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });
  });


  it('should display all step icons', () => {
    render(<HowToUse />);
    
    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('⏰')).toBeInTheDocument();
    expect(screen.getByText('🔄')).toBeInTheDocument();
  });

  it('should display step numbers', () => {
    render(<HowToUse />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<HowToUse />);
    
    const toggleButton = screen.getByRole('button', { name: /使い方はかんたん/ });
    expect(toggleButton).toHaveAttribute('aria-expanded');
    expect(toggleButton).toHaveAttribute('aria-controls', 'how-to-use-content');
  });
});