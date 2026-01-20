import api from './api';
import { Candidate_Groups_API } from './constants';

/**
 * Create a new candidate group
 * @param groupData - Group data with name, description, and optional candidateIds
 * @returns Promise with created group data
 */
export const createCandidateGroup = async (groupData: {
  name: string;
  description?: string;
  candidateIds?: string[];
}): Promise<any> => {
  const response = await api.post(Candidate_Groups_API, groupData);
  return response.data;
};

/**
 * Get all candidate groups with optional filtering and pagination
 * @param params - Optional query parameters for filtering and pagination
 * @returns Promise with groups list
 */
export const getAllCandidateGroups = async (params?: {
  name?: string;
  isActive?: boolean;
  createdBy?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}): Promise<any> => {
  const queryParams = new URLSearchParams();
  
  if (params?.name) queryParams.append('name', params.name);
  if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
  if (params?.createdBy) queryParams.append('createdBy', params.createdBy);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  
  const queryString = queryParams.toString();
  const url = queryString ? `${Candidate_Groups_API}?${queryString}` : Candidate_Groups_API;
  
  const response = await api.get(url);
  return response.data;
};

/**
 * Get candidate group by ID
 * @param groupId - MongoDB ObjectId of the group
 * @returns Promise with group data
 */
export const getCandidateGroupById = async (groupId: string): Promise<any> => {
  const response = await api.get(`${Candidate_Groups_API}/${groupId}`);
  return response.data;
};

/**
 * Update an existing candidate group
 * @param groupId - MongoDB ObjectId of the group
 * @param updates - Partial group data to update
 * @returns Promise with updated group data
 */
export const updateCandidateGroup = async (groupId: string, updates: {
  name?: string;
  description?: string;
  candidateIds?: string[];
  isActive?: boolean;
}): Promise<any> => {
  const response = await api.patch(`${Candidate_Groups_API}/${groupId}`, updates);
  return response.data;
};

/**
 * Delete a candidate group
 * @param groupId - MongoDB ObjectId of the group
 * @returns Promise with deletion confirmation
 */
export const deleteCandidateGroup = async (groupId: string): Promise<any> => {
  const response = await api.delete(`${Candidate_Groups_API}/${groupId}`);
  return response.data;
};

/**
 * Add candidates to a group
 * @param groupId - MongoDB ObjectId of the group
 * @param candidateIds - Array of candidate ObjectIds to add
 * @returns Promise with updated group data
 */
export const addCandidatesToGroup = async (groupId: string, candidateIds: string[]): Promise<any> => {
  const response = await api.post(`${Candidate_Groups_API}/${groupId}/candidates`, {
    candidateIds
  });
  return response.data;
};

/**
 * Remove candidates from a group
 * @param groupId - MongoDB ObjectId of the group
 * @param candidateIds - Array of candidate ObjectIds to remove
 * @returns Promise with updated group data
 */
export const removeCandidatesFromGroup = async (groupId: string, candidateIds: string[]): Promise<any> => {
  const response = await api.post(`${Candidate_Groups_API}/${groupId}/candidates/remove`, {
    candidateIds
  });
  return response.data;
};

/**
 * Assign holidays to all candidates in a group
 * @param groupId - MongoDB ObjectId of the group
 * @param holidayIds - Array of holiday ObjectIds to assign
 * @returns Promise with assignment results
 */
export const assignHolidaysToGroup = async (groupId: string, holidayIds: string[]): Promise<any> => {
  const response = await api.post(`${Candidate_Groups_API}/${groupId}/holidays`, {
    holidayIds
  });
  return response.data;
};

/**
 * Remove holidays from all candidates in a group
 * @param groupId - MongoDB ObjectId of the group
 * @param holidayIds - Array of holiday ObjectIds to remove
 * @returns Promise with removal results
 */
export const removeHolidaysFromGroup = async (groupId: string, holidayIds: string[]): Promise<any> => {
  const response = await api.delete(`${Candidate_Groups_API}/${groupId}/holidays`, {
    data: {
      holidayIds
    }
  });
  return response.data;
};
