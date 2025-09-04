import { useState, useEffect } from 'react';
import { availabilityApi } from '../services/api';
import { AllAvailabilityResponse } from '../types/availability';
import { ErrorDetails } from '../types/common';

const validateResponse = (response: any): boolean => {
  if (!response || typeof response !== 'object') return false;
  
  for (const date in response) {
    if (!Array.isArray(response[date])) return false;
    
    for (const facility of response[date]) {
      if (!facility.facilityName || 
          typeof facility.timeSlots !== 'object' || 
          !facility.lastUpdated) {
        return false;
      }
    }
  }
  return true;
};

export const useAvailabilityData = () => {
  const [data, setData] = useState<AllAvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // 最小表示時間300msを保証するためのタイムスタンプ記録
      const startTime = Date.now();
      
      const response = await availabilityApi.getAllAvailability();
      
      if (!validateResponse(response)) {
        throw new Error('Invalid API response structure');
      }
      
      // 最小表示時間300ms（0.3秒）を保証
      const elapsed = Date.now() - startTime;
      if (isRefresh && elapsed < 300) {
        await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
      }
      
      setData(response);
      setError(null);
    } catch (err: any) {
      const errorDetails: ErrorDetails = {
        message: 'データの取得に失敗しました',
      };
      
      if (err.response) {
        errorDetails.statusCode = err.response.status;
        errorDetails.statusText = err.response.statusText;
        
        if (err.response.status === 404) {
          errorDetails.message = 'APIエンドポイントが見つかりません。サーバーの設定を確認してください';
        } else if (err.response.status === 500) {
          errorDetails.message = 'サーバーエラーが発生しました。時間をおいて再度お試しください';
        } else {
          errorDetails.message = `サーバーエラーが発生しました`;
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
      setIsRefreshing(false);
    }
  };

  const refetch = () => {
    fetchData(true);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch, isRefreshing };
};