import api from './api';
import { Users_API, UPDATE_REGISTERED_USER_API, DELETE_REGISTERED_USER_API } from './constants';

// Fetch all admin users with optional query parameters
export const fetchAllAdminUsers = async (params?: {
  name?: string;
  email?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}) => {
  const queryParams = new URLSearchParams();
  
  // Always filter by admin role
  queryParams.append('role', 'admin');
  
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

// Fetch admin user by ID
export const fetchAdminUserById = async (id: string) => {
  const response = await api.get(`${Users_API}/${id}`);
  return response.data;
};

// Update admin user (registered via register-user endpoint)
export const updateAdminUser = async (userId: string, userData: {
  name?: string;
  phoneNumber?: string;
  countryCode?: string;
  subRole?: string;
  isActive?: boolean;
  navigation?: any;
}) => {
  const response = await api.patch(UPDATE_REGISTERED_USER_API(userId), userData);
  return response.data;
};

// Delete admin user (registered via register-user endpoint)
export const deleteAdminUser = async (userId: string) => {
  const response = await api.delete(DELETE_REGISTERED_USER_API(userId));
  return response.data;
};

// Toggle user active status
export const toggleUserActiveStatus = async (userId: string, isActive: boolean) => {
  const response = await api.patch(UPDATE_REGISTERED_USER_API(userId), { isActive });
  return response.data;
};
