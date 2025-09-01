import axios from 'axios';
import { AvailabilityResponse, AllAvailabilityResponse } from '../types/availability';
import { 
  TargetDatesResponse, 
  CreateTargetDateRequest, 
  CreateTargetDateResponse,
  DeleteTargetDateResponse 
} from '../types/targetDates';
import { ScraperResponse, ScrapeBatchResponse } from '../types/scraper';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export const availabilityApi = {
  async getAvailability(date: string): Promise<AvailabilityResponse> {
    try {
      const response = await axios.get<AvailabilityResponse>(
        `${API_BASE_URL}/availability/${date}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch availability:', error);
      throw error;
    }
  },
  
  async getAllAvailability(): Promise<AllAvailabilityResponse> {
    try {
      const response = await axios.get<AllAvailabilityResponse>(
        `${API_BASE_URL}/availability`
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
      const response = await axios.get<TargetDatesResponse>(
        `${API_BASE_URL}/target-dates`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch target dates:', error);
      throw error;
    }
  },
  
  async createTargetDate(data: CreateTargetDateRequest): Promise<CreateTargetDateResponse> {
    try {
      const response = await axios.post<CreateTargetDateResponse>(
        `${API_BASE_URL}/target-dates`,
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
      const response = await axios.delete<DeleteTargetDateResponse>(
        `${API_BASE_URL}/target-dates/${id}`
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
      const response = await axios.post<ScraperResponse>(
        `${API_BASE_URL}/scrape`
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
      const response = await axios.post<ScrapeBatchResponse>(
        `${API_BASE_URL}/scrape/batch`,
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