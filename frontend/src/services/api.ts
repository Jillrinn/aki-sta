import { AvailabilityResponse, AllAvailabilityResponse, DeleteAvailabilityResponse } from '../types/availability';
import { 
  TargetDatesResponse, 
  CreateTargetDateRequest, 
  CreateTargetDateResponse,
  DeleteTargetDateResponse,
  UpdateTargetDateRequest,
  UpdateTargetDateResponse 
} from '../types/targetDates';
import { ScraperResponse, ScrapeBatchResponse, ScrapeDateResponse, CheckScrapingStatusResponse } from '../types/scraper';
import { RateLimitResponse } from '../types/rateLimits';
import { httpClient, HttpClient } from './httpClient';

export const availabilityApi = {
  async getAvailability(date: string): Promise<AvailabilityResponse> {
    try {
      const response = await httpClient.get<AvailabilityResponse>(
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
      const response = await httpClient.get<AllAvailabilityResponse>(
        `/availability`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch all availability:', error);
      throw error;
    }
  },
  
  async deleteAvailabilityByDate(date: string): Promise<DeleteAvailabilityResponse> {
    try {
      const response = await httpClient.delete<DeleteAvailabilityResponse>(
        `/availability/date/${date}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to delete availability by date:', error);
      throw error;
    }
  },
};

export const targetDatesApi = {
  async getAllTargetDates(): Promise<TargetDatesResponse> {
    try {
      const response = await httpClient.get<TargetDatesResponse>(
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
      const response = await httpClient.post<CreateTargetDateResponse>(
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
      const response = await httpClient.delete<DeleteTargetDateResponse>(
        `/target-dates/${id}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to delete target date:', error);
      throw error;
    }
  },
  
  async updateTargetDate(id: string, data: UpdateTargetDateRequest): Promise<UpdateTargetDateResponse> {
    try {
      const response = await httpClient.patch<UpdateTargetDateResponse>(
        `/target-dates/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      console.error('Failed to update target date:', error);
      throw error;
    }
  }
};

export const scraperApi = {
  async triggerScraping(): Promise<ScraperResponse> {
    try {
      const response = await httpClient.post<ScraperResponse>(
        `/scrape`
      );
      return response.data;
    } catch (error) {
      if (HttpClient.isAxiosError(error) && error.response) {
        // 409エラー（すでに実行中）の場合もエラーデータを返す
        return error.response.data as ScraperResponse;
      }
      console.error('Failed to trigger scraping:', error);
      throw error;
    }
  },

  async triggerBatchScraping(): Promise<ScrapeBatchResponse> {
    try {
      const response = await httpClient.post<ScrapeBatchResponse>(
        `/scrape/batch`,
        { includeAllTargetDates: true }
      );
      return response.data;
    } catch (error) {
      if (HttpClient.isAxiosError(error) && error.response) {
        // エラーレスポンスがある場合はそのデータを返す
        return error.response.data as ScrapeBatchResponse;
      }
      console.error('Failed to trigger batch scraping:', error);
      throw error;
    }
  },

  async triggerScrapingByDate(date: string): Promise<ScrapeDateResponse> {
    try {
      const response = await httpClient.post<ScrapeDateResponse>(
        `/scrape/date`,
        { date }
      );
      return response.data;
    } catch (error) {
      if (HttpClient.isAxiosError(error) && error.response) {
        // 409エラー（すでに実行中）の場合もエラーデータを返す
        return error.response.data as ScrapeDateResponse;
      }
      console.error('Failed to trigger scraping by date:', error);
      throw error;
    }
  },

  async checkBatchScrapingStatus(): Promise<CheckScrapingStatusResponse> {
    try {
      const response = await httpClient.get<CheckScrapingStatusResponse>(
        `/scrape/status`
      );
      return response.data;
    } catch (error) {
      // エラーの場合は実行中でないとみなす
      return { isRunning: false };
    }
  }
};

export const rateLimitsApi = {
  async getRateLimitByDate(date: string): Promise<RateLimitResponse | null> {
    try {
      const response = await httpClient.get<RateLimitResponse>(
        `/rate-limits/${date}`
      );
      return response.data;
    } catch (error) {
      if (HttpClient.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error('Failed to fetch rate limit:', error);
      throw error;
    }
  }
};