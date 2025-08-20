import { availabilityApi } from './api';
import axios from 'axios';

jest.mock('axios');

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
            timeSlots: { '13-17': 'available' },
          },
        ],
        lastUpdated: '2025-08-20T10:00:00Z',
        dataSource: 'dummy' as const,
      },
    };

    (axios.get as jest.Mock).mockResolvedValue(mockResponse);

    const result = await availabilityApi.getAvailability(mockDate);

    expect(axios.get).toHaveBeenCalledWith(`/api/availability/${mockDate}`);
    expect(result).toEqual(mockResponse.data);
  });

  it('should handle API errors', async () => {
    const mockDate = '2025-11-15';
    const mockError = new Error('Network error');

    (axios.get as jest.Mock).mockRejectedValue(mockError);

    await expect(availabilityApi.getAvailability(mockDate)).rejects.toThrow('Network error');
    expect(axios.get).toHaveBeenCalledWith(`/api/availability/${mockDate}`);
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
        lastUpdated: '2025-08-20T10:00:00Z',
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