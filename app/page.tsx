"use client"
import { auth } from "@/shared/firebase/firebaseapi";
import { useAuth } from "@/shared/hooks/useAuth";
import { forgotPassword } from "@/shared/lib/candidates";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Swal from 'sweetalert2';

export default function Home() {
  const { login, loading, error } = useAuth();
  const router = useRouter();

  const [email, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordshow1, setpasswordshow1] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordResponse, setForgotPasswordResponse] = useState<string | null>(null);
  const [showForgotPasswordForm, setShowForgotPasswordForm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    try {
        const res = await login({ email, password });
        if (res && res.user) {
          router.push('/dashboard');
        } else {
          await Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: 'Please check your email and password and try again.',
            confirmButtonText: 'OK'
          });
        }
    } catch (err) {
        console.error('Login failed:', err);
        await Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: 'Please check your email and password and try again.',
          confirmButtonText: 'OK'
        });
    }
  };

  const handleForgotPasswordClick = () => {
    setShowForgotPasswordForm(true);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      await Swal.fire({
        icon: 'warning',
        title: 'Email Required',
        text: 'Please enter your email address first.',
        confirmButtonText: 'OK'
      });
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordResponse(null);
    
    try {
      const response = await forgotPassword(email);
      console.log('Forgot Password API Response:', response);
      
      setForgotPasswordResponse(JSON.stringify(response, null, 2));
      
      await Swal.fire({
        icon: 'success',
        title: 'Reset Email Sent',
        text: 'Please check your email for password reset instructions.',
        confirmButtonText: 'OK'
      });
      
      setShowForgotPasswordForm(false);
    } catch (err: any) {
      console.error('Forgot password failed:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to send reset email';
      setForgotPasswordResponse(`Error: ${errorMessage}`);
      
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleCloseForgotPasswordForm = () => {
    setShowForgotPasswordForm(false);
  };

  return (
    <>
    <html>
      <body>
      <div className="container">
        <div className="flex justify-center authentication authentication-basic items-center h-full text-defaultsize text-defaulttextcolor">
          <div className="grid grid-cols-12">
            <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2"></div>
            <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-6 sm:col-span-8 col-span-12">
              <div className="box !p-[3rem]">
                <div className="box-body" role="tabpanel" id="pills-with-brand-color-01" aria-labelledby="pills-with-brand-color-item-1">
                  <img src="/assets/images/company-logos/logo.jpeg" alt="Logo" className="mb-4" />
                  <p className="h5 font-semibold mb-2 text-center">Sign In</p>
                  {error && 
                    <div className="p-4 mb-4 bg-danger/40 text-sm  border-t-4 border-danger text-danger/60 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
                      {error}
                    </div>
                  }

                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-12 gap-y-4">
                      <div className="xl:col-span-12 col-span-12">
                        <label htmlFor="signin-email" className="form-label text-default">Email</label>
                        <input type="email" name="email" className="form-control form-control-lg w-full !rounded-md" id="email" onChange={e => setUsername(e.target.value)} value={email} />
                      </div>
                      <div className="xl:col-span-12 col-span-12 mb-2">
                        <label htmlFor="signin-password" className="form-label text-default block">
                          Password
                          <button 
                            type="button"
                            onClick={handleForgotPasswordClick}
                            className="float-right text-danger bg-transparent border-none cursor-pointer hover:underline"
                          >
                            Forgot password ?
                          </button>
                        </label>
                        <div className="input-group">
                          <input name="password" type={(passwordshow1) ? 'text' : "password"} value={password} onChange={e => setPassword(e.target.value)} className="form-control  !border-s form-control-lg !rounded-s-md" id="signin-password" placeholder="password" />
                          <button onClick={() => setpasswordshow1(!passwordshow1)} aria-label="button" className="ti-btn ti-btn-light !rounded-s-none !mb-0" type="button" id="button-addon2">
                            <i className={`${passwordshow1 ? 'ri-eye-line' : 'ri-eye-off-line'} align-middle`}></i>
                          </button>
                        </div>
                      </div>
                      <div className="xl:col-span-12 col-span-12 grid mt-0">
                        <button type="submit" className="ti-btn ti-btn-primary !bg-primary !text-white !font-medium">Sign In</button>
                      </div>
                    </div>
                  </form>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Form Modal */}
      {showForgotPasswordForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-default">Forgot Password</h2>
              <button
                onClick={handleCloseForgotPasswordForm}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Close"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleForgotPasswordSubmit}>
              <div className="mb-4">
                <label htmlFor="forgot-password-email" className="form-label text-default block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="forgot-password-email"
                  name="email"
                  className="form-control form-control-lg w-full !rounded-md"
                  value={email}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={forgotPasswordLoading}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseForgotPasswordForm}
                  className="ti-btn ti-btn-light flex-1"
                  disabled={forgotPasswordLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ti-btn ti-btn-primary !bg-primary !text-white !font-medium flex-1"
                  disabled={forgotPasswordLoading}
                >
                  {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </body>
    </html>
    </>
  );
}
