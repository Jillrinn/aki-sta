import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HowToUsePage from './HowToUsePage';

describe('HowToUsePage', () => {
  it('should render the component with title', () => {
    render(<HowToUsePage />);
    expect(screen.getByText('🎵 ようこそ！ 🎵')).toBeInTheDocument();
    expect(screen.getByText('音楽スタジオの空き状況をかんたんチェック！')).toBeInTheDocument();
  });

  it('should display facilities section', () => {
    render(<HowToUsePage />);
    expect(screen.getByText('📍 対応施設（順次拡大中！）')).toBeInTheDocument();
    expect(screen.getByText('・あんさんぶるスタジオ')).toBeInTheDocument();
    expect(screen.getByText('・目黒区民センター')).toBeInTheDocument();
  });

  it('should display all steps', () => {
    render(<HowToUsePage />);
    
    expect(screen.getByText('【使い方】')).toBeInTheDocument();
    
    expect(screen.getByText('練習日を登録')).toBeInTheDocument();
    expect(screen.getByText('「練習日程一覧」ページへ移動し、')).toBeInTheDocument();
    expect(screen.getByText('「新規登録」から希望の日時を登録！')).toBeInTheDocument();
    
    expect(screen.getByText('自動でチェック')).toBeInTheDocument();
    expect(screen.getByText('毎日3回（深夜1時、朝8時・夕方4時）')).toBeInTheDocument();
    expect(screen.getByText('最新の空き状況を更新')).toBeInTheDocument();
    
    expect(screen.getByText('結果を確認')).toBeInTheDocument();
    expect(screen.getByText('「空き状況一覧」ページで、登録した')).toBeInTheDocument();
    expect(screen.getByText('練習日の空き状況を確認！')).toBeInTheDocument();
  });

  it('should display instant check section', () => {
    render(<HowToUsePage />);
    expect(screen.getByText('今すぐ確認したい時は？')).toBeInTheDocument();
    expect(screen.getByText('「今すぐ情報を取得」ボタンを押して')).toBeInTheDocument();
    expect(screen.getByText('最新情報を取得開始！')).toBeInTheDocument();
  });

  it('should display CTA section', () => {
    render(<HowToUsePage />);
    expect(screen.getByText('🚀 さっそく始める！')).toBeInTheDocument();
  });


  it('should display all step icons', () => {
    render(<HowToUsePage />);
    
    expect(screen.getByText('1️⃣')).toBeInTheDocument();
    expect(screen.getByText('2️⃣')).toBeInTheDocument();
    expect(screen.getByText('3️⃣')).toBeInTheDocument();
  });
});