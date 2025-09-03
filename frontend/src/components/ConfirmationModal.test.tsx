import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConfirmationModal from './ConfirmationModal';

describe('ConfirmationModal', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when isOpen is true', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('空き状況の取得を開始しますか？')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(
      <ConfirmationModal
        isOpen={false}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText('空き状況の取得を開始しますか？')).not.toBeInTheDocument();
  });

  it('should display all warning messages', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('処理について')).toBeInTheDocument();
    expect(screen.getByText('全ての情報を集めるのに約5分かかります')).toBeInTheDocument();
    expect(screen.getByText('更新すれば順次新しい情報が表示されていきます')).toBeInTheDocument();
  });

  it('should call onConfirm when 実行する button is clicked', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmButton = screen.getByLabelText('実行する');
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('should call onCancel when キャンセル button is clicked', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByLabelText('キャンセル');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should have correct button styles', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmButton = screen.getByLabelText('実行する');
    const cancelButton = screen.getByLabelText('キャンセル');

    expect(confirmButton).toHaveClass('bg-brand-blue');
    expect(confirmButton).toHaveClass('text-white');
    expect(cancelButton).toHaveClass('bg-gray-200');
    expect(cancelButton).toHaveClass('text-gray-800');
  });

  it('should have info icon', () => {
    render(
      <ConfirmationModal
        isOpen={true}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-blue-400');
  });
});