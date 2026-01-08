import api from './api';
import { Shifts_API } from './constants';

/**
 * Create a new shift
 * @param shiftData - Shift data with name, timezone, startTime, endTime, and optional fields
 * @returns Promise with created shift data
 */
export const createShift = async (shiftData: {
  name: string;
  description?: string;
  timezone: string; // IANA timezone identifier
  startTime: string; // HH:mm format (24-hour)
  endTime: string; // HH:mm format (24-hour)
  isActive?: boolean;
}): Promise<any> => {
  const response = await api.post(Shifts_API, shiftData);
  return response.data;
};

/**
 * Get all shifts with optional filtering and pagination
 * @param params - Optional query parameters for filtering and pagination
 * @returns Promise with shifts list
 */
export const getAllShifts = async (params?: {
  name?: string;
  timezone?: string;
  isActive?: boolean;
  sortBy?: string;
  limit?: number;
  page?: number;
}): Promise<any> => {
  const queryParams = new URLSearchParams();
  
  if (params?.name) queryParams.append('name', params.name);
  if (params?.timezone) queryParams.append('timezone', params.timezone);
  if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  
  const queryString = queryParams.toString();
  const url = queryString ? `${Shifts_API}?${queryString}` : Shifts_API;
  
  const response = await api.get(url);
  return response.data;
};

/**
 * Get shift by ID
 * @param shiftId - MongoDB ObjectId of the shift
 * @returns Promise with shift data
 */
export const getShiftById = async (shiftId: string): Promise<any> => {
  const response = await api.get(`${Shifts_API}/${shiftId}`);
  return response.data;
};

/**
 * Update an existing shift
 * @param shiftId - MongoDB ObjectId of the shift
 * @param updates - Partial shift data to update
 * @returns Promise with updated shift data
 */
export const updateShift = async (shiftId: string, updates: {
  name?: string;
  description?: string;
  timezone?: string;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
}): Promise<any> => {
  const response = await api.patch(`${Shifts_API}/${shiftId}`, updates);
  return response.data;
};

/**
 * Delete a shift
 * @param shiftId - MongoDB ObjectId of the shift
 * @returns Promise with deletion confirmation
 */
export const deleteShift = async (shiftId: string): Promise<any> => {
  const response = await api.delete(`${Shifts_API}/${shiftId}`);
  return response.data;
};

