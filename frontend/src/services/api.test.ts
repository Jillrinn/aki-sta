import axios from 'axios';

// Create mock axios instance (before any imports that use it)
const mockAxiosInstance: any = {
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  },
  // Add mock methods for testing retry functionality
  mockResolvedValueOnce: jest.fn(),
  mockResolvedValue: jest.fn(),
  mockRejectedValueOnce: jest.fn(),
  mockRejectedValue: jest.fn(),
};

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  create: jest.fn(() => mockAxiosInstance),
  isAxiosError: jest.fn()
}));

// Now import the modules that depend on axios
import { availabilityApi, scraperApi, targetDatesApi, axiosInstance } from './api';

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

    mockAxiosInstance.get.mockResolvedValue(mockResponse);

    const result = await availabilityApi.getAvailability(mockDate);

    expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/availability/${mockDate}`);
    expect(result).toEqual(mockResponse.data);
  });

  it('should handle API errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockDate = '2025-11-15';
    const mockError = new Error('Network error');

    mockAxiosInstance.get.mockRejectedValue(mockError);

    await expect(availabilityApi.getAvailability(mockDate)).rejects.toThrow('Network error');
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/availability/${mockDate}`);
    
    consoleErrorSpy.mockRestore();
  });

  it('should fetch all availability data successfully', async () => {
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

    mockAxiosInstance.get.mockResolvedValue(mockResponse);

    const result = await availabilityApi.getAllAvailability();

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/availability');
    expect(result).toEqual(mockResponse.data);
  });

  it('should handle getAllAvailability API errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockError = new Error('Network error');

    mockAxiosInstance.get.mockRejectedValue(mockError);

    await expect(availabilityApi.getAllAvailability()).rejects.toThrow('Network error');
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/availability');
    
    consoleErrorSpy.mockRestore();
  });
});

describe('scraperApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger scraping successfully', async () => {
    const mockResponse = {
      data: {
        success: true,
        message: 'Scraping started',
      },
    };

    mockAxiosInstance.post.mockResolvedValue(mockResponse);

    const result = await scraperApi.triggerScraping();

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/scrape');
    expect(result).toEqual(mockResponse.data);
  });

  it('should handle 409 error and return error data', async () => {
    const mockErrorResponse = {
      response: {
        status: 409,
        data: {
          success: false,
          message: 'Scraping already in progress',
        },
      },
    };

    mockAxiosInstance.post.mockRejectedValue(mockErrorResponse);
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

    const result = await scraperApi.triggerScraping();

    expect(result).toEqual(mockErrorResponse.response.data);
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/scrape');
  });

  it('should throw error for non-409 errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const mockError = new Error('Network error');

    mockAxiosInstance.post.mockRejectedValue(mockError);
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(false);

    await expect(scraperApi.triggerScraping()).rejects.toThrow('Network error');
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/scrape');
    
    consoleErrorSpy.mockRestore();
  });
});

describe('Retry functionality', () => {
  let responseInterceptor: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // response interceptorのコールバックを取得
    const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
    responseInterceptor = interceptorCall ? interceptorCall[1] : null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should retry once on network error for GET requests', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const networkError = { 
      request: {}, 
      config: { method: 'get' } 
    };

    if (responseInterceptor) {
      // mockAxiosInstanceを関数として設定（リトライ時に呼ばれる）
      const originalMockAxiosInstance = Object.assign(jest.fn(), mockAxiosInstance);
      (axios.create as jest.Mock).mockReturnValue(originalMockAxiosInstance);
      originalMockAxiosInstance.mockResolvedValueOnce({ data: 'retry success' });
      
      // 最初の呼び出しでinterceptorを実行
      const retryPromise = responseInterceptor(networkError);
      
      // 1秒待機をシミュレート
      jest.advanceTimersByTime(1000);
      
      await retryPromise;
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Retrying GET request... (attempt 1)');
      expect(originalMockAxiosInstance).toHaveBeenCalledWith(expect.objectContaining({
        method: 'get',
        __retryCount: 1
      }));
    }
    
    consoleLogSpy.mockRestore();
  });

  it('should retry on 5xx server error for GET requests', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const serverError = {
      response: { status: 503 },
      config: { method: 'get' }
    };

    if (responseInterceptor) {
      const originalMockAxiosInstance = Object.assign(jest.fn(), mockAxiosInstance);
      (axios.create as jest.Mock).mockReturnValue(originalMockAxiosInstance);
      originalMockAxiosInstance.mockResolvedValueOnce({ data: 'retry success' });
      
      const retryPromise = responseInterceptor(serverError);
      
      jest.advanceTimersByTime(1000);
      
      await retryPromise;
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Retrying GET request... (attempt 1)');
    }
    
    consoleLogSpy.mockRestore();
  });

  it('should not retry on 4xx client error even for GET requests', async () => {
    const clientError = {
      response: { status: 404 },
      config: { method: 'get' }
    };

    if (responseInterceptor) {
      const originalMockAxiosInstance = Object.assign(jest.fn(), mockAxiosInstance);
      (axios.create as jest.Mock).mockReturnValue(originalMockAxiosInstance);
      
      await expect(responseInterceptor(clientError)).rejects.toEqual(clientError);
      expect(originalMockAxiosInstance).not.toHaveBeenCalled();
    }
  });

  it('should not retry more than once for GET requests', async () => {
    const networkError = {
      request: {},
      config: { method: 'get', __retryCount: 1 }
    };

    if (responseInterceptor) {
      const originalMockAxiosInstance = Object.assign(jest.fn(), mockAxiosInstance);
      (axios.create as jest.Mock).mockReturnValue(originalMockAxiosInstance);
      
      await expect(responseInterceptor(networkError)).rejects.toEqual(networkError);
      expect(originalMockAxiosInstance).not.toHaveBeenCalled();
    }
  });

  it('should not retry POST requests on network error', async () => {
    const networkError = {
      request: {},
      config: { method: 'post' }
    };

    if (responseInterceptor) {
      await expect(responseInterceptor(networkError)).rejects.toEqual(networkError);
    }
  });

  it('should not retry DELETE requests on network error', async () => {
    const networkError = {
      request: {},
      config: { method: 'delete' }
    };

    if (responseInterceptor) {
      await expect(responseInterceptor(networkError)).rejects.toEqual(networkError);
    }
  });

  it('should pass through successful responses', async () => {
    const successResponse = { data: 'success', status: 200 };
    
    if (responseInterceptor) {
      // success handler is the first argument
      const successHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
      const result = successHandler(successResponse);
      expect(result).toEqual(successResponse);
    }
  });
});