import api from './api';
import { Documents_API, Projects_API } from './constants';

// Upload documents with files and labels (same as candidates but with projects path prefix)
export const uploadProjectDocuments = async (files: File[], labels: string[]) => {
  const formData = new FormData();
  
  // Append files to FormData
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  // Append labels as a JSON string array
  formData.append('labels', JSON.stringify(labels));
  
  const response = await api.post(Documents_API, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Create a new project
export const createProject = async (projectData: any) => {
  const response = await api.post(Projects_API, projectData);
  return response.data;
};

// Get all projects with optional query parameters
export const getAllProjects = async (params?: {
  projectName?: string;
  projectManager?: string;
  status?: string;
  priority?: string;
  createdBy?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}) => {
  const queryParams = new URLSearchParams();
  
  if (params?.projectName) queryParams.append('projectName', params.projectName);
  if (params?.projectManager) queryParams.append('projectManager', params.projectManager);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.priority) queryParams.append('priority', params.priority);
  if (params?.createdBy) queryParams.append('createdBy', params.createdBy);
  if (params?.assignedTo) queryParams.append('assignedTo', params.assignedTo);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  
  const queryString = queryParams.toString();
  const url = queryString ? `${Projects_API}?${queryString}` : Projects_API;
  
  const response = await api.get(url);
  return response.data;
};

// Get a project by id
export const getProjectById = async (projectId: string) => {
  const response = await api.get(`${Projects_API}/${projectId}`);
  return response.data;
};

// Update a project
export const updateProject = async (projectId: string, projectData: any) => {
  const response = await api.patch(`${Projects_API}/${projectId}`, projectData);
  return response.data;
};

// Delete a project
export const deleteProject = async (projectId: string) => {
  const response = await api.delete(`${Projects_API}/${projectId}`);
  return response.data;
};