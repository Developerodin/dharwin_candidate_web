import api from './api';
import { Recruiter_Activities_API } from './constants';

// Get activity logs with filters
export const getRecruiterActivityLogs = async (params?: {
  recruiterId?: string;
  activityType?: string;
  startDate?: string;
  endDate?: string;
  jobId?: string;
  candidateId?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}) => {
  const queryParams = new URLSearchParams();
  
  if (params?.recruiterId) queryParams.append('recruiterId', params.recruiterId);
  if (params?.activityType) queryParams.append('activityType', params.activityType);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.jobId) queryParams.append('jobId', params.jobId);
  if (params?.candidateId) queryParams.append('candidateId', params.candidateId);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const queryString = queryParams.toString();
  const url = `${Recruiter_Activities_API}/logs${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get(url);
  return response.data;
};

// Get activity logs summary
export const getRecruiterActivitySummary = async (params?: {
  recruiterId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const queryParams = new URLSearchParams();
  
  if (params?.recruiterId) queryParams.append('recruiterId', params.recruiterId);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  
  const queryString = queryParams.toString();
  const url = `${Recruiter_Activities_API}/logs/summary${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get(url);
  return response.data;
};

// Get activity statistics
export const getRecruiterActivityStatistics = async (params?: {
  recruiterId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const queryParams = new URLSearchParams();
  
  if (params?.recruiterId) queryParams.append('recruiterId', params.recruiterId);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  
  const queryString = queryParams.toString();
  const url = `${Recruiter_Activities_API}/logs/statistics${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get(url);
  return response.data;
};

