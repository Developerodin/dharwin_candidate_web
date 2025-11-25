import api from './api';
import { Jobs_API } from './constants';

// Create a new job
export const createJob = async (jobData: {
  title: string;
  organisation: {
    name: string;
    website?: string;
    email: string;
    phone?: string;
    address?: string;
    description?: string;
  };
  jobDescription: string;
  jobType: string;
  location: string;
  skillTags: string[];
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  experienceLevel: string;
  status: string;
  templateId?: string;
}) => {
  const response = await api.post(Jobs_API, jobData);
  return response.data;
};

// Get all jobs with optional query parameters
export const getAllJobs = async (params?: {
  title?: string;
  jobType?: string;
  location?: string;
  experienceLevel?: string;
  status?: string;
  createdBy?: string;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}) => {
  const queryParams = new URLSearchParams();
  
  if (params?.title) queryParams.append('title', params.title);
  if (params?.jobType) queryParams.append('jobType', params.jobType);
  if (params?.location) queryParams.append('location', params.location);
  if (params?.experienceLevel) queryParams.append('experienceLevel', params.experienceLevel);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.createdBy) queryParams.append('createdBy', params.createdBy);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const queryString = queryParams.toString();
  const url = queryString ? `${Jobs_API}?${queryString}` : Jobs_API;
  
  const response = await api.get(url);
  return response.data;
};

// Get a job by id
export const getJobById = async (jobId: string) => {
  const response = await api.get(`${Jobs_API}/${jobId}`);
  return response.data;
};

// Update a job
export const updateJob = async (jobId: string, jobData: {
  title?: string;
  organisation?: {
    name?: string;
    website?: string;
    email?: string;
    phone?: string;
    address?: string;
    description?: string;
  };
  jobDescription?: string;
  jobType?: string;
  location?: string;
  skillTags?: string[];
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  experienceLevel?: string;
  status?: string;
  templateId?: string;
}) => {
  const response = await api.patch(`${Jobs_API}/${jobId}`, jobData);
  return response.data;
};

// Delete a job
export const deleteJob = async (jobId: string) => {
  const response = await api.delete(`${Jobs_API}/${jobId}`);
  return response.data;
};

// Export jobs to Excel
export const exportJobsToExcel = async (params?: {
  title?: string;
  jobType?: string;
  location?: string;
  status?: string;
  experienceLevel?: string;
  createdBy?: string;
  search?: string;
}) => {
  const queryParams = new URLSearchParams();

  if (params?.title) queryParams.append('title', params.title);
  if (params?.jobType) queryParams.append('jobType', params.jobType);
  if (params?.location) queryParams.append('location', params.location);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.experienceLevel) queryParams.append('experienceLevel', params.experienceLevel);
  if (params?.createdBy) queryParams.append('createdBy', params.createdBy);
  if (params?.search) queryParams.append('search', params.search);

  const queryString = queryParams.toString();
  const url = queryString ? `${Jobs_API}/export/excel?${queryString}` : `${Jobs_API}/export/excel`;

  const response = await api.get(url, {
    responseType: 'blob',
  });

  return response.data;
};

// Import jobs from Excel
export const importJobsFromExcel = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(`${Jobs_API}/import/excel`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

// Get job statistics (if available)
export const getJobStatistics = async () => {
  const response = await api.get(`${Jobs_API}/statistics`);
  return response.data;
};

// Update job status
export const updateJobStatus = async (jobId: string, status: string) => {
  const response = await api.patch(`${Jobs_API}/${jobId}/status`, { status });
  return response.data;
};

