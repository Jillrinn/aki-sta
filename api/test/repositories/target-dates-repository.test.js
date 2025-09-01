const targetDatesRepository = require('../../src/repositories/target-dates-repository');
const cosmosClient = require('../../src/repositories/cosmos-client');

// Cosmos Clientをモック化
jest.mock('../../src/repositories/cosmos-client');

describe('target-dates-repository', () => {
  let mockContainer;
  let mockItems;

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    
    // モックコンテナとitemsの設定
    mockItems = {
      readAll: jest.fn(),
      create: jest.fn()
    };
    
    mockContainer = {
      items: mockItems,
      item: jest.fn()
    };
    
    // cosmosClient.initializeのモック
    cosmosClient.initialize = jest.fn().mockResolvedValue();
    cosmosClient.getContainer = jest.fn().mockReturnValue(mockContainer);
  });

  describe('getAllTargetDates', () => {
    it('should return all target dates sorted by date', async () => {
      const mockData = [
        { id: '2025-11-20', date: '2025-11-20', label: 'イベント2', updatedAt: '2025-08-19T10:00:00Z' },
        { id: '2025-11-15', date: '2025-11-15', label: '本番ライブ', updatedAt: '2025-08-19T10:00:00Z' },
        { id: '2025-11-18', date: '2025-11-18', label: 'イベント1', updatedAt: '2025-08-19T10:00:00Z' }
      ];

      mockItems.readAll.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockData })
      });

      const result = await targetDatesRepository.getAllTargetDates();

      expect(cosmosClient.initialize).toHaveBeenCalled();
      expect(cosmosClient.getContainer).toHaveBeenCalledWith('target_dates');
      expect(result).toHaveLength(3);
      // ソートされていることを確認
      expect(result[0].date).toBe('2025-11-15');
      expect(result[1].date).toBe('2025-11-18');
      expect(result[2].date).toBe('2025-11-20');
    });

    it('should return empty array when no data exists', async () => {
      mockItems.readAll.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] })
      });

      const result = await targetDatesRepository.getAllTargetDates();

      expect(result).toEqual([]);
    });

    it('should throw error on Cosmos DB failure', async () => {
      const error = new Error('Cosmos DB connection failed');
      mockItems.readAll.mockReturnValue({
        fetchAll: jest.fn().mockRejectedValue(error)
      });

      await expect(targetDatesRepository.getAllTargetDates())
        .rejects
        .toThrow('Failed to get target dates from Cosmos DB: Cosmos DB connection failed');
    });
  });

  describe('deleteTargetDate', () => {
    it('should delete target date successfully', async () => {
      const mockItem = {
        delete: jest.fn().mockResolvedValue({ resource: {} })
      };
      mockContainer.item.mockReturnValue(mockItem);

      const result = await targetDatesRepository.deleteTargetDate('2025-11-15');

      expect(cosmosClient.initialize).toHaveBeenCalled();
      expect(cosmosClient.getContainer).toHaveBeenCalledWith('target_dates');
      expect(mockContainer.item).toHaveBeenCalledWith('2025-11-15', '2025-11-15');
      expect(mockItem.delete).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Target date 2025-11-15 deleted successfully'
      });
    });

    it('should throw error when target date not found', async () => {
      const error = new Error('Not found');
      error.code = 404;
      const mockItem = {
        delete: jest.fn().mockRejectedValue(error)
      };
      mockContainer.item.mockReturnValue(mockItem);

      await expect(targetDatesRepository.deleteTargetDate('2025-11-15'))
        .rejects
        .toThrow('Target date 2025-11-15 not found');
    });

    it('should throw error on Cosmos DB failure', async () => {
      const error = new Error('Cosmos DB error');
      const mockItem = {
        delete: jest.fn().mockRejectedValue(error)
      };
      mockContainer.item.mockReturnValue(mockItem);

      await expect(targetDatesRepository.deleteTargetDate('2025-11-15'))
        .rejects
        .toThrow('Failed to delete target date from Cosmos DB: Cosmos DB error');
    });
  });

  describe('insertTargetDate', () => {
    it('should insert target date successfully', async () => {
      const mockDate = '2025-11-15';
      const mockLabel = '本番ライブ';
      const mockResource = {
        id: mockDate,
        date: mockDate,
        label: mockLabel,
        updatedAt: '2025-08-19T10:00:00Z'
      };

      mockItems.create.mockResolvedValue({ resource: mockResource });

      const result = await targetDatesRepository.insertTargetDate(mockDate, mockLabel);

      expect(cosmosClient.initialize).toHaveBeenCalled();
      expect(cosmosClient.getContainer).toHaveBeenCalledWith('target_dates');
      expect(mockItems.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockDate,
          date: mockDate,
          label: mockLabel,
          updatedAt: expect.any(String)
        })
      );
      expect(result).toEqual(mockResource);
    });

    it('should throw error when date is missing', async () => {
      await expect(targetDatesRepository.insertTargetDate(null, 'ラベル'))
        .rejects
        .toThrow('Date and label are required');
    });

    it('should throw error when label is missing', async () => {
      await expect(targetDatesRepository.insertTargetDate('2025-11-15', null))
        .rejects
        .toThrow('Date and label are required');
    });

    it('should throw error for invalid date format', async () => {
      await expect(targetDatesRepository.insertTargetDate('2025/11/15', 'ラベル'))
        .rejects
        .toThrow('Date must be in YYYY-MM-DD format');
      
      await expect(targetDatesRepository.insertTargetDate('20251115', 'ラベル'))
        .rejects
        .toThrow('Date must be in YYYY-MM-DD format');
      
      await expect(targetDatesRepository.insertTargetDate('invalid-date', 'ラベル'))
        .rejects
        .toThrow('Date must be in YYYY-MM-DD format');
    });

    it('should throw error when target date already exists', async () => {
      const error = new Error('Conflict');
      error.code = 409;
      mockItems.create.mockRejectedValue(error);

      await expect(targetDatesRepository.insertTargetDate('2025-11-15', '本番ライブ'))
        .rejects
        .toThrow('Target date 2025-11-15 already exists');
    });

    it('should throw error on Cosmos DB failure', async () => {
      const error = new Error('Cosmos DB error');
      mockItems.create.mockRejectedValue(error);

      await expect(targetDatesRepository.insertTargetDate('2025-11-15', '本番ライブ'))
        .rejects
        .toThrow('Failed to insert target date to Cosmos DB: Cosmos DB error');
    });
  });
});