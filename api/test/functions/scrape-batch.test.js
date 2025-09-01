const { scrapeBatchHandler } = require('../../src/functions/scrape-batch');
const scrapeService = require('../../src/services/scrape-service');
const targetDatesRepository = require('../../src/repositories/target-dates-repository');

jest.mock('../../src/services/scrape-service');
jest.mock('../../src/repositories/target-dates-repository');

describe('scrape-batch', () => {
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

  describe('POST /api/scrape/batch', () => {
    it('should successfully initiate batch scraping with default parameters', async () => {
      mockRequest.json.mockResolvedValue({});
      
      scrapeService.executeBatchScraping.mockResolvedValue({
        success: true,
        message: '空き状況取得を開始しました',
        targetDates: ['2025-09-15', '2025-09-20']
      });

      const result = await scrapeBatchHandler(mockRequest, mockContext);

      expect(result.status).toBe(202);
      expect(result.jsonBody.success).toBe(true);
      expect(result.jsonBody.message).toBe('空き状況取得を開始しました');
      expect(result.jsonBody.targetDates).toHaveLength(2);
      expect(scrapeService.executeBatchScraping).toHaveBeenCalledWith('logic-app');
    });

    it('should accept custom source parameter', async () => {
      mockRequest.json.mockResolvedValue({
        source: 'timer-trigger',
        includeAllTargetDates: true
      });
      
      scrapeService.executeBatchScraping.mockResolvedValue({
        success: true,
        message: '空き状況取得を開始しました',
        targetDates: ['2025-09-15']
      });

      const result = await scrapeBatchHandler(mockRequest, mockContext);

      expect(result.status).toBe(202);
      expect(result.jsonBody.success).toBe(true);
      expect(scrapeService.executeBatchScraping).toHaveBeenCalledWith('timer-trigger');
    });

    it('should return 400 when includeAllTargetDates is false', async () => {
      mockRequest.json.mockResolvedValue({
        includeAllTargetDates: false
      });

      const result = await scrapeBatchHandler(mockRequest, mockContext);

      expect(result.status).toBe(400);
      expect(result.jsonBody.success).toBe(false);
      expect(result.jsonBody.message).toContain('includeAllTargetDates to true');
      expect(scrapeService.executeBatchScraping).not.toHaveBeenCalled();
    });

    it('should return 404 when no target dates are found', async () => {
      mockRequest.json.mockResolvedValue({});
      
      scrapeService.executeBatchScraping.mockResolvedValue({
        success: false,
        message: '練習日程が登録されていません'
      });

      const result = await scrapeBatchHandler(mockRequest, mockContext);

      expect(result.status).toBe(404);
      expect(result.jsonBody.success).toBe(false);
      expect(result.jsonBody.message).toBe('練習日程が登録されていません');
    });

    it('should handle service errors gracefully', async () => {
      mockRequest.json.mockResolvedValue({});
      
      scrapeService.executeBatchScraping.mockRejectedValue(
        new Error('Service unavailable')
      );

      const result = await scrapeBatchHandler(mockRequest, mockContext);

      expect(result.status).toBe(500);
      expect(result.jsonBody.success).toBe(false);
      expect(result.jsonBody.message).toBe('空き状況取得は実行中の可能性があります');
      expect(mockContext.log.error).toHaveBeenCalled();
    });

    it('should handle malformed JSON request body', async () => {
      mockRequest.json.mockRejectedValue(new Error('Invalid JSON'));
      
      scrapeService.executeBatchScraping.mockResolvedValue({
        success: true,
        message: '空き状況取得を開始しました',
        targetDates: ['2025-09-15']
      });

      const result = await scrapeBatchHandler(mockRequest, mockContext);

      expect(result.status).toBe(202);
      expect(result.jsonBody.success).toBe(true);
      expect(scrapeService.executeBatchScraping).toHaveBeenCalledWith('logic-app');
    });
  });
});