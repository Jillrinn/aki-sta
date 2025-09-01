const { scrapeHandler } = require('../../src/functions/scrape');
const scrapeService = require('../../src/services/scrape-service');

jest.mock('../../src/services/scrape-service');

describe('Scrape Function', () => {
  let mockRequest;
  let mockContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      json: jest.fn()
    };
    
    mockContext = {
      log: {
        error: jest.fn()
      }
    };

    process.env.SCRAPER_API_URL = 'https://scraper.example.com';
  });

  afterEach(() => {
    delete process.env.SCRAPER_API_URL;
  });

  describe('scrapeHandler', () => {
    it('should return 202 when scraping is initiated successfully', async () => {
      scrapeService.executeSingleScraping.mockResolvedValue({
        success: true,
        message: '空き状況取得を開始しました'
      });

      const result = await scrapeHandler(mockRequest, mockContext);

      expect(result.status).toBe(202);
      expect(result.jsonBody.success).toBe(true);
      expect(result.jsonBody.message).toBe('空き状況取得を開始しました');
      expect(scrapeService.executeSingleScraping).toHaveBeenCalled();
    });

    it('should return 500 when scraping fails', async () => {
      scrapeService.executeSingleScraping.mockResolvedValue({
        success: false,
        message: '空き状況取得は実行中の可能性があります'
      });

      const result = await scrapeHandler(mockRequest, mockContext);

      expect(result.status).toBe(500);
      expect(result.jsonBody.success).toBe(false);
      expect(result.jsonBody.message).toBe('空き状況取得は実行中の可能性があります');
    });

    it('should handle service errors', async () => {
      scrapeService.executeSingleScraping.mockRejectedValue(
        new Error('Service unavailable')
      );

      const result = await scrapeHandler(mockRequest, mockContext);

      expect(result.status).toBe(500);
      expect(result.jsonBody.success).toBe(false);
      expect(result.jsonBody.message).toBe('空き状況取得は実行中の可能性があります');
      expect(mockContext.log.error).toHaveBeenCalledWith(
        'Failed to initiate scraping: Service unavailable'
      );
    });
  });
});