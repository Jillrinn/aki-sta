import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvailabilityPage from './AvailabilityPage';
import { availabilityApi, scraperApi } from '../../services/api';

jest.mock('../../services/api');

// useTargetDatesフックをモック
jest.mock('../../hooks/useTargetDates', () => ({
  useTargetDates: () => ({
    data: [],
    loading: false,
    error: null,
    refetch: jest.fn(),
    deleteTargetDate: jest.fn()
  })
}));

describe('AvailabilityPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset window size to desktop by default
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });
  });

  it('renders loading state initially', () => {
    (availabilityApi.getAllAvailability as jest.Mock).mockReturnValue(
      new Promise(() => {})
    );
    
    render(<AvailabilityPage />);
    expect(screen.getByText('データを読み込み中...')).toBeInTheDocument();
  });

  it('renders all availability data with multiple tables', async () => {
    const mockData = {
      '2025-11-15': [
        {
          centerName: 'Test Center', facilityName: 'あんさんぶるStudio和(本郷)', roomName: 'Room A',
          timeSlots: { 
            'morning': 'unknown',
            'afternoon': 'unknown',
            'evening': 'unknown'
          },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
        {
          centerName: 'Test Center', facilityName: 'あんさんぶるStudio音(初台)', roomName: 'Room A',
          timeSlots: { 
            'morning': 'unknown',
            'afternoon': 'unknown',
            'evening': 'unknown'
          },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
      ],
      '2025-11-16': [
        {
          centerName: 'Test Center', facilityName: 'あんさんぶるStudio和(本郷)', roomName: 'Room A',
          timeSlots: { 
            'morning': 'booked',
            'afternoon': 'available',
            'evening': 'available'
          },
          lastUpdated: '2025-08-21T13:47:14Z',
        },
        {
          centerName: 'Test Center', facilityName: 'あんさんぶるStudio音(初台)', roomName: 'Room A',
          timeSlots: { 
            'morning': 'available',
            'afternoon': 'booked',
            'evening': 'available'
          },
          lastUpdated: '2025-08-21T13:47:14Z',
        },
      ],
    };

    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<AvailabilityPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('空きスタサーチくん')).toBeInTheDocument();
    });
    
    // カテゴリーセクションを展開
    const categoryButtons = screen.getAllByText(/【.*】/);
    categoryButtons.forEach(button => fireEvent.click(button));

    // 各日付が表示されていることを確認
    expect(screen.getByText(/2025-11-15/)).toBeInTheDocument();
    expect(screen.getByText(/2025-11-16/)).toBeInTheDocument();

    // 各施設名が表示されていることを確認（各日付で表示されるので複数回）
    const hongo = screen.getAllByText('あんさんぶるStudio和(本郷)');
    const hatsudai = screen.getAllByText('あんさんぶるStudio音(初台)');
    expect(hongo.length).toBeGreaterThan(0);
    expect(hatsudai.length).toBeGreaterThan(0);

    // 全時間帯のヘッダーが表示されていることを確認
    const morningSlots = screen.getAllByText('午前');
    const afternoonSlots = screen.getAllByText('午後');
    const eveningSlots = screen.getAllByText('夜間');
    
    expect(morningSlots.length).toBeGreaterThan(0);
    expect(afternoonSlots.length).toBeGreaterThan(0);
    expect(eveningSlots.length).toBeGreaterThan(0);
    
    // ステータスシンボルが表示されていることを確認
    const availableStatuses = screen.getAllByText('○');
    const bookedStatuses = screen.getAllByText('×');
    // unknownステータスは表示されない
    const unknownStatuses = screen.queryAllByText('?');
    
    expect(availableStatuses.length).toBeGreaterThan(0);
    expect(bookedStatuses.length).toBeGreaterThan(0);
    expect(unknownStatuses.length).toBe(0);
  });

  it('renders separate table for each date', async () => {
    const mockData = {
      '2025-11-15': [
        {
          centerName: 'Test Center', facilityName: 'あんさんぶるStudio和(本郷)', roomName: 'Room A',
          timeSlots: { 
            'morning': 'available',
            'afternoon': 'booked',
            'evening': 'available'
          },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
        {
          centerName: 'Test Center', facilityName: 'あんさんぶるStudio音(初台)', roomName: 'Room A',
          timeSlots: { 
            'morning': 'booked',
            'afternoon': 'available',
            'evening': 'booked'
          },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
      ],
      '2025-11-16': [
        {
          centerName: 'Test Center', facilityName: 'あんさんぶるStudio和(本郷)', roomName: 'Room A',
          timeSlots: { 
            'morning': 'booked',
            'afternoon': 'available',
            'evening': 'available'
          },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
      ],
    };

    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<AvailabilityPage />);
    });

    await waitFor(() => {
      // 各日付ごとにテーブルが存在することを確認
      const tables = screen.getAllByRole('table');
      expect(tables).toHaveLength(2); // 2つの日付なので2つのテーブル
      
      // 各日付のヘッダーが表示されていることを確認
      expect(screen.getByText('2025-11-15')).toBeInTheDocument();
      expect(screen.getByText('2025-11-16')).toBeInTheDocument();
    });
  });

  it('displays all time slots for each facility', async () => {
    const mockData = {
      '2025-11-15': [
        {
          centerName: 'Test Center', facilityName: 'テスト施設', roomName: 'Room A',
          timeSlots: { 
            'morning': 'available',
            'afternoon': 'booked',
            'evening': 'unknown'
          },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
      ],
    };

    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<AvailabilityPage />);
    });

    await waitFor(() => {
      // 全時間帯のステータスが表示されていることを確認
      expect(screen.getByText('午前')).toBeInTheDocument();
      expect(screen.getByText('午後')).toBeInTheDocument();
      expect(screen.getByText('夜間')).toBeInTheDocument();
      
      // 各ステータスが正しく表示されていることを確認（複数の要素がある場合を考慮）
      const availableElements = screen.getAllByText('○');
      const bookedElements = screen.getAllByText('×');
      // unknownステータスは表示されない
      const unknownElements = screen.queryAllByText('?');
      
      expect(availableElements.length).toBeGreaterThan(0); // available
      expect(bookedElements.length).toBeGreaterThan(0); // booked
      expect(unknownElements.length).toBe(0); // unknown is not displayed
    });
  });

  it('renders error state when API fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    (availabilityApi.getAllAvailability as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    await act(async () => {
      render(<AvailabilityPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
      expect(screen.getByText('詳細: API Error')).toBeInTheDocument();
      
      // 共通UIコンポーネントが表示されていることを確認
      expect(screen.getByText('空きスタサーチくん')).toBeInTheDocument();
      expect(screen.getByText('施設空き状況一覧')).toBeInTheDocument();
      expect(screen.getByText('💡 使い方')).toBeInTheDocument();
      expect(screen.getByText('📅 練習日程一覧')).toBeInTheDocument();
      expect(screen.getByText('今すぐ情報を取得')).toBeInTheDocument();
      expect(screen.getByText('更新')).toBeInTheDocument();
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
      render(<AvailabilityPage />);
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
      render(<AvailabilityPage />);
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
      render(<AvailabilityPage />);
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
      render(<AvailabilityPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('データがありません')).toBeInTheDocument();
      
      // 共通UIコンポーネントが表示されていることを確認
      expect(screen.getByText('空きスタサーチくん')).toBeInTheDocument();
      expect(screen.getByText('施設空き状況一覧')).toBeInTheDocument();
      expect(screen.getByText('💡 使い方')).toBeInTheDocument();
      expect(screen.getByText('📅 練習日程一覧')).toBeInTheDocument();
      expect(screen.getByText('今すぐ情報を取得')).toBeInTheDocument();
      expect(screen.getByText('更新')).toBeInTheDocument();
    });
  });

  it('sorts dates in ascending order', async () => {
    const mockData = {
      '2025-11-20': [
        {
          centerName: 'Test Center', facilityName: 'テスト施設3', roomName: 'Room A',
          timeSlots: { 'morning': 'available', 'afternoon': 'available', 'evening': 'available' },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
      ],
      '2025-11-15': [
        {
          centerName: 'Test Center', facilityName: 'テスト施設1', roomName: 'Room A',
          timeSlots: { 'morning': 'available', 'afternoon': 'available', 'evening': 'available' },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
      ],
      '2025-11-17': [
        {
          centerName: 'Test Center', facilityName: 'テスト施設2', roomName: 'Room A',
          timeSlots: { 'morning': 'available', 'afternoon': 'available', 'evening': 'available' },
          lastUpdated: '2025-08-24T14:18:03Z',
        },
      ],
    };

    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<AvailabilityPage />);
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
      render(<AvailabilityPage />);
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
      render(<AvailabilityPage />);
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
      render(<AvailabilityPage />);
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
          centerName: 'Test Center', facilityName: 'Test Facility', roomName: 'Room A',
          timeSlots: 'invalid string',
          lastUpdated: '2025-08-24T14:18:03Z'
        }
      ]
    };
    
    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(invalidTimeSlots);
    
    await act(async () => {
      render(<AvailabilityPage />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
      expect(screen.getByText(/Invalid API response structure/i)).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });

  describe('Mobile Responsive Tests', () => {
    beforeEach(() => {
      // Reset to desktop size before each test
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });
    });

    it('renders mobile card view when screen width is less than 640px', async () => {
      // Set mobile screen size BEFORE rendering
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      const mockData = {
        '2025-11-15': [
          {
            centerName: 'Test Center', 
            facilityName: 'あんさんぶるStudio和(本郷)', 
            roomName: 'Room A',
            timeSlots: { 
              'morning': 'available',
              'afternoon': 'available',
              'evening': 'unknown'
            },
            lastUpdated: '2025-08-24T14:18:03Z',
          },
        ],
      };

      (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

      render(<AvailabilityPage />);

      await waitFor(() => {
        // First ensure the content has loaded
        expect(screen.getByText('空きスタサーチくん')).toBeInTheDocument();
      });

      // Force a resize to trigger the mobile view
      await act(async () => {
        window.dispatchEvent(new Event('resize'));
      });

      // Wait for the mobile view to be rendered
      await waitFor(() => {
        // In mobile view, tables should not be rendered
        const tables = screen.queryAllByRole('table');
        expect(tables).toHaveLength(0);
      });

      // モバイルビューでカテゴリーセクションを展開
      const mobileCategory = screen.getByText('Test Center');
      fireEvent.click(mobileCategory);
      
      await waitFor(() => {
        // Check that mobile card elements are rendered
        // Facility name should be visible
        expect(screen.getByText('あんさんぶるStudio和(本郷)')).toBeInTheDocument();
      });
    });

    it('renders desktop table view when screen width is 640px or more', async () => {
      // Ensure desktop screen size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });

      const mockData = {
        '2025-11-15': [
          {
            centerName: 'Test Center', facilityName: 'あんさんぶるStudio和(本郷)', roomName: 'Room A',
            timeSlots: { 
              'morning': 'available',
              'afternoon': 'booked',
              'evening': 'unknown'
            },
            lastUpdated: '2025-08-24T14:18:03Z',
          },
        ],
      };

      (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

      await act(async () => {
        render(<AvailabilityPage />);
      });

      await waitFor(() => {
        // Check that table IS rendered
        const tables = screen.getAllByRole('table');
        expect(tables).toHaveLength(1);

        // Check that time slot headers are in table format
        expect(screen.getByText('午前')).toBeInTheDocument();
        expect(screen.getByText('午後')).toBeInTheDocument();
        expect(screen.getByText('夜間')).toBeInTheDocument();

        // Headers are properly displayed in desktop view
      });
    });

    it('switches from desktop to mobile view on window resize', async () => {
      // Start with desktop size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });

      const mockData = {
        '2025-11-15': [
          {
            centerName: 'Test Center', facilityName: 'テスト施設', roomName: 'Room A',
            timeSlots: { 
              'morning': 'available',
              'afternoon': 'available',
              'evening': 'available'
            },
            lastUpdated: '2025-08-24T14:18:03Z',
          },
        ],
      };

      (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

      await act(async () => {
        render(<AvailabilityPage />);
      });

      // Initially should show table
      await waitFor(() => {
        expect(screen.getAllByRole('table')).toHaveLength(1);
      });

      // Resize to mobile
      await act(async () => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 375
        });
        window.dispatchEvent(new Event('resize'));
      });

      // Should now show mobile cards
      await waitFor(() => {
        expect(screen.queryAllByRole('table')).toHaveLength(0);
      });
      
      // モバイルビューでカテゴリーセクションを展開
      const mobileCategoryButton = screen.getByText('Test Center');
      fireEvent.click(mobileCategoryButton);
      
      await waitFor(() => {
        expect(screen.getByText('テスト施設')).toBeInTheDocument();
      });
      
      // カードを展開して時間帯を表示
      // モバイルビューでは、afternoonがavailableなので自動的に展開される
      await waitFor(() => {
        expect(screen.getByText('午前')).toBeInTheDocument();
      });
    });

    it('switches from mobile to desktop view on window resize', async () => {
      // Start with mobile size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      const mockData = {
        '2025-11-15': [
          {
            centerName: 'Test Center', facilityName: 'テスト施設', roomName: 'Room A',
            timeSlots: { 
              'morning': 'available',
              'afternoon': 'available',
              'evening': 'available'
            },
            lastUpdated: '2025-08-24T14:18:03Z',
          },
        ],
      };

      (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

      await act(async () => {
        render(<AvailabilityPage />);
      });

      // Initially should show mobile cards
      await waitFor(() => {
        expect(screen.queryAllByRole('table')).toHaveLength(0);
      });
      
      // モバイルビューでカテゴリーセクションを展開
      const mobileCategoryButton = screen.getByText('Test Center');
      fireEvent.click(mobileCategoryButton);
      
      await waitFor(() => {
        expect(screen.getByText('テスト施設')).toBeInTheDocument();
      });
      
      // カードを展開して時間帯を表示
      // モバイルビューでは、afternoonがavailableなので自動的に展開される
      await waitFor(() => {
        expect(screen.getByText('午前')).toBeInTheDocument();
      });

      // Resize to desktop
      await act(async () => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 1024
        });
        window.dispatchEvent(new Event('resize'));
      });

      // Should now show table
      await waitFor(() => {
        expect(screen.getAllByRole('table')).toHaveLength(1);
      });
      
      // デスクトップビューでカテゴリーセクションを展開
      const categoryRow = screen.getByText('【Test Center】').closest('tr');
      if (categoryRow) {
        fireEvent.click(categoryRow);
      }
      
      await waitFor(() => {
        // Facility should be visible after expanding
        expect(screen.getByText('テスト施設')).toBeInTheDocument();
        // Time slot headers should be visible in desktop table
        expect(screen.getByText('午前')).toBeInTheDocument();
      });
    });

    it('renders multiple facility cards in mobile view', async () => {
      // Set mobile screen size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      const mockData = {
        '2025-11-15': [
          {
            centerName: 'Test Center', facilityName: 'あんさんぶるStudio和(本郷)', roomName: 'Room A',
            timeSlots: { 
              'morning': 'available',
              'afternoon': 'booked',
              'evening': 'unknown'
            },
            lastUpdated: '2025-08-24T14:18:03Z',
          },
          {
            centerName: 'Test Center', facilityName: 'あんさんぶるStudio音(初台)', roomName: 'Room A',
            timeSlots: { 
              'morning': 'booked',
              'afternoon': 'available',
              'evening': 'available'
            },
            lastUpdated: '2025-08-24T14:18:03Z',
          },
        ],
      };

      (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

      await act(async () => {
        render(<AvailabilityPage />);
      });

      // カテゴリーセクションを展開
      await waitFor(() => {
        expect(screen.getByText('Test Center')).toBeInTheDocument();
      });
      
      const categoryButton = screen.getByText('Test Center');
      fireEvent.click(categoryButton);
      
      await waitFor(() => {
        // Both facilities should be visible
        expect(screen.getByText('あんさんぶるStudio和(本郷)')).toBeInTheDocument();
        expect(screen.getByText('あんさんぶるStudio音(初台)')).toBeInTheDocument();
      });
      
      // Second facility (音) のカードを展開 (13-17 is available)
      // In mobile view, the card expands automatically when 13-17 is available
      // So we should be able to see the time slots without clicking
      await waitFor(() => {
        // Check that the second facility (音) is expanded automatically
        expect(screen.getByText('午前')).toBeInTheDocument();
      });
      
      // First facility (和) should show collapsed message (13-17 is booked)
      await waitFor(() => {
        expect(screen.getByText('希望時間は空きなし')).toBeInTheDocument();
      });
    });

    it('displays update time with clock emoji in mobile view', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      const mockData = {
        '2025-11-15': [
          {
            centerName: 'Test Center', facilityName: 'テスト施設', roomName: 'Room A',
            timeSlots: { 
              'morning': 'available',
              'afternoon': 'available',
              'evening': 'available'
            },
            lastUpdated: '2025-08-24T14:18:03Z',
          },
        ],
      };

      (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

      await act(async () => {
        render(<AvailabilityPage />);
      });

      // カテゴリーセクションを展開
      await waitFor(() => {
        expect(screen.getByText('Test Center')).toBeInTheDocument();
      });
      
      const categoryButton = screen.getByText('Test Center');
      fireEvent.click(categoryButton);
      
      await waitFor(() => {
        expect(screen.getByText('テスト施設')).toBeInTheDocument();
      });
      
      // カードを展開して更新時刻を表示
      // モバイルビューでは、afternoonがavailableなので自動的に展開される
      await waitFor(() => {
        expect(screen.getByText('🕐')).toBeInTheDocument();
        expect(screen.getAllByText(/更新/)[0]).toBeInTheDocument();
      });
    });

    it('handles boundary case at exactly 640px', async () => {
      // Test at exactly 640px (should show desktop)
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640
      });

      const mockData = {
        '2025-11-15': [
          {
            centerName: 'Test Center', facilityName: 'テスト施設', roomName: 'Room A',
            timeSlots: { 
              'morning': 'available',
              'afternoon': 'available',
              'evening': 'available'
            },
            lastUpdated: '2025-08-24T14:18:03Z',
          },
        ],
      };

      (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

      await act(async () => {
        render(<AvailabilityPage />);
      });

      await waitFor(() => {
        // At 640px, should show desktop table view
        expect(screen.getAllByRole('table')).toHaveLength(1);
      });
      
      // デスクトップビューでカテゴリーセクションを展開
      const categoryRow = screen.getByText('【Test Center】').closest('tr');
      if (categoryRow) {
        fireEvent.click(categoryRow);
      }
      
      await waitFor(() => {
        // Facility should be visible after expanding
        expect(screen.getByText('テスト施設')).toBeInTheDocument();
        // Time slot headers should be visible in desktop table
        expect(screen.getByText('午前')).toBeInTheDocument();
      });
    });

    it('handles boundary case at 639px', async () => {
      // Test at 639px (should show mobile)
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 639
      });

      const mockData = {
        '2025-11-15': [
          {
            centerName: 'Test Center', facilityName: 'テスト施設', roomName: 'Room A',
            timeSlots: { 
              'morning': 'available',
              'afternoon': 'available',
              'evening': 'available'
            },
            lastUpdated: '2025-08-24T14:18:03Z',
          },
        ],
      };

      (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

      await act(async () => {
        render(<AvailabilityPage />);
      });

      await waitFor(() => {
        // At 639px, should show mobile card view
        expect(screen.queryAllByRole('table')).toHaveLength(0);
      });
      
      // モバイルビューでカテゴリーセクションを展開
      const mobileCategory = screen.getByText('Test Center');
      fireEvent.click(mobileCategory);
      
      await waitFor(() => {
        expect(screen.getByText('テスト施設')).toBeInTheDocument();
      });
      
      // カードを展開
      // モバイルビューでは、afternoonがavailableなので自動的に展開される
      await waitFor(() => {
        expect(screen.getByText('午前')).toBeInTheDocument();
      });
    });

    it('cleans up resize event listener on unmount', async () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const mockData = {
        '2025-11-15': [
          {
            centerName: 'Test Center', facilityName: 'テスト施設', roomName: 'Room A',
            timeSlots: { 
              'morning': 'available',
              'afternoon': 'available',
              'evening': 'available'
            },
            lastUpdated: '2025-08-24T14:18:03Z',
          },
        ],
      };

      (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

      const { unmount } = render(<AvailabilityPage />);

      await waitFor(() => {
        expect(screen.getByText('空きスタサーチくん')).toBeInTheDocument();
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Date-specific scraping', () => {
    const mockTargetDatesWithEmptyDate = [
      { id: '1', date: '2025-09-20', label: '練習日', isbooked: false }
    ];
    
    beforeEach(() => {
      jest.clearAllMocks();
      // Reset window size to desktop by default
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });
    });

    it('shows clickable text when no data is available for a date', async () => {
      // 空のデータでモック
      (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue({});

      // useTargetDatesモジュールをモック
      jest.spyOn(require('../../hooks/useTargetDates'), 'useTargetDates').mockReturnValue({
        data: mockTargetDatesWithEmptyDate,
        loading: false,
        error: null,
        refetch: jest.fn(),
        deleteTargetDate: jest.fn()
      });
      
      await act(async () => {
        render(<AvailabilityPage />);
      });

      await waitFor(() => {
        const clickableText = screen.getByText(/空き状況はまだ取得されていません。（クリックで取得）/);
        expect(clickableText).toBeInTheDocument();
        expect(clickableText.tagName).toBe('BUTTON');
      });
    });

    it('triggers scraping when clicking on empty date with confirmation', async () => {
      // Setup mocks
      (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue({});
      (scraperApi.triggerScrapingByDate as jest.Mock).mockResolvedValue({
        success: true,
        message: '2025-09-20の空き状況取得を開始しました'
      });

      // useTargetDatesモジュールをモック
      jest.spyOn(require('../../hooks/useTargetDates'), 'useTargetDates').mockReturnValue({
        data: mockTargetDatesWithEmptyDate,
        loading: false,
        error: null,
        refetch: jest.fn(),
        deleteTargetDate: jest.fn()
      });
      
      await act(async () => {
        render(<AvailabilityPage />);
      });

      // クリック可能なテキストを取得
      const clickableText = await screen.findByText(/空き状況はまだ取得されていません。（クリックで取得）/);

      // クリックして確認モーダルを表示
      await act(async () => {
        fireEvent.click(clickableText);
      });

      // 確認モーダルが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/2025-09-20の空き状況を取得しますか？/)).toBeInTheDocument();
        expect(screen.getByText('処理について')).toBeInTheDocument();
        expect(screen.getByText('実行する')).toBeInTheDocument();
      });

      // 実行ボタンをクリック
      const confirmButton = screen.getByRole('button', { name: '実行する' });
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      // API呼び出しを確認
      expect(scraperApi.triggerScrapingByDate).toHaveBeenCalledWith('2025-09-20');
      
      // 結果モーダルが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/2025-09-20の空き状況取得を開始しました/)).toBeInTheDocument();
      });
    });

    it('shows error modal when scraping fails after confirmation', async () => {
      // Setup mocks
      (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue({});
      (scraperApi.triggerScrapingByDate as jest.Mock).mockResolvedValue({
        success: false,
        message: '現在スクレイピング処理が実行中です'
      });

      // useTargetDatesモジュールをモック
      jest.spyOn(require('../../hooks/useTargetDates'), 'useTargetDates').mockReturnValue({
        data: mockTargetDatesWithEmptyDate,
        loading: false,
        error: null,
        refetch: jest.fn(),
        deleteTargetDate: jest.fn()
      });
      
      await act(async () => {
        render(<AvailabilityPage />);
      });

      // クリック可能なテキストを取得
      const clickableText = await screen.findByText(/空き状況はまだ取得されていません。（クリックで取得）/);

      // クリックして確認モーダルを表示
      await act(async () => {
        fireEvent.click(clickableText);
      });

      // 確認モーダルが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/2025-09-20の空き状況を取得しますか？/)).toBeInTheDocument();
      });

      // 実行ボタンをクリック
      const confirmButton = screen.getByRole('button', { name: '実行する' });
      await act(async () => {
        fireEvent.click(confirmButton);
      });

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/現在スクレイピング処理が実行中です/)).toBeInTheDocument();
      });
    });

    it('cancels scraping when clicking cancel in confirmation modal', async () => {
      // Setup mocks
      (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue({});
      (scraperApi.triggerScrapingByDate as jest.Mock).mockResolvedValue({
        success: true,
        message: '2025-09-20の空き状況取得を開始しました'
      });

      // useTargetDatesモジュールをモック
      jest.spyOn(require('../../hooks/useTargetDates'), 'useTargetDates').mockReturnValue({
        data: mockTargetDatesWithEmptyDate,
        loading: false,
        error: null,
        refetch: jest.fn(),
        deleteTargetDate: jest.fn()
      });
      
      await act(async () => {
        render(<AvailabilityPage />);
      });

      // クリック可能なテキストを取得
      const clickableText = await screen.findByText(/空き状況はまだ取得されていません。（クリックで取得）/);

      // クリックして確認モーダルを表示
      await act(async () => {
        fireEvent.click(clickableText);
      });

      // 確認モーダルが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/2025-09-20の空き状況を取得しますか？/)).toBeInTheDocument();
      });

      // キャンセルボタンをクリック
      const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // API呼び出しがされていないことを確認
      expect(scraperApi.triggerScrapingByDate).not.toHaveBeenCalled();
      
      // 確認モーダルが閉じられたことを確認
      await waitFor(() => {
        expect(screen.queryByText(/2025-09-20の空き状況を取得しますか？/)).not.toBeInTheDocument();
      });
    });
  });
});