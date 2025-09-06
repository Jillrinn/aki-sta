const rateLimitsRepository = require('../../src/repositories/rate-limits-repository');
const cosmosClient = require('../../src/repositories/cosmos-client');

jest.mock('../../src/repositories/cosmos-client');

describe('RateLimitsRepository', () => {
  let mockContainer;
  let mockItems;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockItems = {
      query: jest.fn(),
      create: jest.fn()
    };
    
    mockContainer = {
      items: mockItems,
      item: jest.fn()
    };

    cosmosClient.initialize = jest.fn().mockResolvedValue();
    cosmosClient.getContainer = jest.fn().mockReturnValue(mockContainer);
  });

  describe('getTodayRecord', () => {
    it('should return today\'s record if it exists', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockRecord = {
        id: `rate-limit-${today}`,
        date: today,
        count: 1,
        status: 'completed'
      };

      mockItems.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [mockRecord]
        })
      });

      await rateLimitsRepository.initialize();
      const result = await rateLimitsRepository.getTodayRecord();

      expect(result).toEqual(mockRecord);
      expect(mockItems.query).toHaveBeenCalledWith({
        query: 'SELECT * FROM c WHERE c.date = @date',
        parameters: [{ name: '@date', value: today }]
      });
    });

    it('should return null if no record exists for today', async () => {
      mockItems.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: []
        })
      });

      await rateLimitsRepository.initialize();
      const result = await rateLimitsRepository.getTodayRecord();

      expect(result).toBeNull();
    });
  });

  describe('createOrUpdateRecord', () => {
    const today = new Date().toISOString().split('T')[0];

    it('should create a new record if none exists', async () => {
      const newRecord = {
        id: `rate-limit-${today}`,
        date: today,
        count: 1,
        status: 'pending'
      };

      mockItems.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: []
        })
      });

      mockItems.create.mockResolvedValue({
        resource: newRecord
      });

      await rateLimitsRepository.initialize();
      const result = await rateLimitsRepository.createOrUpdateRecord('pending');

      expect(result.isAlreadyRunning).toBe(false);
      expect(result.record).toEqual(newRecord);
      expect(mockItems.create).toHaveBeenCalled();
    });

    it('should return isAlreadyRunning=true if status is pending', async () => {
      const existingRecord = {
        id: `rate-limit-${today}`,
        date: today,
        count: 1,
        status: 'pending',
        lastRequestedAt: '2025-08-31T10:00:00Z'
      };

      mockItems.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [existingRecord]
        })
      });

      await rateLimitsRepository.initialize();
      const result = await rateLimitsRepository.createOrUpdateRecord('pending');

      expect(result.isAlreadyRunning).toBe(true);
      expect(result.record).toEqual(existingRecord);
    });

    it('should return isAlreadyRunning=true if status is running', async () => {
      const existingRecord = {
        id: `rate-limit-${today}`,
        date: today,
        count: 1,
        status: 'running',
        lastRequestedAt: '2025-08-31T10:00:00Z'
      };

      mockItems.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [existingRecord]
        })
      });

      await rateLimitsRepository.initialize();
      const result = await rateLimitsRepository.createOrUpdateRecord('pending');

      expect(result.isAlreadyRunning).toBe(true);
      expect(result.record).toEqual(existingRecord);
    });

    it('should update count if status is completed', async () => {
      const existingRecord = {
        id: `rate-limit-${today}`,
        date: today,
        count: 1,
        status: 'completed'
      };

      const updatedRecord = {
        ...existingRecord,
        count: 2,
        status: 'pending',
        lastRequestedAt: expect.any(String)
      };

      mockItems.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [existingRecord]
        })
      });

      const mockReplace = jest.fn().mockResolvedValue({
        resource: updatedRecord
      });

      mockContainer.item.mockReturnValue({
        replace: mockReplace
      });

      await rateLimitsRepository.initialize();
      const result = await rateLimitsRepository.createOrUpdateRecord('pending');

      expect(result.isAlreadyRunning).toBe(false);
      expect(result.record.count).toBe(2);
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update the status of an existing record', async () => {
      const recordId = 'rate-limit-2025-08-31';
      const date = '2025-08-31';
      const existingRecord = {
        id: recordId,
        date: date,
        status: 'pending'
      };

      const updatedRecord = {
        ...existingRecord,
        status: 'completed',
        updatedAt: expect.any(String)
      };

      const mockRead = jest.fn().mockResolvedValue({
        resource: existingRecord
      });

      const mockReplace = jest.fn().mockResolvedValue({
        resource: updatedRecord
      });

      mockContainer.item.mockReturnValue({
        read: mockRead,
        replace: mockReplace
      });

      await rateLimitsRepository.initialize();
      const result = await rateLimitsRepository.updateStatus(recordId, date, 'completed');

      expect(result.status).toBe('completed');
      expect(mockRead).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalled();
    });

    it('should throw error if record not found', async () => {
      const recordId = 'rate-limit-2025-08-31';
      const date = '2025-08-31';

      const mockRead = jest.fn().mockResolvedValue({
        resource: null
      });

      mockContainer.item.mockReturnValue({
        read: mockRead
      });

      await rateLimitsRepository.initialize();
      
      await expect(
        rateLimitsRepository.updateStatus(recordId, date, 'completed')
      ).rejects.toThrow(`Record not found: ${recordId}`);
    });
  });

  describe('isActuallyRunning', () => {
    it('should return true if status is running and updatedAt is within 30 minutes', async () => {
      await rateLimitsRepository.initialize();
      
      const record = {
        status: 'running',
        updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10分前
      };
      
      const result = rateLimitsRepository.isActuallyRunning(record);
      expect(result).toBe(true);
    });

    it('should return false if status is running and updatedAt is over 30 minutes ago', async () => {
      await rateLimitsRepository.initialize();
      
      const record = {
        status: 'running',
        updatedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString() // 35分前
      };
      
      const result = rateLimitsRepository.isActuallyRunning(record);
      expect(result).toBe(false);
    });

    it('should return false if status is not running', async () => {
      await rateLimitsRepository.initialize();
      
      const record = {
        status: 'completed',
        updatedAt: new Date().toISOString()
      };
      
      const result = rateLimitsRepository.isActuallyRunning(record);
      expect(result).toBe(false);
    });

    it('should return true if status is running but updatedAt is missing', async () => {
      await rateLimitsRepository.initialize();
      
      const record = {
        status: 'running'
      };
      
      const result = rateLimitsRepository.isActuallyRunning(record);
      expect(result).toBe(true);
    });

    it('should return true if updatedAt cannot be parsed', async () => {
      await rateLimitsRepository.initialize();
      
      const record = {
        status: 'running',
        updatedAt: 'invalid-date'
      };
      
      const result = rateLimitsRepository.isActuallyRunning(record);
      expect(result).toBe(true);
    });
  });
});