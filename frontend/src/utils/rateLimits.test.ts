import { isActuallyRunning } from './rateLimits';
import { RateLimitResponse } from '../types/rateLimits';

describe('isActuallyRunning', () => {
  beforeEach(() => {
    // テストごとに時刻をリセット
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should return true if status is running and updatedAt is within 30 minutes', () => {
    const record: RateLimitResponse = {
      id: 'rate-limit-2025-01-01',
      date: '2025-01-01',
      count: 1,
      status: 'running',
      lastRequestedAt: '2025-01-01T10:00:00Z',
      createdAt: '2025-01-01T10:00:00Z',
      updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10分前
    };

    const result = isActuallyRunning(record);
    expect(result).toBe(true);
  });

  it('should return false if status is running and updatedAt is over 30 minutes ago', () => {
    const record: RateLimitResponse = {
      id: 'rate-limit-2025-01-01',
      date: '2025-01-01',
      count: 1,
      status: 'running',
      lastRequestedAt: '2025-01-01T10:00:00Z',
      createdAt: '2025-01-01T10:00:00Z',
      updatedAt: new Date(Date.now() - 35 * 60 * 1000).toISOString() // 35分前
    };

    const result = isActuallyRunning(record);
    expect(result).toBe(false);
  });

  it('should return false if status is not running', () => {
    const record: RateLimitResponse = {
      id: 'rate-limit-2025-01-01',
      date: '2025-01-01',
      count: 1,
      status: 'completed',
      lastRequestedAt: '2025-01-01T10:00:00Z',
      createdAt: '2025-01-01T10:00:00Z',
      updatedAt: new Date().toISOString()
    };

    const result = isActuallyRunning(record);
    expect(result).toBe(false);
  });

  it('should return false if record is null', () => {
    const result = isActuallyRunning(null);
    expect(result).toBe(false);
  });

  it('should return true if status is running but updatedAt is missing', () => {
    const record: RateLimitResponse = {
      id: 'rate-limit-2025-01-01',
      date: '2025-01-01',
      count: 1,
      status: 'running',
      lastRequestedAt: '2025-01-01T10:00:00Z',
      createdAt: '2025-01-01T10:00:00Z'
    };

    const result = isActuallyRunning(record);
    expect(result).toBe(true);
  });

  it('should return true if updatedAt cannot be parsed', () => {
    const record: RateLimitResponse = {
      id: 'rate-limit-2025-01-01',
      date: '2025-01-01',
      count: 1,
      status: 'running',
      lastRequestedAt: '2025-01-01T10:00:00Z',
      createdAt: '2025-01-01T10:00:00Z',
      updatedAt: 'invalid-date'
    };

    // エラーログを抑制
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const result = isActuallyRunning(record);
    expect(result).toBe(true);
    
    // エラーログが出力されたことを確認
    expect(consoleSpy).toHaveBeenCalledWith('Failed to parse updatedAt:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('should handle edge case of exactly 30 minutes', () => {
    const record: RateLimitResponse = {
      id: 'rate-limit-2025-01-01',
      date: '2025-01-01',
      count: 1,
      status: 'running',
      lastRequestedAt: '2025-01-01T10:00:00Z',
      createdAt: '2025-01-01T10:00:00Z',
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // ちょうど30分前
    };

    const result = isActuallyRunning(record);
    expect(result).toBe(false); // 30分ちょうどは超過と判定
  });

  it('should return false for failed status', () => {
    const record: RateLimitResponse = {
      id: 'rate-limit-2025-01-01',
      date: '2025-01-01',
      count: 1,
      status: 'failed',
      lastRequestedAt: '2025-01-01T10:00:00Z',
      createdAt: '2025-01-01T10:00:00Z',
      updatedAt: new Date().toISOString()
    };

    const result = isActuallyRunning(record);
    expect(result).toBe(false);
  });

  it('should return false for pending status', () => {
    const record: RateLimitResponse = {
      id: 'rate-limit-2025-01-01',
      date: '2025-01-01',
      count: 1,
      status: 'pending',
      lastRequestedAt: '2025-01-01T10:00:00Z',
      createdAt: '2025-01-01T10:00:00Z',
      updatedAt: new Date().toISOString()
    };

    const result = isActuallyRunning(record);
    expect(result).toBe(false);
  });
});