import { renderHook, act, waitFor } from '@testing-library/react';
import { useTargetDates } from './useTargetDates';
import { targetDatesApi, availabilityApi } from '../services/api';
import { TargetDate } from '../types/targetDates';

jest.mock('../services/api', () => ({
  targetDatesApi: {
    getAllTargetDates: jest.fn(),
    deleteTargetDate: jest.fn(),
  },
  availabilityApi: {
    deleteAvailabilityByDate: jest.fn(),
  },
}));

describe('useTargetDates', () => {
  const mockTargetDates: TargetDate[] = [
    {
      id: '1',
      date: '2025-01-15',
      label: 'バンド練習',
      isbooked: false,
      updatedAt: '2025-01-10T10:00:00Z'
    },
    {
      id: '2',
      date: '2025-01-20',
      label: 'リハーサル',
      isbooked: true,
      updatedAt: '2025-01-10T11:00:00Z'
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('初期データ取得', () => {
    it('正常にデータを取得できる', async () => {
      (targetDatesApi.getAllTargetDates as jest.Mock).mockResolvedValue({
        dates: mockTargetDates,
      });

      const { result } = renderHook(() => useTargetDates());

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toEqual([]);
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockTargetDates);
      expect(result.current.error).toBeNull();
      expect(targetDatesApi.getAllTargetDates).toHaveBeenCalledTimes(1);
    });

    it('APIレスポンスが不正な場合エラーを設定する', async () => {
      (targetDatesApi.getAllTargetDates as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() => useTargetDates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.error).toEqual({
        message: 'データの取得に失敗しました',
        originalError: 'Invalid API response structure',
      });
    });

    it('404エラーの場合適切なエラーメッセージを設定する', async () => {
      (targetDatesApi.getAllTargetDates as jest.Mock).mockRejectedValue({
        response: {
          status: 404,
          statusText: 'Not Found',
        },
      });

      const { result } = renderHook(() => useTargetDates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual({
        message: 'APIエンドポイントが見つかりません',
        statusCode: 404,
        statusText: 'Not Found',
      });
    });

    it('500エラーの場合適切なエラーメッセージを設定する', async () => {
      (targetDatesApi.getAllTargetDates as jest.Mock).mockRejectedValue({
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Database connection failed' },
        },
      });

      const { result } = renderHook(() => useTargetDates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual({
        message: 'サーバーエラーが発生しました',
        statusCode: 500,
        statusText: 'Internal Server Error',
        originalError: 'Database connection failed',
      });
    });

    it('503エラーの場合適切なエラーメッセージを設定する', async () => {
      (targetDatesApi.getAllTargetDates as jest.Mock).mockRejectedValue({
        response: {
          status: 503,
          statusText: 'Service Unavailable',
        },
      });

      const { result } = renderHook(() => useTargetDates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual({
        message: 'サービスが一時的に利用できません',
        statusCode: 503,
        statusText: 'Service Unavailable',
      });
    });

    it('ネットワークエラーの場合適切なエラーメッセージを設定する', async () => {
      (targetDatesApi.getAllTargetDates as jest.Mock).mockRejectedValue({
        request: {},
      });

      const { result } = renderHook(() => useTargetDates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual({
        message: 'ネットワーク接続エラー: サーバーに接続できません',
      });
    });

    it('不明なエラーの場合適切なエラーメッセージを設定する', async () => {
      (targetDatesApi.getAllTargetDates as jest.Mock).mockRejectedValue(
        new Error('Something went wrong')
      );

      const { result } = renderHook(() => useTargetDates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual({
        message: 'データの取得に失敗しました',
        originalError: 'Something went wrong',
      });
    });
  });

  describe('refetch', () => {
    it('データを再取得できる', async () => {
      (targetDatesApi.getAllTargetDates as jest.Mock)
        .mockResolvedValueOnce({ dates: mockTargetDates })
        .mockResolvedValueOnce({ dates: [mockTargetDates[0]] });

      const { result } = renderHook(() => useTargetDates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockTargetDates);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.data).toEqual([mockTargetDates[0]]);
      expect(targetDatesApi.getAllTargetDates).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteTargetDate', () => {
    it('練習日を削除してavailabilityデータも削除できる', async () => {
      (targetDatesApi.getAllTargetDates as jest.Mock).mockResolvedValue({
        dates: mockTargetDates,
      });
      (targetDatesApi.deleteTargetDate as jest.Mock).mockResolvedValue({});
      (availabilityApi.deleteAvailabilityByDate as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() => useTargetDates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let deleteResult: boolean = false;
      await act(async () => {
        deleteResult = await result.current.deleteTargetDate('1', '2025-01-15');
      });

      expect(deleteResult).toBe(true);
      expect(targetDatesApi.deleteTargetDate).toHaveBeenCalledWith('1');
      expect(availabilityApi.deleteAvailabilityByDate).toHaveBeenCalledWith('2025-01-15');
      expect(targetDatesApi.getAllTargetDates).toHaveBeenCalledTimes(2);
    });

    it('日付なしで練習日のみ削除できる', async () => {
      (targetDatesApi.getAllTargetDates as jest.Mock).mockResolvedValue({
        dates: mockTargetDates,
      });
      (targetDatesApi.deleteTargetDate as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() => useTargetDates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let deleteResult: boolean = false;
      await act(async () => {
        deleteResult = await result.current.deleteTargetDate('1');
      });

      expect(deleteResult).toBe(true);
      expect(targetDatesApi.deleteTargetDate).toHaveBeenCalledWith('1');
      expect(availabilityApi.deleteAvailabilityByDate).not.toHaveBeenCalled();
      expect(targetDatesApi.getAllTargetDates).toHaveBeenCalledTimes(2);
    });

    it('availabilityデータ削除に失敗しても練習日削除は成功する', async () => {
      (targetDatesApi.getAllTargetDates as jest.Mock).mockResolvedValue({
        dates: mockTargetDates,
      });
      (targetDatesApi.deleteTargetDate as jest.Mock).mockResolvedValue({});
      (availabilityApi.deleteAvailabilityByDate as jest.Mock).mockRejectedValue(
        new Error('Availability delete failed')
      );

      const { result } = renderHook(() => useTargetDates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let deleteResult: boolean = false;
      await act(async () => {
        deleteResult = await result.current.deleteTargetDate('1', '2025-01-15');
      });

      expect(deleteResult).toBe(true);
      expect(targetDatesApi.deleteTargetDate).toHaveBeenCalledWith('1');
      expect(availabilityApi.deleteAvailabilityByDate).toHaveBeenCalledWith('2025-01-15');
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to delete availability data for date 2025-01-15:',
        expect.any(Error)
      );
      expect(targetDatesApi.getAllTargetDates).toHaveBeenCalledTimes(2);
    });

    it('練習日削除に失敗した場合falseを返す', async () => {
      (targetDatesApi.getAllTargetDates as jest.Mock).mockResolvedValue({
        dates: mockTargetDates,
      });
      (targetDatesApi.deleteTargetDate as jest.Mock).mockRejectedValue(
        new Error('Delete failed')
      );

      const { result } = renderHook(() => useTargetDates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let deleteResult: boolean = false;
      await act(async () => {
        deleteResult = await result.current.deleteTargetDate('1', '2025-01-15');
      });

      expect(deleteResult).toBe(false);
      expect(targetDatesApi.deleteTargetDate).toHaveBeenCalledWith('1');
      expect(availabilityApi.deleteAvailabilityByDate).not.toHaveBeenCalled();
      expect(targetDatesApi.getAllTargetDates).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to delete target date:',
        expect.any(Error)
      );
    });
  });
});