import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { AvailabilityResponse, AllAvailabilityResponse } from '../types/availability';
import { 
  TargetDatesResponse, 
  CreateTargetDateRequest, 
  CreateTargetDateResponse,
  DeleteTargetDateResponse 
} from '../types/targetDates';
import { ScraperResponse, ScrapeBatchResponse } from '../types/scraper';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// リトライ設定を拡張したAxiosRequestConfig
interface RetryConfig extends AxiosRequestConfig {
  __retryCount?: number;
}

// axiosインスタンスの作成
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30秒
});

// リトライ対象のエラーかどうか判定
const shouldRetry = (error: AxiosError): boolean => {
  // ネットワークエラー
  if (!error.response) {
    return true;
  }
  
  // 5xxサーバーエラー
  if (error.response.status >= 500 && error.response.status < 600) {
    return true;
  }
  
  // タイムアウトエラー
  if (error.code === 'ECONNABORTED') {
    return true;
  }
  
  return false;
};

// 遅延用のヘルパー関数
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// リトライインターセプターの設定
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config as RetryConfig;
    
    // 設定がない、GETメソッドではない、またはすでにリトライ済みの場合はエラーを返す
    if (!config || config.method?.toUpperCase() !== 'GET' || (config.__retryCount || 0) >= 1) {
      return Promise.reject(error);
    }
    
    // リトライ対象のエラーか確認（GETメソッドのみ）
    if (shouldRetry(error)) {
      config.__retryCount = (config.__retryCount || 0) + 1;
      console.log(`Retrying GET request... (attempt ${config.__retryCount})`);
      
      // 1秒待機
      await delay(1000);
      
      // リトライ実行
      return axiosInstance(config);
    }
    
    return Promise.reject(error);
  }
);

export const availabilityApi = {
  async getAvailability(date: string): Promise<AvailabilityResponse> {
    try {
      const response = await axiosInstance.get<AvailabilityResponse>(
        `/availability/${date}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch availability:', error);
      throw error;
    }
  },
  
  async getAllAvailability(): Promise<AllAvailabilityResponse> {
    try {
      const response = await axiosInstance.get<AllAvailabilityResponse>(
        `/availability`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch all availability:', error);
      throw error;
    }
  },
};

export const targetDatesApi = {
  async getAllTargetDates(): Promise<TargetDatesResponse> {
    try {
      const response = await axiosInstance.get<TargetDatesResponse>(
        `/target-dates`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch target dates:', error);
      throw error;
    }
  },
  
  async createTargetDate(data: CreateTargetDateRequest): Promise<CreateTargetDateResponse> {
    try {
      const response = await axiosInstance.post<CreateTargetDateResponse>(
        `/target-dates`,
        data
      );
      return response.data;
    } catch (error) {
      console.error('Failed to create target date:', error);
      throw error;
    }
  },
  
  async deleteTargetDate(id: string): Promise<DeleteTargetDateResponse> {
    try {
      const response = await axiosInstance.delete<DeleteTargetDateResponse>(
        `/target-dates/${id}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to delete target date:', error);
      throw error;
    }
  }
};

export const scraperApi = {
  async triggerScraping(): Promise<ScraperResponse> {
    try {
      const response = await axiosInstance.post<ScraperResponse>(
        `/scrape`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // 409エラー（すでに実行中）の場合もエラーデータを返す
        return error.response.data;
      }
      console.error('Failed to trigger scraping:', error);
      throw error;
    }
  },

  async triggerBatchScraping(): Promise<ScrapeBatchResponse> {
    try {
      const response = await axiosInstance.post<ScrapeBatchResponse>(
        `/scrape/batch`,
        { includeAllTargetDates: true }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // エラーレスポンスがある場合はそのデータを返す
        return error.response.data;
      }
      console.error('Failed to trigger batch scraping:', error);
      throw error;
    }
  }
};

// テスト用にaxiosインスタンスをエクスポート
export { axiosInstance };