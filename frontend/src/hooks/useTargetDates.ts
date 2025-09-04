import { useState, useEffect } from 'react';
import { targetDatesApi, availabilityApi } from '../services/api';
import { TargetDate } from '../types/targetDates';
import { ErrorDetails } from '../types/common';

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

  const deleteTargetDate = async (id: string, date?: string): Promise<boolean> => {
    try {
      // 練習日を削除
      await targetDatesApi.deleteTargetDate(id);
      
      // 日付が提供されている場合、該当日のavailabilityデータも削除
      if (date) {
        try {
          await availabilityApi.deleteAvailabilityByDate(date);
          console.log(`Deleted availability data for date: ${date}`);
        } catch (availErr: any) {
          // availabilityデータの削除に失敗してもログに記録するのみ
          // 練習日削除は成功として扱う（availabilityデータは次回スクレイピングで上書きされるため）
          console.warn(`Failed to delete availability data for date ${date}:`, availErr);
        }
      }
      
      // データを再取得
      await fetchData();
      return true;
    } catch (err: any) {
      console.error('Failed to delete target date:', err);
      return false;
    }
  };

  return { data, loading, error, refetch: fetchData, deleteTargetDate };
};