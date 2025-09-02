import { renderHook, act, waitFor } from '@testing-library/react';
import { useAvailabilityData } from './useAvailabilityData';
import { availabilityApi } from '../services/api';

jest.mock('../services/api');

describe('useAvailabilityData', () => {
  const mockData = {
    '2025-11-15': [
      {
        facilityName: 'Test Facility',
        timeSlots: { morning: 'available', afternoon: 'booked', evening: 'unknown' },
        lastUpdated: '2025-08-20T10:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches data on mount', async () => {
    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

    const { result } = renderHook(() => useAvailabilityData());

    // 初期状態
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isRefreshing).toBe(false);

    // データ取得完了を待つ
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(availabilityApi.getAllAvailability).toHaveBeenCalledTimes(1);
  });

  it('handles error when fetching data', async () => {
    const error = { request: {} }; // Simulate axios network error
    (availabilityApi.getAllAvailability as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useAvailabilityData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.message).toBe('ネットワーク接続エラー: サーバーに接続できません');
  });

  it('refetch function triggers data reload', async () => {
    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

    const { result } = renderHook(() => useAvailabilityData());

    // 初回のデータ取得を待つ
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(availabilityApi.getAllAvailability).toHaveBeenCalledTimes(1);

    // refetchを実行
    act(() => {
      result.current.refetch();
    });

    // isRefreshingがtrueになる
    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.loading).toBe(false);

    // 再取得完了を待つ
    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(availabilityApi.getAllAvailability).toHaveBeenCalledTimes(2);
  });

  it('validates response structure', async () => {
    const invalidData = {
      '2025-11-15': 'invalid', // 配列でなければならない
    };

    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(invalidData);

    const { result } = renderHook(() => useAvailabilityData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.originalError).toBe('Invalid API response structure');
  });

  it('handles HTTP error responses', async () => {
    const error = {
      response: {
        status: 500,
        statusText: 'Internal Server Error',
      },
    };

    (availabilityApi.getAllAvailability as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useAvailabilityData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error?.message).toBe('サーバーエラーが発生しました。時間をおいて再度お試しください');
    expect(result.current.error?.statusCode).toBe(500);
  });

  it('handles 404 error specifically', async () => {
    const error = {
      response: {
        status: 404,
        statusText: 'Not Found',
      },
    };

    (availabilityApi.getAllAvailability as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useAvailabilityData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error?.message).toBe('APIエンドポイントが見つかりません。サーバーの設定を確認してください');
    expect(result.current.error?.statusCode).toBe(404);
  });

  it('does not set loading to true during refresh', async () => {
    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

    const { result } = renderHook(() => useAvailabilityData());

    // 初回のデータ取得を待つ
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // refetchを実行
    act(() => {
      result.current.refetch();
    });

    // loadingはfalseのまま、isRefreshingがtrue
    expect(result.current.loading).toBe(false);
    expect(result.current.isRefreshing).toBe(true);
  });
});