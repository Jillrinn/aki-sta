import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HowToUse from './HowToUse';

describe('HowToUse', () => {
  it('should render the component with title', () => {
    render(<HowToUse />);
    expect(screen.getByText('はじめての方へ - 使い方ガイド')).toBeInTheDocument();
  });

  it('should display all steps when initially opened', () => {
    render(<HowToUse />);
    
    expect(screen.getByText('ステップ1')).toBeInTheDocument();
    expect(screen.getByText('まずは「練習日程一覧」から練習日を登録しよう！')).toBeInTheDocument();
    
    expect(screen.getByText('ステップ2')).toBeInTheDocument();
    expect(screen.getByText('登録された日程の空き状況を空きスタサーチくんが確認しに行くよ！')).toBeInTheDocument();
    
    expect(screen.getByText('ステップ3')).toBeInTheDocument();
    expect(screen.getByText('毎日8時と17時の2回、自動で確認するよ！')).toBeInTheDocument();
    
    expect(screen.getByText('ステップ4')).toBeInTheDocument();
    expect(screen.getByText('今すぐ確認したい時は、一番下の「空き状況を取得」ボタンをタップ！')).toBeInTheDocument();
  });

  it('should toggle content visibility when header is clicked', async () => {
    render(<HowToUse />);
    
    const toggleButton = screen.getByRole('button', { name: /はじめての方へ/ });
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

  it('should display hint message', () => {
    render(<HowToUse />);
    expect(screen.getByText('ヒント: スマートフォンでは画面を下に引っ張ると更新できるよ！')).toBeInTheDocument();
  });

  it('should display all step icons', () => {
    render(<HowToUse />);
    
    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();
    expect(screen.getByText('⏰')).toBeInTheDocument();
    expect(screen.getByText('🔄')).toBeInTheDocument();
  });

  it('should display step numbers', () => {
    render(<HowToUse />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<HowToUse />);
    
    const toggleButton = screen.getByRole('button', { name: /はじめての方へ/ });
    expect(toggleButton).toHaveAttribute('aria-expanded');
    expect(toggleButton).toHaveAttribute('aria-controls', 'how-to-use-content');
  });
});