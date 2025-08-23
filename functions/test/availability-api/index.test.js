const httpFunction = require('../../src/availability-api/index');

describe('Availability API', () => {
  let context;
  let request;

  beforeEach(() => {
    context = {
      log: jest.fn(),
      bindingData: {},
      res: null
    };
    request = {};
  });

  test('should return dummy data for valid date', async () => {
    context.bindingData.date = '2025-11-15';
    
    await httpFunction(context, request);
    
    expect(context.res.status).toBe(200);
    expect(context.res.body.date).toBe('2025-11-15');
    expect(context.res.body.facilities).toHaveLength(2);
    expect(context.res.body.dataSource).toBe('dummy');
    expect(context.res.body.lastUpdated).toBeUndefined();
    
    const facilities = context.res.body.facilities;
    // スクレイピングデータまたはダミーデータのどちらかをテスト
    expect(facilities[0].facilityName).toMatch(/Ensemble Studio 本郷|あんさんぶるStudio和\(本郷\)/);
    expect(facilities[0].lastUpdated).toBeDefined();
    expect(facilities[1].facilityName).toMatch(/Ensemble Studio 初台|あんさんぶるStudio音\(初台\)/);
    expect(facilities[1].lastUpdated).toBeDefined();
  });

  test('should return empty array for unknown date', async () => {
    context.bindingData.date = '2025-12-01';
    
    await httpFunction(context, request);
    
    expect(context.res.status).toBe(200);
    expect(context.res.body.date).toBe('2025-12-01');
    expect(context.res.body.facilities).toEqual([]);
    expect(context.res.body.dataSource).toBe('dummy');
  });

  test('should return error when date is missing', async () => {
    context.bindingData.date = null;
    
    await httpFunction(context, request);
    
    expect(context.res.status).toBe(400);
    expect(context.res.body.error).toBe('Date parameter is required');
  });

  test('should include CORS headers', async () => {
    context.bindingData.date = '2025-11-15';
    
    await httpFunction(context, request);
    
    expect(context.res.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(context.res.headers['Content-Type']).toBe('application/json');
  });
});