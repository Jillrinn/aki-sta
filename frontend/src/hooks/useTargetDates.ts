import { useState, useEffect } from 'react';
import { targetDatesApi } from '../services/api';
import { TargetDate } from '../types/targetDates';

export interface ErrorDetails {
  message: string;
  statusCode?: number;
  statusText?: string;
  originalError?: string;
}

export const useTargetDates = () => {
  const [data, setData] = useState<TargetDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorDetails | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await targetDatesApi.getAllTargetDates();
      
      if (!response || !response.dates) {
        throw new Error('Invalid API response structure');
      }
      
      setData(response.dates);
      setError(null);
    } catch (err: any) {
      const errorDetails: ErrorDetails = {
        message: 'データの取得に失敗しました',
      };
      
      if (err.response) {
        errorDetails.statusCode = err.response.status;
        errorDetails.statusText = err.response.statusText;
        
        if (err.response.status === 404) {
          errorDetails.message = 'APIエンドポイントが見つかりません';
        } else if (err.response.status === 500) {
          errorDetails.message = 'サーバーエラーが発生しました';
        } else if (err.response.status === 503) {
          errorDetails.message = 'サービスが一時的に利用できません';
        }
        
        if (err.response.data?.error || err.response.data?.details) {
          errorDetails.originalError = err.response.data.error || err.response.data.details;
        }
      } else if (err.request) {
        errorDetails.message = 'ネットワーク接続エラー: サーバーに接続できません';
      } else {
        errorDetails.originalError = err.message || '不明なエラー';
      }
      
      setError(errorDetails);
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const deleteTargetDate = async (id: string): Promise<boolean> => {
    try {
      await targetDatesApi.deleteTargetDate(id);
      await fetchData();
      return true;
    } catch (err: any) {
      console.error('Failed to delete target date:', err);
      return false;
    }
  };

  return { data, loading, error, refetch: fetchData, deleteTargetDate };
};