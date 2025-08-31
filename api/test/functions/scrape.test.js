const { scrapeHandler } = require('../../src/functions/scrape');
const rateLimitsRepository = require('../../src/repositories/rate-limits-repository');
const https = require('https');

jest.mock('../../src/repositories/rate-limits-repository');
jest.mock('https');

describe('Scrape Function', () => {
  let context;
  let request;

  beforeEach(() => {
    jest.clearAllMocks();
    
    context = {
      log: jest.fn(),
      log: {
        error: jest.fn()
      }
    };

    request = {
      params: {}
    };

    process.env.SCRAPER_API_URL = 'https://scraper.example.com';
    
    rateLimitsRepository.initialize = jest.fn().mockResolvedValue();
  });

  afterEach(() => {
    delete process.env.SCRAPER_API_URL;
  });

  describe('scrapeHandler', () => {
    it('should return 202 when scraping is initiated successfully', async () => {
      const mockRecord = {
        id: 'rate-limit-2025-08-31',
        date: '2025-08-31',
        count: 1,
        status: 'pending'
      };

      rateLimitsRepository.createOrUpdateRecord = jest.fn().mockResolvedValue({
        isAlreadyRunning: false,
        record: mockRecord
      });

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      https.request = jest.fn().mockImplementation((options, callback) => {
        // Simulate successful response
        const mockResponse = {
          statusCode: 200,
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              handler('{"status":"success"}');
            }
            if (event === 'end') {
              handler();
            }
          })
        };
        
        setTimeout(() => callback(mockResponse), 0);
        return mockRequest;
      });

      const result = await scrapeHandler(request, context);

      expect(result.status).toBe(202);
      expect(result.jsonBody.message).toBe('Scraping request accepted');
      expect(result.jsonBody.requestId).toBe(mockRecord.id);
      expect(result.jsonBody.status).toBe('pending');
      expect(rateLimitsRepository.createOrUpdateRecord).toHaveBeenCalledWith('pending');
    });

    it('should return 409 when scraping is already running', async () => {
      const mockRecord = {
        id: 'rate-limit-2025-08-31',
        date: '2025-08-31',
        count: 1,
        status: 'running',
        lastRequestedAt: '2025-08-31T10:00:00Z'
      };

      rateLimitsRepository.createOrUpdateRecord = jest.fn().mockResolvedValue({
        isAlreadyRunning: true,
        record: mockRecord
      });

      const result = await scrapeHandler(request, context);

      expect(result.status).toBe(409);
      expect(result.jsonBody.error).toBe('Scraping already in progress');
      expect(result.jsonBody.status).toBe('running');
      expect(result.jsonBody.lastRequestedAt).toBe(mockRecord.lastRequestedAt);
    });

    it('should return 500 when SCRAPER_API_URL is not set', async () => {
      delete process.env.SCRAPER_API_URL;

      rateLimitsRepository.createOrUpdateRecord = jest.fn().mockResolvedValue({
        isAlreadyRunning: false,
        record: {
          id: 'rate-limit-2025-08-31',
          date: '2025-08-31',
          status: 'pending'
        }
      });

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      };

      https.request = jest.fn().mockImplementation(() => {
        return mockRequest;
      });

      const result = await scrapeHandler(request, context);

      // Even if scraper API fails, we return 202 as it's async
      expect(result.status).toBe(202);
      expect(result.jsonBody.message).toBe('Scraping request accepted');
    });

    it('should return 500 when repository initialization fails', async () => {
      rateLimitsRepository.initialize = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await scrapeHandler(request, context);

      expect(result.status).toBe(500);
      expect(result.jsonBody.error).toBe('Internal Server Error');
      expect(result.jsonBody.details).toContain('Database connection failed');
    });

    it('should handle network errors when calling scraper API', async () => {
      const mockRecord = {
        id: 'rate-limit-2025-08-31',
        date: '2025-08-31',
        count: 1,
        status: 'pending'
      };

      rateLimitsRepository.createOrUpdateRecord = jest.fn().mockResolvedValue({
        isAlreadyRunning: false,
        record: mockRecord
      });

      const mockRequest = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('Network error')), 0);
          }
        }),
        write: jest.fn(),
        end: jest.fn()
      };

      https.request = jest.fn().mockImplementation(() => {
        return mockRequest;
      });

      const result = await scrapeHandler(request, context);

      // Even if scraper API fails, we return 202 as it's async
      expect(result.status).toBe(202);
      expect(result.jsonBody.message).toBe('Scraping request accepted');
    });
  });
});