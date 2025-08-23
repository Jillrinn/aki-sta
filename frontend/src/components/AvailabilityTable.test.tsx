import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvailabilityTable from './AvailabilityTable';
import { availabilityApi } from '../services/api';

jest.mock('../services/api');

describe('AvailabilityTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (availabilityApi.getAvailability as jest.Mock).mockReturnValue(
      new Promise(() => {})
    );
    
    render(<AvailabilityTable />);
    expect(screen.getByText('データを読み込み中...')).toBeInTheDocument();
  });

  it('renders availability data correctly', async () => {
    const mockData = {
      date: '2025-11-15',
      facilities: [
        {
          facilityName: 'Ensemble Studio 本郷',
          timeSlots: { '13-17': 'available' },
          lastUpdated: '2025-08-20T10:00:00Z',
        },
        {
          facilityName: '音楽スタジオ 渋谷',
          timeSlots: { '13-17': 'booked' },
          lastUpdated: '2025-08-20T10:15:00Z',
        },
      ],
      dataSource: 'dummy' as const,
    };

    (availabilityApi.getAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      expect(screen.getByText('空きスタサーチくん')).toBeInTheDocument();
    });

    expect(screen.getByText('施設空き状況 - 2025-11-15')).toBeInTheDocument();
    expect(screen.getByText('Ensemble Studio 本郷')).toBeInTheDocument();
    expect(screen.getByText('音楽スタジオ 渋谷')).toBeInTheDocument();
    expect(screen.getByText('更新日時')).toBeInTheDocument();
    
    const availableStatuses = screen.getAllByText('○');
    const bookedStatuses = screen.getAllByText('×');
    
    expect(availableStatuses.length).toBeGreaterThan(0);
    expect(bookedStatuses.length).toBeGreaterThan(0);
    
    // 更新日時が表示されていることを確認
    // タイムゾーンに依存しないテスト: update-timeクラスの要素が存在することを確認
    const updateTimes = screen.getAllByRole('cell', { name: /\d{2}\/\d{2} \d{2}:\d{2}/ });
    expect(updateTimes).toHaveLength(2);
  });

  it('renders error state when API fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    (availabilityApi.getAvailability as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      // メインエラーメッセージを確認
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
      // 詳細エラーメッセージを確認
      expect(screen.getByText('詳細: API Error')).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('renders HTTP 500 error state correctly', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const httpError = {
      response: {
        status: 500,
        statusText: 'Internal Server Error'
      }
    };
    (availabilityApi.getAvailability as jest.Mock).mockRejectedValue(httpError);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      expect(screen.getByText('サーバーエラーが発生しました。時間をおいて再度お試しください')).toBeInTheDocument();
      expect(screen.getByText('HTTPステータス: 500')).toBeInTheDocument();
      expect(screen.getByText(/Internal Server Error/)).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('renders HTTP 404 error state correctly', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const httpError = {
      response: {
        status: 404,
        statusText: 'Not Found'
      }
    };
    (availabilityApi.getAvailability as jest.Mock).mockRejectedValue(httpError);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      expect(screen.getByText('APIエンドポイントが見つかりません。サーバーの設定を確認してください')).toBeInTheDocument();
      expect(screen.getByText('HTTPステータス: 404')).toBeInTheDocument();
      expect(screen.getByText(/Not Found/)).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('renders network error state correctly', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const networkError = {
      request: {}
    };
    (availabilityApi.getAvailability as jest.Mock).mockRejectedValue(networkError);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      expect(screen.getByText('ネットワーク接続エラー: サーバーに接続できません')).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('renders no data state when facilities are empty', async () => {
    const mockData = {
      date: '2025-11-15',
      facilities: [],
      dataSource: 'dummy' as const,
    };

    (availabilityApi.getAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      expect(screen.getByText('データがありません')).toBeInTheDocument();
    });
  });

  it('displays correct status symbols', async () => {
    const mockData = {
      date: '2025-11-15',
      facilities: [
        {
          facilityName: 'Test Facility 1',
          timeSlots: { '13-17': 'available' },
          lastUpdated: '2025-08-20T10:00:00Z',
        },
        {
          facilityName: 'Test Facility 2',
          timeSlots: { '13-17': 'booked' },
          lastUpdated: '2025-08-20T10:30:00Z',
        },
      ],
      dataSource: 'dummy' as const,
    };

    (availabilityApi.getAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      const availableStatuses = screen.getAllByText('○');
      const bookedStatuses = screen.getAllByText('×');
      
      expect(availableStatuses.length).toBeGreaterThan(0);
      expect(bookedStatuses.length).toBeGreaterThan(0);
    });
  });

  it('renders error with response body error message', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const httpError = {
      response: {
        status: 400,
        statusText: 'Bad Request',
        data: { error: 'Invalid date format' }
      }
    };
    (availabilityApi.getAvailability as jest.Mock).mockRejectedValue(httpError);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      expect(screen.getByText('サーバーエラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('HTTPステータス: 400')).toBeInTheDocument();
      expect(screen.getByText('詳細: Invalid date format')).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });
});