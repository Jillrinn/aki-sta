import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CheckingModal from './CheckingModal';

describe('CheckingModal', () => {
  it('モーダルが開いているときに内容が表示される', () => {
    render(
      <CheckingModal 
        isOpen={true} 
      />
    );

    expect(screen.getByText('実行状況を確認中...')).toBeInTheDocument();
    expect(screen.getByText('少々お待ちください')).toBeInTheDocument();
  });

  it('モーダルが閉じているときは何も表示されない', () => {
    const { container } = render(
      <CheckingModal 
        isOpen={false} 
      />
    );

    const modal = container.querySelector('.ReactModal__Content');
    expect(modal).not.toBeInTheDocument();
  });

  it('ローディングスピナーが表示される', () => {
    render(
      <CheckingModal 
        isOpen={true} 
      />
    );

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});