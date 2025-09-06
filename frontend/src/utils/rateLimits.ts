import { RateLimitResponse } from '../types/rateLimits';

/**
 * レコードが実際に実行中かどうかを判定
 * @param record 判定対象のレコード
 * @returns 実行中の場合true、そうでない場合false
 */
export function isActuallyRunning(record: RateLimitResponse | null): boolean {
  // レコードがnullまたはstatusがrunningでない場合はfalse
  if (!record || record.status !== 'running') {
    return false;
  }

  // updatedAtが存在しない場合は安全側に倒してtrue
  if (!record.updatedAt) {
    return true;
  }

  try {
    const updatedAt = new Date(record.updatedAt);
    const currentTime = new Date();
    
    // 30分経過していなければtrue
    const timeDiffMs = currentTime.getTime() - updatedAt.getTime();
    const thirtyMinutesMs = 30 * 60 * 1000;
    
    return timeDiffMs < thirtyMinutesMs;
  } catch (error) {
    // パースエラーの場合は安全側に倒してtrue
    console.error('Failed to parse updatedAt:', error);
    return true;
  }
}