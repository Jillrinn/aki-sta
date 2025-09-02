import { availabilityApi, scraperApi } from './api';
import axios from 'axios';

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
  isAxiosError: jest.fn()
}));

describe('availabilityApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch availability data successfully', async () => {
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

    (axios.get as jest.Mock).mockResolvedValue(mockResponse);

    const result = await availabilityApi.getAvailability(mockDate);

    expect(axios.get).toHaveBeenCalledWith(`/api/availability/${mockDate}`);
    expect(result).toEqual(mockResponse.data);
  });

  it('should handle API errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockDate = '2025-11-15';
    const mockError = new Error('Network error');

    (axios.get as jest.Mock).mockRejectedValue(mockError);

    await expect(availabilityApi.getAvailability(mockDate)).rejects.toThrow('Network error');
    expect(axios.get).toHaveBeenCalledWith(`/api/availability/${mockDate}`);
    
    consoleErrorSpy.mockRestore();
  });

  it('should use custom API URL from environment variable', async () => {
    const originalEnv = process.env.REACT_APP_API_URL;
    process.env.REACT_APP_API_URL = 'http://custom-api.com';
    
    // モジュールをリセットする前にaxiosモックを保存
    const mockGet = jest.fn();
    
    jest.resetModules();
    jest.doMock('axios', () => ({
      get: mockGet,
      default: {
        get: mockGet,
      },
    }));
    
    const { availabilityApi: customApi } = require('./api');
    
    const mockDate = '2025-11-15';
    const mockResponse = {
      data: {
        date: mockDate,
        facilities: [],
        dataSource: 'dummy' as const,
      },
    };

    mockGet.mockResolvedValue(mockResponse);
    
    await customApi.getAvailability(mockDate);
    
    expect(mockGet).toHaveBeenCalledWith(
      `http://custom-api.com/availability/${mockDate}`
    );
    
    process.env.REACT_APP_API_URL = originalEnv;
    jest.dontMock('axios');
  });
});

describe('scraperApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger scraping successfully', async () => {
    const mockResponse = {
      data: {
        message: 'Scraping request accepted',
        description: 'スクレイピング処理を開始しました。バックグラウンドで実行中です。',
        date: '2025-08-31',
        requestId: 'rate-limit-2025-08-31',
        status: 'pending' as const
      }
    };

    (axios.post as jest.Mock).mockResolvedValue(mockResponse);

    const result = await scraperApi.triggerScraping();

    expect(axios.post).toHaveBeenCalledWith('/api/scrape');
    expect(result).toEqual(mockResponse.data);
  });

  it('should handle 409 error when scraping is already running', async () => {
    const mockErrorResponse = {
      response: {
        status: 409,
        data: {
          error: 'Scraping already in progress',
          message: 'スクレイピング処理がすでに実行中です。しばらくお待ちください。',
          status: 'running' as const,
          lastRequestedAt: '2025-08-31T10:00:00Z'
        }
      }
    };

    (axios.post as jest.Mock).mockRejectedValue(mockErrorResponse);
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

    const result = await scraperApi.triggerScraping();

    expect(result).toEqual(mockErrorResponse.response.data);
    expect(axios.post).toHaveBeenCalledWith('/api/scrape');
  });

  it('should handle network errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockError = new Error('Network error');

    (axios.post as jest.Mock).mockRejectedValue(mockError);
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);

    await expect(scraperApi.triggerScraping()).rejects.toThrow('Network error');
    expect(axios.post).toHaveBeenCalledWith('/api/scrape');
    
    consoleErrorSpy.mockRestore();
  });
});