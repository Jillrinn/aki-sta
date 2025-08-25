import axios from 'axios';
import { AvailabilityResponse, AllAvailabilityResponse } from '../types/availability';

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