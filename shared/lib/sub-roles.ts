import api from './api';

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://crm-apis.dharwinbusinesssolutions.com/v1";
const SUB_ROLES_API = `${BASE_API_URL}/sub-roles`;

export interface NavigationPermissions {
  [key: string]: boolean | NavigationPermissions;
}

export interface SubRole {
  id?: string;
  _id?: string;
  name: string;
  description?: string | null;
  navigation: NavigationPermissions;
  isActive: boolean;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SubRoleListResponse {
  results: SubRole[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export const fetchSubRoles = async (params?: {
  name?: string;
  isActive?: boolean;
  sortBy?: string;
  limit?: number;
  page?: number;
}): Promise<SubRoleListResponse | SubRole[]> => {
  const queryParams = new URLSearchParams();

  if (params?.name) queryParams.append('name', params.name);
  if (typeof params?.isActive === 'boolean') queryParams.append('isActive', String(params.isActive));
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.page) queryParams.append('page', params.page.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `${SUB_ROLES_API}?${queryString}` : SUB_ROLES_API;

  const response = await api.get(url);
  return response.data;
};

export const fetchSubRoleById = async (id: string): Promise<SubRole> => {
  const response = await api.get(`${SUB_ROLES_API}/${id}`);
  return response.data;
};

export const createSubRole = async (payload: {
  name: string;
  description?: string;
  navigation: NavigationPermissions;
  isActive?: boolean;
}): Promise<SubRole> => {
  const response = await api.post(SUB_ROLES_API, payload);
  return response.data;
};

export const updateSubRole = async (
  id: string,
  payload: {
    name?: string;
    description?: string;
    navigation?: NavigationPermissions;
    isActive?: boolean;
  }
): Promise<SubRole> => {
  const response = await api.patch(`${SUB_ROLES_API}/${id}`, payload);
  return response.data;
};

export const deleteSubRole = async (id: string): Promise<void> => {
  await api.delete(`${SUB_ROLES_API}/${id}`);
};

