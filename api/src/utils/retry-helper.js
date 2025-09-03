const { backOff } = require('exponential-backoff');

/**
 * Exponential backoffを使用したリトライ処理
 */
async function retryWithBackoff(fn, options = {}) {
  const defaultOptions = {
    numOfAttempts: 3,
    startingDelay: 1000,
    maxDelay: 30000,
    delayFirstAttempt: false,
    timeMultiple: 2,
    retry: (error, attemptNumber) => {
      console.log(`Attempt ${attemptNumber} failed:`, error.message);
      // 503や一時的なエラーの場合はリトライ、それ以外はリトライしない
      if (error.statusCode === 503 || 
          error.code === 'ECONNRESET' || 
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND' ||
          error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('Network error') ||
          error.message?.includes('Request timeout')) {
        return true;
      }
      return attemptNumber < 3;
    }
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    return await backOff(fn, mergedOptions);
  } catch (error) {
    console.error('All retry attempts failed:', error);
    throw error;
  }
}

/**
 * Circuit Breaker パターンの実装
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.threshold = options.threshold || 5; // エラー閾値
    this.timeout = options.timeout || 60000; // Circuit Open時間（ミリ秒）
    this.resetTimeout = options.resetTimeout || 120000; // リセット時間
    
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN. Service unavailable.');
      }
      // Half-open状態に移行して試行
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.error(`Circuit breaker opened. Will retry after ${this.timeout}ms`);
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

module.exports = {
  retryWithBackoff,
  CircuitBreaker
};