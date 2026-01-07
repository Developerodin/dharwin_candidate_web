import api from './api';
import { Holidays_API } from './constants';

/**
 * Create a new holiday
 * @param holidayData - Holiday data with title, date, and optional isActive
 * @returns Promise with created holiday data
 */
export const createHoliday = async (holidayData: {
  title: string;
  date: string; // ISO 8601 date string
  isActive?: boolean;
}): Promise<any> => {
  const response = await api.post(Holidays_API, holidayData);
  return response.data;
};

/**
 * Get all holidays with optional filtering and pagination
 * @param params - Optional query parameters for filtering and pagination
 * @returns Promise with holidays list
 */
export const getAllHolidays = async (params?: {
  title?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  sortBy?: string;
  limit?: number;
  page?: number;
}): Promise<any> => {
  const queryParams = new URLSearchParams();
  
  if (params?.title) queryParams.append('title', params.title);
  if (params?.date) queryParams.append('date', params.date);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  
  const queryString = queryParams.toString();
  const url = queryString ? `${Holidays_API}?${queryString}` : Holidays_API;
  
  const response = await api.get(url);
  return response.data;
};

/**
 * Get holiday by ID
 * @param holidayId - MongoDB ObjectId of the holiday
 * @returns Promise with holiday data
 */
export const getHolidayById = async (holidayId: string): Promise<any> => {
  const response = await api.get(`${Holidays_API}/${holidayId}`);
  return response.data;
};

/**
 * Update an existing holiday
 * @param holidayId - MongoDB ObjectId of the holiday
 * @param updates - Partial holiday data to update
 * @returns Promise with updated holiday data
 */
export const updateHoliday = async (holidayId: string, updates: {
  title?: string;
  date?: string;
  isActive?: boolean;
}): Promise<any> => {
  const response = await api.patch(`${Holidays_API}/${holidayId}`, updates);
  return response.data;
};

/**
 * Delete a holiday
 * @param holidayId - MongoDB ObjectId of the holiday
 * @returns Promise with deletion confirmation
 */
export const deleteHoliday = async (holidayId: string): Promise<any> => {
  const response = await api.delete(`${Holidays_API}/${holidayId}`);
  return response.data;
};

