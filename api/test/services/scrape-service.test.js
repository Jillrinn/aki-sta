const scrapeService = require('../../src/services/scrape-service');
const targetDatesRepository = require('../../src/repositories/target-dates-repository');
const https = require('https');
const http = require('http');

jest.mock('../../src/repositories/target-dates-repository');
jest.mock('https');
jest.mock('http');

describe('scrape-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SCRAPER_API_URL = 'http://localhost:8000';
  });

  afterEach(() => {
    delete process.env.SCRAPER_API_URL;
  });

  describe('executeBatchScraping', () => {
    it('should filter out dates where isbooked is true', async () => {
      const mockTargetDates = [
        { date: '2025-09-15', label: 'Practice 1', isbooked: false },
        { date: '2025-09-20', label: 'Practice 2', isbooked: true },
        { date: '2025-09-25', label: 'Practice 3', isbooked: false }
      ];

      targetDatesRepository.getAllTargetDates.mockResolvedValue(mockTargetDates);

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn()
      };

      const mockResponse = {
        statusCode: 202,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(JSON.stringify({
              success: true,
              message: '空き状況取得を開始しました'
            }));
          } else if (event === 'end') {
            callback();
          }
        })
      };

      http.request.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await scrapeService.executeBatchScraping('test');

      expect(result.success).toBe(true);
      expect(result.targetDates).toEqual(['2025-09-15', '2025-09-25']);
      
      // Verify that the request was made with filtered dates
      expect(mockRequest.write).toHaveBeenCalledWith(
        JSON.stringify({ dates: ['2025-09-15', '2025-09-25'] })
      );
    });

    it('should return error when all dates are booked', async () => {
      const mockTargetDates = [
        { date: '2025-09-15', label: 'Practice 1', isbooked: true },
        { date: '2025-09-20', label: 'Practice 2', isbooked: true }
      ];

      targetDatesRepository.getAllTargetDates.mockResolvedValue(mockTargetDates);

      const result = await scrapeService.executeBatchScraping('test');

      expect(result.success).toBe(false);
      expect(result.message).toBe('スクレイピング対象の日程がありません（全て予約済みです）');
      
      // Verify that no API request was made
      expect(http.request).not.toHaveBeenCalled();
      expect(https.request).not.toHaveBeenCalled();
    });

    it('should handle empty target dates', async () => {
      targetDatesRepository.getAllTargetDates.mockResolvedValue([]);

      const result = await scrapeService.executeBatchScraping('test');

      expect(result.success).toBe(false);
      expect(result.message).toBe('練習日程が登録されていません');
    });

    it('should include only unbooked dates in scraping', async () => {
      const mockTargetDates = [
        { date: '2025-09-15', label: 'Practice 1', isbooked: false },
        { date: '2025-09-20', label: 'Practice 2', isbooked: false }
      ];

      targetDatesRepository.getAllTargetDates.mockResolvedValue(mockTargetDates);

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn()
      };

      const mockResponse = {
        statusCode: 202,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(JSON.stringify({
              success: true,
              message: '空き状況取得を開始しました'
            }));
          } else if (event === 'end') {
            callback();
          }
        })
      };

      http.request.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await scrapeService.executeBatchScraping('test');

      expect(result.success).toBe(true);
      expect(result.targetDates).toEqual(['2025-09-15', '2025-09-20']);
      
      // Verify that the request was made with all unbooked dates
      expect(mockRequest.write).toHaveBeenCalledWith(
        JSON.stringify({ dates: ['2025-09-15', '2025-09-20'] })
      );
    });
  });

  describe('executeSingleScraping', () => {
    it('should filter out dates where isbooked is true', async () => {
      const mockTargetDates = [
        { date: '2025-09-15', label: 'Practice 1', isbooked: false },
        { date: '2025-09-20', label: 'Practice 2', isbooked: true },
        { date: '2025-09-25', label: 'Practice 3', isbooked: false }
      ];

      targetDatesRepository.getAllTargetDates.mockResolvedValue(mockTargetDates);

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        destroy: jest.fn()
      };

      const mockResponse = {
        statusCode: 202,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(JSON.stringify({
              success: true,
              message: '空き状況取得を開始しました'
            }));
          } else if (event === 'end') {
            callback();
          }
        })
      };

      http.request.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await scrapeService.executeSingleScraping();

      expect(result.success).toBe(true);
      expect(result.targetDates).toEqual(['2025-09-15', '2025-09-25']);
      
      // Verify that the request was made with filtered dates
      expect(mockRequest.write).toHaveBeenCalledWith(
        JSON.stringify({ dates: ['2025-09-15', '2025-09-25'] })
      );
    });

    it('should return error when all dates are booked', async () => {
      const mockTargetDates = [
        { date: '2025-09-15', label: 'Practice 1', isbooked: true },
        { date: '2025-09-20', label: 'Practice 2', isbooked: true }
      ];

      targetDatesRepository.getAllTargetDates.mockResolvedValue(mockTargetDates);

      const result = await scrapeService.executeSingleScraping();

      expect(result.success).toBe(false);
      expect(result.message).toBe('スクレイピング対象の日程がありません（全て予約済みです）');
      
      // Verify that no API request was made
      expect(http.request).not.toHaveBeenCalled();
      expect(https.request).not.toHaveBeenCalled();
    });
  });
});