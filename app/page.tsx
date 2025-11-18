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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    try {
        const res = await login({ email, password });
        await Swal.fire({
          icon: 'success',
          title: 'Login Successful',
          text: res.message,
          timer: 1000,
          timerProgressBar: true,
          showConfirmButton: false
        });
        router.push('/dashboard');
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

  const handleForgotPassword = async () => {
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
                            onClick={handleForgotPassword}
                            disabled={forgotPasswordLoading}
                            className="float-right text-danger bg-transparent border-none cursor-pointer hover:underline"
                          >
                            {forgotPasswordLoading ? 'Sending...' : 'Forget password ?'}
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

                  {/* API Response Display */}
                  {forgotPasswordResponse && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                      <h6 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                        Forgot Password API Response:
                      </h6>
                      <pre className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 p-3 rounded border overflow-auto max-h-40">
                        {forgotPasswordResponse}
                      </pre>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </body>
    </html>
    </>
  );
}
