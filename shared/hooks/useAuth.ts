import { useState } from 'react';
import { loginUser, logoutUser, registerUser } from '../lib/auth';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
}

export function useAuth() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const login = async (credentials: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const userData = await loginUser(credentials);
      setUser(userData?.user);
      setLoading(false);
      return userData;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
      setUser(null);
      setLoading(false);
      return null;
    }
  };

  const register = async (userData: any) => {
    setLoading(true);
    setError(null);
    try {
      const registeredUser = await registerUser(userData);
      setUser(registeredUser);
      // setUser(registeredUser.user || null);
      setLoading(false);
      return registeredUser;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
      setUser(null);
      setLoading(false);
      return null;
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await logoutUser();
    } catch (err) {
      console.warn('Logout API failed, clearing local data anyway');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
      router.push('/');
    }
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    setUser,
  };
} 