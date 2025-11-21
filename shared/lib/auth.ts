"use client";
import api from './api';
import { Login_User_API, Logout_User_API, Register_User_API, REGISTER_SUPERVISOR_API, REGISTER_RECRUITER_API } from './constants';

// Login user
export const loginUser = async (credentials: { email: string; password: string }) => {
  const response = await api.post(Login_User_API, credentials);
  const data = response.data;

  if (data?.tokens) {
    localStorage.setItem('token', data.tokens.access.token);
    if (data.tokens.refresh?.token) {
      localStorage.setItem('refreshToken', data.tokens.refresh.token);
    }
  }
  if (data?.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
    // Dispatch custom event to notify components of user change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('userChanged'));
    }
  }
  return data;
};

// Register user
export const registerUser = async (userData: any) => {
  const response = await api.post(Register_User_API, userData);
  return response.data;
}; 

// Logout user
export const logoutUser = async () => {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
  
  if (!refreshToken) {
    throw new Error('Refresh token not found');
  }
  
  const response = await api.post(Logout_User_API, { refreshToken });
  // Dispatch custom event to notify components of user change
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('userChanged'));
  }
  return response.data;
};


// Register supervisor
export const registerSupervisor = async (supervisorData: any) => {
  const response = await api.post(REGISTER_SUPERVISOR_API, supervisorData);
  return response.data;
};

// Register recruiter
export const registerRecruiter = async (recruiterData: any) => {
  const response = await api.post(REGISTER_RECRUITER_API, recruiterData);
  return response.data;
};