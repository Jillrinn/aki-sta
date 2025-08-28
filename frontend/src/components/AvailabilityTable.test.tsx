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
    (availabilityApi.getAllAvailability as jest.Mock).mockReturnValue(
      new Promise(() => {})
    );
    
    render(<AvailabilityTable />);
    expect(screen.getByText('データを読み込み中...')).toBeInTheDocument();
  });

  it('renders all availability data with multiple tables', async () => {
    const mockData = {
      '2025-11-15': [
        {
          facilityName: 'あんさんぶるStudio和(本郷)',
          timeSlots: { 
            '9-12': 'unknown',
            '13-17': 'unknown',
            '18-21': 'unknown'
          },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
        {
          facilityName: 'あんさんぶるStudio音(初台)',
          timeSlots: { 
            '9-12': 'unknown',
            '13-17': 'unknown',
            '18-21': 'unknown'
          },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
      ],
      '2025-11-16': [
        {
          facilityName: 'あんさんぶるStudio和(本郷)',
          timeSlots: { 
            '9-12': 'booked',
            '13-17': 'available',
            '18-21': 'available'
          },
          lastUpdated: '2025-08-21T13:47:14Z',
        },
        {
          facilityName: 'あんさんぶるStudio音(初台)',
          timeSlots: { 
            '9-12': 'available',
            '13-17': 'booked',
            '18-21': 'available'
          },
          lastUpdated: '2025-08-21T13:47:14Z',
        },
      ],
    };

    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      expect(screen.getByText('空きスタサーチくん')).toBeInTheDocument();
    });

    // 各日付が表示されていることを確認
    expect(screen.getByText(/2025-11-15/)).toBeInTheDocument();
    expect(screen.getByText(/2025-11-16/)).toBeInTheDocument();

    // 各施設名が表示されていることを確認（各日付で表示されるので複数回）
    const hongo = screen.getAllByText('あんさんぶるStudio和(本郷)');
    const hatsudai = screen.getAllByText('あんさんぶるStudio音(初台)');
    expect(hongo.length).toBeGreaterThan(0);
    expect(hatsudai.length).toBeGreaterThan(0);

    // 全時間帯のヘッダーが表示されていることを確認
    const morningSlots = screen.getAllByText('9-12');
    const afternoonSlots = screen.getAllByText('13-17');
    const eveningSlots = screen.getAllByText('18-21');
    
    expect(morningSlots.length).toBeGreaterThan(0);
    expect(afternoonSlots.length).toBeGreaterThan(0);
    expect(eveningSlots.length).toBeGreaterThan(0);
    
    // ステータスシンボルが表示されていることを確認
    const availableStatuses = screen.getAllByText('○');
    const bookedStatuses = screen.getAllByText('×');
    const unknownStatuses = screen.getAllByText('?');
    
    expect(availableStatuses.length).toBeGreaterThan(0);
    expect(bookedStatuses.length).toBeGreaterThan(0);
    expect(unknownStatuses.length).toBeGreaterThan(0);
  });

  it('renders separate table for each date', async () => {
    const mockData = {
      '2025-11-15': [
        {
          facilityName: 'あんさんぶるStudio和(本郷)',
          timeSlots: { 
            '9-12': 'available',
            '13-17': 'booked',
            '18-21': 'available'
          },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
        {
          facilityName: 'あんさんぶるStudio音(初台)',
          timeSlots: { 
            '9-12': 'booked',
            '13-17': 'available',
            '18-21': 'booked'
          },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
      ],
      '2025-11-16': [
        {
          facilityName: 'あんさんぶるStudio和(本郷)',
          timeSlots: { 
            '9-12': 'booked',
            '13-17': 'available',
            '18-21': 'available'
          },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
      ],
    };

    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      // 各日付ごとにテーブルが存在することを確認
      const tables = screen.getAllByRole('table');
      expect(tables).toHaveLength(2); // 2つの日付なので2つのテーブル
      
      // 各日付のヘッダーが表示されていることを確認
      expect(screen.getByText('2025-11-15の空き状況')).toBeInTheDocument();
      expect(screen.getByText('2025-11-16の空き状況')).toBeInTheDocument();
    });
  });

  it('displays all time slots for each facility', async () => {
    const mockData = {
      '2025-11-15': [
        {
          facilityName: 'テスト施設',
          timeSlots: { 
            '9-12': 'available',
            '13-17': 'booked',
            '18-21': 'unknown'
          },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
      ],
    };

    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      // 全時間帯のステータスが表示されていることを確認
      expect(screen.getByText('9-12')).toBeInTheDocument();
      expect(screen.getByText('13-17')).toBeInTheDocument();
      expect(screen.getByText('18-21')).toBeInTheDocument();
      
      // 各ステータスが正しく表示されていることを確認（複数の要素がある場合を考慮）
      const availableElements = screen.getAllByText('○');
      const bookedElements = screen.getAllByText('×');
      const unknownElements = screen.getAllByText('?');
      
      expect(availableElements.length).toBeGreaterThan(0); // available
      expect(bookedElements.length).toBeGreaterThan(0); // booked
      expect(unknownElements.length).toBeGreaterThan(0); // unknown
    });
  });

  it('renders error state when API fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    (availabilityApi.getAllAvailability as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
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
    (availabilityApi.getAllAvailability as jest.Mock).mockRejectedValue(httpError);

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
    (availabilityApi.getAllAvailability as jest.Mock).mockRejectedValue(httpError);

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
    (availabilityApi.getAllAvailability as jest.Mock).mockRejectedValue(networkError);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      expect(screen.getByText('ネットワーク接続エラー: サーバーに接続できません')).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('renders no data state when facilities are empty', async () => {
    const mockData = {};

    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      expect(screen.getByText('データがありません')).toBeInTheDocument();
    });
  });

  it('sorts dates in ascending order', async () => {
    const mockData = {
      '2025-11-20': [
        {
          facilityName: 'テスト施設3',
          timeSlots: { '9-12': 'available', '13-17': 'available', '18-21': 'available' },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
      ],
      '2025-11-15': [
        {
          facilityName: 'テスト施設1',
          timeSlots: { '9-12': 'available', '13-17': 'available', '18-21': 'available' },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
      ],
      '2025-11-17': [
        {
          facilityName: 'テスト施設2',
          timeSlots: { '9-12': 'available', '13-17': 'available', '18-21': 'available' },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
      ],
    };

    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      const dateElements = screen.getAllByTestId(/date-header/);
      const dates = dateElements.map(el => el.textContent);
      
      // 日付が昇順でソートされていることを確認
      expect(dates[0]).toContain('2025-11-15');
      expect(dates[1]).toContain('2025-11-17');
      expect(dates[2]).toContain('2025-11-20');
    });
  });

  it('renders error with response body error message', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const httpError = {
      response: {
        status: 400,
        statusText: 'Bad Request',
        data: { error: 'Invalid request format' }
      }
    };
    (availabilityApi.getAllAvailability as jest.Mock).mockRejectedValue(httpError);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      expect(screen.getByText('サーバーエラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('HTTPステータス: 400')).toBeInTheDocument();
      expect(screen.getByText('詳細: Invalid request format')).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('handles invalid API response structure gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // 不正なレスポンス（配列ではなくオブジェクト）
    const invalidData = {
      '2025-11-15': {
        invalid: 'structure'
      }
    };
    
    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(invalidData);
    
    await act(async () => {
      render(<AvailabilityTable />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
      expect(screen.getByText(/Invalid API response structure/i)).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('handles response with missing facility fields', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // 必須フィールドが欠けているレスポンス
    const incompleteData = {
      '2025-11-15': [
        {
          facilityName: 'Test Facility'
          // timeSlots と lastUpdated が欠落
        }
      ]
    };
    
    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(incompleteData);
    
    await act(async () => {
      render(<AvailabilityTable />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
      expect(screen.getByText(/Invalid API response structure/i)).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('handles response with invalid timeSlots type', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // timeSlotsが文字列になっている不正なレスポンス
    const invalidTimeSlots = {
      '2025-11-15': [
        {
          facilityName: 'Test Facility',
          timeSlots: 'invalid string',
          lastUpdated: '2025-08-24T14:18:03Z'
        }
      ]
    };
    
    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(invalidTimeSlots);
    
    await act(async () => {
      render(<AvailabilityTable />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
      expect(screen.getByText(/Invalid API response structure/i)).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });
});