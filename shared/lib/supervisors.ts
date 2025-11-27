import api from './api';
import { Users_API, REGISTER_SUPERVISOR_API } from './constants';

// Fetch all supervisors with optional query parameters
export const fetchAllSupervisors = async (params?: {
  name?: string;
  email?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}) => {
  const queryParams = new URLSearchParams();
  
  // Always filter by supervisor role
  queryParams.append('role', 'supervisor');
  
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

// Fetch supervisor by ID
export const fetchSupervisorById = async (id: string) => {
  const response = await api.get(`${Users_API}/${id}`);
  return response.data;
};

// Create a new supervisor
export const addSupervisor = async (supervisorData: {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  countryCode?: string;
}) => {
  const response = await api.post(REGISTER_SUPERVISOR_API, supervisorData);
  return response.data;
};

// Update a supervisor
export const updateSupervisor = async (supervisorData: {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  phoneNumber?: string;
  countryCode?: string;
}) => {
  const { id, ...rest } = supervisorData;
  const response = await api.patch(`${Users_API}/${id}`, rest);
  return response.data;
};

// Delete a supervisor
export const deleteSupervisor = async (supervisorId: string) => {
  const response = await api.delete(`${Users_API}/${supervisorId}`);
  return response.data;
};


