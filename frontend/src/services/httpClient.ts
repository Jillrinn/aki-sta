import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// リトライ設定を拡張したAxiosRequestConfig
interface RetryConfig extends AxiosRequestConfig {
  __retryCount?: number;
}

export class HttpClient {
  private axiosInstance: AxiosInstance;

  constructor(baseURL: string, timeout: number = 30000) {
    this.axiosInstance = axios.create({
      baseURL,
      timeout,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // リトライインターセプターの設定
    this.axiosInstance.interceptors.response.use(
      response => response,
      async error => {
        const config = error.config as RetryConfig;
        
        // 設定がない、GETメソッドではない、またはすでにリトライ済みの場合はエラーを返す
        if (!config || config.method?.toUpperCase() !== 'GET' || (config.__retryCount || 0) >= 1) {
          return Promise.reject(error);
        }
        
        // リトライ対象のエラーか確認（GETメソッドのみ）
        if (this.shouldRetry(error)) {
          config.__retryCount = (config.__retryCount || 0) + 1;
          console.log(`Retrying GET request... (attempt ${config.__retryCount})`);
          
          // 1秒待機
          await this.delay(1000);
          
          // リトライ実行
          return this.axiosInstance(config);
        }
        
        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: AxiosError): boolean {
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
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch<T>(url, data, config);
  }

  // axiosエラーかどうか判定するヘルパーメソッド
  static isAxiosError(error: any): error is AxiosError {
    return axios.isAxiosError(error);
  }
}

// シングルトンインスタンス
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';
export const httpClient = new HttpClient(API_BASE_URL);