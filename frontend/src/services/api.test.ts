import { availabilityApi, scraperApi, targetDatesApi } from './api';

// HttpClientクラスのモック
jest.mock('./httpClient', () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();
  const mockDelete = jest.fn();
  
  return {
    httpClient: {
      get: mockGet,
      post: mockPost,
      delete: mockDelete,
    },
    HttpClient: {
      isAxiosError: jest.fn(() => false),
    },
    __mockGet: mockGet,
    __mockPost: mockPost,
    __mockDelete: mockDelete,
  };
});

// モック関数を取得
const { __mockGet: mockGet, __mockPost: mockPost, __mockDelete: mockDelete } = jest.requireMock('./httpClient');

describe('availabilityApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAvailability', () => {
    const mockDate = '2025-11-15';
    const mockResponse = {
      data: {
        date: mockDate,
        facilities: [
          {
            facilityName: 'Test Facility',
            timeSlots: { 'afternoon': 'available' },
            lastUpdated: '2025-08-20T10:00:00Z',
          },
        ],
        dataSource: 'dummy' as const,
      },
    };

    it('should fetch availability data successfully', async () => {
      mockGet.mockResolvedValue(mockResponse);

      const result = await availabilityApi.getAvailability(mockDate);

      expect(mockGet).toHaveBeenCalledWith(`/availability/${mockDate}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = new Error('Network error');

      mockGet.mockRejectedValue(mockError);

      await expect(availabilityApi.getAvailability(mockDate)).rejects.toThrow('Network error');
      expect(mockGet).toHaveBeenCalledWith(`/availability/${mockDate}`);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getAllAvailability', () => {
    const mockResponse = {
      data: {
        '2025-11-15': [
          {
            facilityName: 'Test Facility',
            roomName: 'Room A',
            timeSlots: { 'afternoon': 'available' },
            lastUpdated: '2025-08-20T10:00:00Z',
          },
        ],
      },
    };

    it('should fetch all availability data successfully', async () => {
      mockGet.mockResolvedValue(mockResponse);

      const result = await availabilityApi.getAllAvailability();

      expect(mockGet).toHaveBeenCalledWith('/availability');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('deleteAvailabilityByDate', () => {
    const mockDate = '2025-11-15';
    const mockResponse = {
      data: {
        success: true,
        message: 'Deleted successfully',
      },
    };

    it('should delete availability by date successfully', async () => {
      mockDelete.mockResolvedValue(mockResponse);

      const result = await availabilityApi.deleteAvailabilityByDate(mockDate);

      expect(mockDelete).toHaveBeenCalledWith(`/availability/date/${mockDate}`);
      expect(result).toEqual(mockResponse.data);
    });
  });
});

describe('scraperApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('triggerScraping', () => {
    const mockResponse = {
      data: {
        success: true,
        message: 'Scraping started',
      },
    };

    it('should trigger scraper successfully', async () => {
      mockPost.mockResolvedValue(mockResponse);

      const result = await scraperApi.triggerScraping();

      expect(mockPost).toHaveBeenCalledWith('/scrape');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle scraper API errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = new Error('Scraper error');

      mockPost.mockRejectedValue(mockError);

      await expect(scraperApi.triggerScraping()).rejects.toThrow('Scraper error');
      expect(mockPost).toHaveBeenCalledWith('/scrape');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('triggerBatchScraping', () => {
    const mockResponse = {
      data: {
        success: true,
        message: 'Batch scraping started',
        targetDates: ['2025-09-15', '2025-09-20']
      },
    };

    it('should trigger batch scraper successfully', async () => {
      mockPost.mockResolvedValue(mockResponse);

      const result = await scraperApi.triggerBatchScraping();

      expect(mockPost).toHaveBeenCalledWith('/scrape/batch', { includeAllTargetDates: true });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('triggerScrapingByDate', () => {
    const testDate = '2025-09-20';
    const mockResponse = {
      data: {
        success: true,
        message: '2025-09-20の空き状況取得を開始しました',
        date: testDate
      },
    };

    it('should trigger scraping for a specific date successfully', async () => {
      mockPost.mockResolvedValue(mockResponse);

      const result = await scraperApi.triggerScrapingByDate(testDate);

      expect(mockPost).toHaveBeenCalledWith('/scrape/date', { date: testDate });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle 409 error (already running)', async () => {
      const mockError = {
        response: {
          status: 409,
          data: {
            success: false,
            message: '現在スクレイピング処理が実行中です'
          }
        }
      };
      
      const { HttpClient } = jest.requireMock('./httpClient');
      HttpClient.isAxiosError.mockReturnValue(true);
      mockPost.mockRejectedValue(mockError);

      const result = await scraperApi.triggerScrapingByDate(testDate);

      expect(result).toEqual(mockError.response.data);
    });

    it('should handle other errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = new Error('Network error');
      mockPost.mockRejectedValue(mockError);
      
      const { HttpClient } = jest.requireMock('./httpClient');
      HttpClient.isAxiosError.mockReturnValue(false);

      await expect(scraperApi.triggerScrapingByDate(testDate)).rejects.toThrow('Network error');
      expect(mockPost).toHaveBeenCalledWith('/scrape/date', { date: testDate });
      
      consoleErrorSpy.mockRestore();
    });
  });
});

describe('targetDatesApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTargetDates', () => {
    const mockResponse = {
      data: {
        dates: [
          {
            id: '1',
            date: '2025-09-15',
            label: 'Practice 1'
          },
          {
            id: '2',
            date: '2025-09-20',
            label: 'Practice 2'
          }
        ]
      }
    };

    it('should fetch all target dates successfully', async () => {
      mockGet.mockResolvedValue(mockResponse);

      const result = await targetDatesApi.getAllTargetDates();

      expect(mockGet).toHaveBeenCalledWith('/target-dates');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle target dates API errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = new Error('API error');

      mockGet.mockRejectedValue(mockError);

      await expect(targetDatesApi.getAllTargetDates()).rejects.toThrow('API error');
      expect(mockGet).toHaveBeenCalledWith('/target-dates');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('createTargetDate', () => {
    const newDate = {
      date: '2025-09-25',
      label: 'New Practice'
    };

    const mockResponse = {
      data: {
        id: '3',
        date: '2025-09-25',
        label: 'New Practice',
        isbooked: false,
        updatedAt: '2025-08-20T10:00:00Z'
      }
    };

    it('should create a target date successfully', async () => {
      mockPost.mockResolvedValue(mockResponse);

      const result = await targetDatesApi.createTargetDate(newDate);

      expect(mockPost).toHaveBeenCalledWith('/target-dates', newDate);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('deleteTargetDate', () => {
    const targetId = '1';
    const mockResponse = {
      data: {
        success: true,
        message: 'Target date deleted successfully'
      }
    };

    it('should delete a target date successfully', async () => {
      mockDelete.mockResolvedValue(mockResponse);

      const result = await targetDatesApi.deleteTargetDate(targetId);

      expect(mockDelete).toHaveBeenCalledWith(`/target-dates/${targetId}`);
      expect(result).toEqual(mockResponse.data);
    });
  });
});