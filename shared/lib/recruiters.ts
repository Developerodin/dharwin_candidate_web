import api from './api';
import { Users_API, REGISTER_RECRUITER_API } from './constants';

// Fetch all recruiters with optional query parameters
export const fetchAllRecruiters = async (params?: {
  name?: string;
  email?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}) => {
  const queryParams = new URLSearchParams();
  
  // Always filter by recruiter role
  queryParams.append('role', 'recruiter');
  
  if (params?.name) queryParams.append('name', params.name);
  if (params?.email) queryParams.append('email', params.email);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  
  const queryString = queryParams.toString();
  const url = `${Users_API}?${queryString}`;
  
  const response = await api.get(url);
  return response.data;
};

// Fetch recruiter by ID
export const fetchRecruiterById = async (id: string) => {
  const response = await api.get(`${Users_API}/${id}`);
  return response.data;
};

// Create a new recruiter
export const addRecruiter = async (recruiterData: {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  countryCode?: string;
}) => {
  const response = await api.post(REGISTER_RECRUITER_API, recruiterData);
  return response.data;
};

// Update a recruiter
export const updateRecruiter = async (recruiterData: {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  phoneNumber?: string;
  countryCode?: string;
}) => {
  const { id, ...rest } = recruiterData;
  const response = await api.patch(`${Users_API}/${id}`, rest);
  return response.data;
};

// Delete a recruiter
export const deleteRecruiter = async (recruiterId: string) => {
  const response = await api.delete(`${Users_API}/${recruiterId}`);
  return response.data;
};

