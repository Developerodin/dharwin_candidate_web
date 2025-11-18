import api from './api';
import { Dashboard_API } from './constants';

// Get admin dashboard overview
export const getDashboardData = async () => {
  const response = await api.get(Dashboard_API);
  return response.data;
};

