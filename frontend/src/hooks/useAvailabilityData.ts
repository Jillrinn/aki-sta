import { useState, useEffect } from 'react';
import { availabilityApi } from '../services/api';
import { AllAvailabilityResponse } from '../types/availability';
import { ErrorDetails } from '../components/availability';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await availabilityApi.getAllAvailability();
        
        if (!validateResponse(response)) {
          throw new Error('Invalid API response structure');
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
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};