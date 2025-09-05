// Mock scrape service before requiring the handler
jest.mock('../src/services/scrape-service');

const { scrapeByDateHandler } = require('../src/functions/scrape-date');
const scrapeService = require('../src/services/scrape-service');

describe('scrape-date endpoint', () => {
  let mockContext;
  let mockRequest;

  beforeEach(() => {
    mockContext = {
      log: {
        error: jest.fn()
      }
    };

    mockRequest = {
      json: jest.fn()
    };

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully trigger scraping for a specific date', async () => {
    const testDate = '2025-09-20';
    mockRequest.json.mockResolvedValue({ date: testDate });
    
    scrapeService.triggerScraperApi.mockResolvedValue({
      statusCode: 202,
      data: JSON.stringify({
        success: true,
        message: '空き状況取得を開始しました'
      })
    });

    const result = await scrapeByDateHandler(mockRequest, mockContext);

    expect(mockRequest.json).toHaveBeenCalledTimes(1);
    expect(scrapeService.triggerScraperApi).toHaveBeenCalledWith([testDate]);
    expect(result).toEqual({
      status: 202,
      jsonBody: {
        success: true,
        message: `${testDate}の空き状況取得を開始しました`,
        date: testDate
      }
    });
  });

  it('should return error when date is missing', async () => {
    mockRequest.json.mockResolvedValue({});

    const result = await scrapeByDateHandler(mockRequest, mockContext);

    expect(result).toEqual({
      status: 400,
      jsonBody: {
        success: false,
        message: '日付が指定されていません'
      }
    });
    expect(scrapeService.triggerScraperApi).not.toHaveBeenCalled();
  });

  it('should validate date format', async () => {
    const invalidDate = 'invalid-date';
    mockRequest.json.mockResolvedValue({ date: invalidDate });

    const result = await scrapeByDateHandler(mockRequest, mockContext);

    expect(result).toEqual({
      status: 400,
      jsonBody: {
        success: false,
        message: '日付の形式が正しくありません（YYYY-MM-DD形式で指定してください）'
      }
    });
    expect(scrapeService.triggerScraperApi).not.toHaveBeenCalled();
  });

  it('should handle scraper API 409 (rate limit) response', async () => {
    const testDate = '2025-09-20';
    mockRequest.json.mockResolvedValue({ date: testDate });
    
    scrapeService.triggerScraperApi.mockResolvedValue({
      statusCode: 409,
      data: JSON.stringify({
        success: false,
        message: '現在スクレイピング処理が実行中です'
      })
    });

    const result = await scrapeByDateHandler(mockRequest, mockContext);

    expect(result).toEqual({
      status: 409,
      jsonBody: {
        success: false,
        message: '現在スクレイピング処理が実行中です'
      }
    });
  });

  it('should handle scraper API errors', async () => {
    const testDate = '2025-09-20';
    mockRequest.json.mockResolvedValue({ date: testDate });
    
    scrapeService.triggerScraperApi.mockRejectedValue(
      new Error('Connection failed')
    );

    const result = await scrapeByDateHandler(mockRequest, mockContext);

    expect(mockContext.log.error).toHaveBeenCalled();
    expect(result).toEqual({
      status: 500,
      jsonBody: {
        success: false,
        message: 'スクレイピング処理でエラーが発生しました'
      }
    });
  });

  it('should handle timeout errors', async () => {
    const testDate = '2025-09-20';
    mockRequest.json.mockResolvedValue({ date: testDate });
    
    const timeoutError = new Error('Request timeout: Scraper API did not respond within 10 seconds');
    scrapeService.triggerScraperApi.mockRejectedValue(timeoutError);

    const result = await scrapeByDateHandler(mockRequest, mockContext);

    expect(result).toEqual({
      status: 500,
      jsonBody: {
        success: false,
        message: 'スクレイパーへの接続がタイムアウトしました。しばらく待ってから再試行してください'
      }
    });
  });

  it('should handle connection refused errors', async () => {
    const testDate = '2025-09-20';
    mockRequest.json.mockResolvedValue({ date: testDate });
    
    const connError = new Error('Connection refused');
    connError.code = 'ECONNREFUSED';
    scrapeService.triggerScraperApi.mockRejectedValue(connError);

    const result = await scrapeByDateHandler(mockRequest, mockContext);

    expect(result).toEqual({
      status: 500,
      jsonBody: {
        success: false,
        message: 'スクレイパーサービスに接続できません。システム管理者にお問い合わせください'
      }
    });
  });
});