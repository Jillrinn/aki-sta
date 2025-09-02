import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PullToRefresh from './PullToRefresh';

describe('PullToRefresh', () => {
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    mockOnRefresh.mockClear();
  });

  it('renders children correctly', () => {
    render(
      <PullToRefresh onRefresh={mockOnRefresh}>
        <div>Test Content</div>
      </PullToRefresh>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('does not show indicator initially', () => {
    const { container } = render(
      <PullToRefresh onRefresh={mockOnRefresh}>
        <div>Test Content</div>
      </PullToRefresh>
    );

    const indicator = container.querySelector('.absolute');
    expect(indicator).toBeNull();
  });

  it('responds to touch events', async () => {
    const { container } = render(
      <PullToRefresh onRefresh={mockOnRefresh}>
        <div style={{ height: '1000px' }}>Scrollable Content</div>
      </PullToRefresh>
    );

    const scrollContainer = container.querySelector('.overflow-auto');
    if (!scrollContainer) throw new Error('Container not found');

    // スクロール位置を最上部に設定
    Object.defineProperty(scrollContainer, 'scrollTop', {
      writable: true,
      value: 0,
    });

    // タッチ開始
    fireEvent.touchStart(scrollContainer, {
      touches: [{ clientY: 100 }],
    });

    // タッチ移動（下方向）
    fireEvent.touchMove(scrollContainer, {
      touches: [{ clientY: 150 }],
    });

    // インジケーターが表示されることを確認
    const indicator = container.querySelector('.absolute');
    expect(indicator).toBeTruthy();
  });

  it('triggers refresh when pulled beyond threshold', async () => {
    const { container } = render(
      <PullToRefresh onRefresh={mockOnRefresh}>
        <div>Test Content</div>
      </PullToRefresh>
    );

    const scrollContainer = container.querySelector('.overflow-auto');
    if (!scrollContainer) throw new Error('Container not found');

    Object.defineProperty(scrollContainer, 'scrollTop', {
      writable: true,
      value: 0,
    });

    // タッチ開始
    fireEvent.touchStart(scrollContainer, {
      touches: [{ clientY: 100 }],
    });

    // 閾値を超えて引っ張る
    fireEvent.touchMove(scrollContainer, {
      touches: [{ clientY: 200 }], // 100px引っ張る（閾値は80px）
    });

    // タッチ終了
    fireEvent.touchEnd(scrollContainer);

    // onRefreshが呼ばれることを確認
    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it('does not trigger refresh when pulled below threshold', () => {
    const { container } = render(
      <PullToRefresh onRefresh={mockOnRefresh}>
        <div>Test Content</div>
      </PullToRefresh>
    );

    const scrollContainer = container.querySelector('.overflow-auto');
    if (!scrollContainer) throw new Error('Container not found');

    Object.defineProperty(scrollContainer, 'scrollTop', {
      writable: true,
      value: 0,
    });

    // タッチ開始
    fireEvent.touchStart(scrollContainer, {
      touches: [{ clientY: 100 }],
    });

    // 閾値未満で引っ張る
    fireEvent.touchMove(scrollContainer, {
      touches: [{ clientY: 130 }], // 30px引っ張る（閾値は80px）
    });

    // タッチ終了
    fireEvent.touchEnd(scrollContainer);

    // onRefreshが呼ばれないことを確認
    expect(mockOnRefresh).not.toHaveBeenCalled();
  });

  it('does not activate when scrolled down', () => {
    const { container } = render(
      <PullToRefresh onRefresh={mockOnRefresh}>
        <div style={{ height: '1000px' }}>Scrollable Content</div>
      </PullToRefresh>
    );

    const scrollContainer = container.querySelector('.overflow-auto');
    if (!scrollContainer) throw new Error('Container not found');

    // スクロール位置を下に設定
    Object.defineProperty(scrollContainer, 'scrollTop', {
      writable: true,
      value: 100,
    });

    // タッチ開始
    fireEvent.touchStart(scrollContainer, {
      touches: [{ clientY: 100 }],
    });

    // タッチ移動（下方向）
    fireEvent.touchMove(scrollContainer, {
      touches: [{ clientY: 200 }],
    });

    // タッチ終了
    fireEvent.touchEnd(scrollContainer);

    // onRefreshが呼ばれないことを確認
    expect(mockOnRefresh).not.toHaveBeenCalled();
  });

  it('disables pull when disabled prop is true', () => {
    const { container } = render(
      <PullToRefresh onRefresh={mockOnRefresh} disabled={true}>
        <div>Test Content</div>
      </PullToRefresh>
    );

    const scrollContainer = container.querySelector('.overflow-auto');
    if (!scrollContainer) throw new Error('Container not found');

    Object.defineProperty(scrollContainer, 'scrollTop', {
      writable: true,
      value: 0,
    });

    // タッチイベントをシミュレート
    fireEvent.touchStart(scrollContainer, {
      touches: [{ clientY: 100 }],
    });

    fireEvent.touchMove(scrollContainer, {
      touches: [{ clientY: 200 }],
    });

    fireEvent.touchEnd(scrollContainer);

    // onRefreshが呼ばれないことを確認
    expect(mockOnRefresh).not.toHaveBeenCalled();
  });

  it('shows correct indicator text based on pull distance', () => {
    const { container } = render(
      <PullToRefresh onRefresh={mockOnRefresh}>
        <div>Test Content</div>
      </PullToRefresh>
    );

    const scrollContainer = container.querySelector('.overflow-auto');
    if (!scrollContainer) throw new Error('Container not found');

    Object.defineProperty(scrollContainer, 'scrollTop', {
      writable: true,
      value: 0,
    });

    // タッチ開始
    fireEvent.touchStart(scrollContainer, {
      touches: [{ clientY: 100 }],
    });

    // 少し引っ張る
    fireEvent.touchMove(scrollContainer, {
      touches: [{ clientY: 130 }],
    });

    expect(screen.getByText('↓ 引っ張って更新')).toBeInTheDocument();

    // 閾値を超えて引っ張る
    fireEvent.touchMove(scrollContainer, {
      touches: [{ clientY: 200 }],
    });

    expect(screen.getByText('↑ 離して更新')).toBeInTheDocument();
  });

  it('handles async onRefresh properly', async () => {
    const asyncOnRefresh = jest.fn().mockResolvedValue(undefined);

    const { container } = render(
      <PullToRefresh onRefresh={asyncOnRefresh}>
        <div>Test Content</div>
      </PullToRefresh>
    );

    const scrollContainer = container.querySelector('.overflow-auto');
    if (!scrollContainer) throw new Error('Container not found');

    Object.defineProperty(scrollContainer, 'scrollTop', {
      writable: true,
      value: 0,
    });

    // 更新をトリガー
    fireEvent.touchStart(scrollContainer, {
      touches: [{ clientY: 100 }],
    });

    fireEvent.touchMove(scrollContainer, {
      touches: [{ clientY: 200 }],
    });

    fireEvent.touchEnd(scrollContainer);

    // 非同期処理の完了を待つ
    await waitFor(() => {
      expect(asyncOnRefresh).toHaveBeenCalledTimes(1);
    });
  });
});