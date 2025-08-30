const { 
  getTargetDatesHandler, 
  createTargetDateHandler, 
  deleteTargetDateHandler 
} = require('../../src/functions/target-dates');

// target-dates-repositoryをモック化
jest.mock('../../src/repositories/target-dates-repository', () => ({
  getAllTargetDates: jest.fn(),
  insertTargetDate: jest.fn(),
  deleteTargetDate: jest.fn()
}));

const targetDatesRepository = require('../../src/repositories/target-dates-repository');

describe('Target Dates API', () => {
  let context;
  let request;

  beforeEach(() => {
    context = {
      log: {
        error: jest.fn()
      }
    };
    request = {
      method: 'GET',
      params: {},
      headers: {},
      json: jest.fn()
    };
    // モックをリセット
    jest.clearAllMocks();
  });

  describe('GET /api/target-dates', () => {
    test('should return all target dates', async () => {
      const mockDates = [
        { id: '2025-11-15', date: '2025-11-15', label: '本番ライブ', updatedAt: '2025-08-19T10:00:00Z' },
        { id: '2025-11-16', date: '2025-11-16', label: 'リハーサル', updatedAt: '2025-08-19T10:00:00Z' }
      ];
      
      targetDatesRepository.getAllTargetDates.mockResolvedValue(mockDates);
      
      const response = await getTargetDatesHandler(request, context);
      
      expect(response.status).toBe(200);
      expect(response.jsonBody.dates).toEqual(mockDates);
      expect(targetDatesRepository.getAllTargetDates).toHaveBeenCalled();
    });

    test('should return empty array when no dates exist', async () => {
      targetDatesRepository.getAllTargetDates.mockResolvedValue([]);
      
      const response = await getTargetDatesHandler(request, context);
      
      expect(response.status).toBe(200);
      expect(response.jsonBody.dates).toEqual([]);
    });

    test('should return 503 when repository throws error', async () => {
      targetDatesRepository.getAllTargetDates.mockRejectedValue(
        new Error('Cosmos DB connection failed')
      );
      
      const response = await getTargetDatesHandler(request, context);
      
      expect(response.status).toBe(503);
      expect(response.jsonBody.error).toBe('Service temporarily unavailable');
      expect(response.jsonBody.details).toBe('Cosmos DB connection failed');
      expect(context.log.error).toHaveBeenCalledWith(
        'Failed to get target dates: Cosmos DB connection failed'
      );
    });
  });

  describe('POST /api/target-dates', () => {
    test('should create new target date successfully', async () => {
      const newDate = {
        date: '2025-12-01',
        label: 'クリスマスライブ'
      };
      
      const mockResult = {
        id: '2025-12-01',
        date: '2025-12-01',
        label: 'クリスマスライブ',
        updatedAt: '2025-08-19T10:00:00Z'
      };
      
      request.json.mockResolvedValue(newDate);
      targetDatesRepository.insertTargetDate.mockResolvedValue(mockResult);
      
      const response = await createTargetDateHandler(request, context);
      
      expect(response.status).toBe(201);
      expect(response.jsonBody).toEqual(mockResult);
      expect(targetDatesRepository.insertTargetDate).toHaveBeenCalledWith(
        '2025-12-01',
        'クリスマスライブ'
      );
    });

    test('should return 400 when date is missing', async () => {
      request.json.mockResolvedValue({ label: 'テスト' });
      
      const response = await createTargetDateHandler(request, context);
      
      expect(response.status).toBe(400);
      expect(response.jsonBody.error).toBe('Bad Request');
      expect(response.jsonBody.message).toBe('Date and label are required');
      expect(targetDatesRepository.insertTargetDate).not.toHaveBeenCalled();
    });

    test('should return 400 when label is missing', async () => {
      request.json.mockResolvedValue({ date: '2025-12-01' });
      
      const response = await createTargetDateHandler(request, context);
      
      expect(response.status).toBe(400);
      expect(response.jsonBody.error).toBe('Bad Request');
      expect(response.jsonBody.message).toBe('Date and label are required');
      expect(targetDatesRepository.insertTargetDate).not.toHaveBeenCalled();
    });

    test('should return 400 for invalid date format', async () => {
      request.json.mockResolvedValue({
        date: '2025/12/01',
        label: 'テスト'
      });
      
      const response = await createTargetDateHandler(request, context);
      
      expect(response.status).toBe(400);
      expect(response.jsonBody.error).toBe('Bad Request');
      expect(response.jsonBody.message).toBe('Date must be in YYYY-MM-DD format');
      expect(targetDatesRepository.insertTargetDate).not.toHaveBeenCalled();
    });

    test('should return 409 when date already exists', async () => {
      request.json.mockResolvedValue({
        date: '2025-11-15',
        label: '本番ライブ'
      });
      
      targetDatesRepository.insertTargetDate.mockRejectedValue(
        new Error('Target date 2025-11-15 already exists')
      );
      
      const response = await createTargetDateHandler(request, context);
      
      expect(response.status).toBe(409);
      expect(response.jsonBody.error).toBe('Conflict');
      expect(response.jsonBody.message).toBe('Target date 2025-11-15 already exists');
    });

    test('should return 503 for other errors', async () => {
      request.json.mockResolvedValue({
        date: '2025-12-01',
        label: 'テスト'
      });
      
      targetDatesRepository.insertTargetDate.mockRejectedValue(
        new Error('Cosmos DB error')
      );
      
      const response = await createTargetDateHandler(request, context);
      
      expect(response.status).toBe(503);
      expect(response.jsonBody.error).toBe('Service temporarily unavailable');
      expect(context.log.error).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/target-dates/{id}', () => {
    test('should delete target date successfully', async () => {
      request.params.id = '2025-11-15';
      
      const mockResult = {
        success: true,
        message: 'Target date 2025-11-15 deleted successfully'
      };
      
      targetDatesRepository.deleteTargetDate.mockResolvedValue(mockResult);
      
      const response = await deleteTargetDateHandler(request, context);
      
      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual(mockResult);
      expect(targetDatesRepository.deleteTargetDate).toHaveBeenCalledWith('2025-11-15');
    });

    test('should return 400 when id is missing', async () => {
      request.params.id = undefined;
      
      const response = await deleteTargetDateHandler(request, context);
      
      expect(response.status).toBe(400);
      expect(response.jsonBody.error).toBe('Bad Request');
      expect(response.jsonBody.message).toBe('ID is required');
      expect(targetDatesRepository.deleteTargetDate).not.toHaveBeenCalled();
    });

    test('should return 404 when target date not found', async () => {
      request.params.id = '2025-11-15';
      
      targetDatesRepository.deleteTargetDate.mockRejectedValue(
        new Error('Target date 2025-11-15 not found')
      );
      
      const response = await deleteTargetDateHandler(request, context);
      
      expect(response.status).toBe(404);
      expect(response.jsonBody.error).toBe('Not Found');
      expect(response.jsonBody.message).toBe('Target date 2025-11-15 not found');
    });

    test('should return 503 for other errors', async () => {
      request.params.id = '2025-11-15';
      
      targetDatesRepository.deleteTargetDate.mockRejectedValue(
        new Error('Cosmos DB error')
      );
      
      const response = await deleteTargetDateHandler(request, context);
      
      expect(response.status).toBe(503);
      expect(response.jsonBody.error).toBe('Service temporarily unavailable');
      expect(context.log.error).toHaveBeenCalled();
    });
  });
});