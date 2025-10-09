"use client";
import api from './api';
import { Login_User_API, Logout_User_API, Register_User_API } from './constants';

// Login user
export const loginUser = async (credentials: { email: string; password: string }) => {
  const response = await api.post(Login_User_API, credentials);
  const data = response.data;

  if (data?.tokens) {
    localStorage.setItem('token', data.tokens.access.token);
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
  const response = await api.post(Logout_User_API);
  // Dispatch custom event to notify components of user change
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('userChanged'));
  }
  return response.data;
};