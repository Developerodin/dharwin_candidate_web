'use client';

import { useState, useEffect } from 'react';
import { HiEye, HiEyeOff } from 'react-icons/hi';
import Swal from 'sweetalert2';
import { useSearchParams } from 'next/navigation';
import { registerCandidate } from '@/shared/lib/candidates';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  countryCode?: string;
  password?: string;
  confirmPassword?: string;
}

export default function CandidateOnboardLayout() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    countryCode: 'IN',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Simple decryption function (must match the encryption method used in share-candidate-form)
  const decryptData = (encryptedData: string): string => {
    try {
      // Using base64 decoding as a simple decryption method
      // Replace this with your actual decryption method
      return atob(encryptedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  };

  // Validate secure token on component mount
  useEffect(() => {
    const validateToken = () => {
      const token = searchParams.get('token');
      const encryptedEmail = searchParams.get('email');
      const expires = searchParams.get('expires');
      const encryptedAdminId = searchParams.get('adminId');

      // Decrypt the secure parameters
      const email = encryptedEmail ? decryptData(encryptedEmail) : '';
      const adminId = encryptedAdminId ? decryptData(encryptedAdminId) : '';

      if (!token || !email || !expires) {
        setTokenError('Invalid or missing security parameters');
        return;
      }

      // Check if token has expired
      const expirationTime = parseInt(expires);
      const currentTime = Date.now();
      
      if (currentTime > expirationTime) {
        setTokenError('This link has expired. Please request a new onboarding link.');
        return;
      }

      // Basic token format validation
      if (!token.includes('_') || token.split('_').length !== 3) {
        setTokenError('Invalid token format');
        return;
      }

      // Set email from decrypted URL parameter
      setFormData(prev => ({
        ...prev,
        email: email
      }));

      setIsValidToken(true);
    };

    validateToken();
  }, [searchParams]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone number validation with country code support
    const validatePhone = (phone: string, countryCode: string = "IN"): boolean => {
      if (countryCode === "IN") {
        // Indian mobile number: 10 digits starting with 6-9
        const phoneRegex = /^[6-9]\d{9}$/;
        return phoneRegex.test(phone);
      } else if (countryCode === "US") {
        // US phone number: 10 digits
        const phoneRegex = /^\d{10}$/;
        return phoneRegex.test(phone);
      }
      return false;
    };

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!validatePhone(formData.phoneNumber.replace(/\s/g, ''), formData.countryCode)) {
      const countryName = formData.countryCode === "IN" ? "Indian" : "US";
      newErrors.phoneNumber = `Please enter a valid ${countryName} phone number`;
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsLoading(true);
      try {
        // Get admin ID from URL parameters
        const encryptedAdminId = searchParams.get('adminId');
        const adminId = encryptedAdminId ? decryptData(encryptedAdminId) : '';
        
        // Prepare registration data
        const registrationData = {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          password: formData.password,
          role: "user",
          phoneNumber: formData.phoneNumber, // Store phone number without prefix
          countryCode: formData.countryCode, // Include country code
          adminId: adminId
        };

        console.log('Submitting registration data:', registrationData);
        
        // Use the existing candidates lib function
        const result = await registerCandidate(registrationData);
        
        // Show success message with API response data
        await Swal.fire({
          title: 'Registration Successful!',
          html: `
            <div style="text-align: left; line-height: 1.6;">
              <p style="margin-bottom: 15px; font-size: 16px;">
                Welcome to Dharwin, <strong>${formData.firstName} ${formData.lastName}</strong>!
              </p>
              <p style="margin-bottom: 15px; font-size: 14px; color: #666;">
                Your account has been created successfully. ${result.message || 'We\'ve sent a verification email to:'}
              </p>
              <p style="margin-bottom: 20px; font-size: 14px; font-weight: 600; color: #36af4c;">
                ${formData.email}
              </p>
              ${result.userId ? `
                <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin-bottom: 15px;">
                  <p style="margin: 0; font-size: 14px; color: #0c4a6e;">
                    <strong>Your User ID:</strong> ${result.userId}
                  </p>
                </div>
              ` : ''}
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #36af4c;">
                <p style="margin: 0; font-size: 14px; color: #374151;">
                  <strong>Next Steps:</strong>
                </p>
                <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #6b7280;">
                  <li>Check your email and click the verification link</li>
                  <li>Login and complete your profile to get matched with opportunities</li>
                  <li>Start applying to jobs that match your skills</li>
                </ul>
              </div>
            </div>
          `,
          icon: 'success',
          iconColor: '#36af4c',
          confirmButtonText: 'Got it!',
          confirmButtonColor: '#36af4c',
          width: '500px',
          padding: '2rem',
          customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            confirmButton: 'swal2-confirm-custom'
          }
        });
        
        // Reset form after successful submission
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          countryCode: 'IN',
          password: '',
          confirmPassword: ''
        });
        
      } catch (error: any) {
        // Handle specific error cases
        if (error?.response?.data?.code === 400 && error?.response?.data?.message === "Email already taken") {
          // Show special message for existing users
          await Swal.fire({
            title: 'Account Already Exists',
            html: `
              <div style="text-align: left; line-height: 1.6;">
                <p style="margin-bottom: 15px; font-size: 16px;">
                  Welcome back! It looks like you already have an account with us.
                </p>
                <p style="margin-bottom: 20px; font-size: 14px; color: #36af4c; font-weight: 600;">
                  ${formData.email}
                </p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #36af4c;">
                  <p style="margin: 0 0 10px 0; font-size: 14px; color: #374151; font-weight: 600;">
                    Ready to continue your journey?
                  </p>
                  <p style="margin: 0; font-size: 13px; color: #6b7280;">
                    Click the button below to login and access your account.
                  </p>
                </div>
              </div>
            `,
            icon: 'info',
            iconColor: '#36af4c',
            confirmButtonText: 'Go to Login',
            confirmButtonColor: '#36af4c',
            showCancelButton: true,
            cancelButtonText: 'Stay Here',
            cancelButtonColor: '#6b7280',
            width: '500px',
            padding: '2rem',
            customClass: {
              popup: 'swal2-popup-custom',
              title: 'swal2-title-custom',
              confirmButton: 'swal2-confirm-custom'
            }
          }).then((result) => {
            if (result.isConfirmed) {
              // Redirect to login page
              window.location.href = '/';
            }
          });
        } else {
          // Handle other error cases
          const errorMessage = error?.response?.data?.message || error?.message || 'Something went wrong. Please try again.';
          await Swal.fire({
            title: 'Registration Failed',
            text: errorMessage,
            icon: 'error',
            confirmButtonText: 'Try Again',
            confirmButtonColor: '#ef4444'
          });
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Show error message if token is invalid
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
            <p className="text-red-700 mb-4">{tokenError}</p>
            <p className="text-sm text-red-600">
              Please contact the person who sent you this link to request a new one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while validating token
  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#36af4c] mx-auto mb-4"></div>
          <p className="text-gray-600">Validating secure access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Column - White Background */}
      <div className="flex-1 bg-white flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 xl:p-12">
        {/* Header */}
        <div className="mb-3">
          <img src="/assets/images/company-logos/logo.jpeg" alt="logo" className='w-32 sm:w-40' />
          <div className="flex items-center space-x-2 sm:space-x-3 mt-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>Candidate Registration Portal</h1>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center w-full max-w-md">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            Find better jobs—faster
          </h1>
          
          <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 leading-relaxed">
            Dharwin is where top talent gathers. Powered by AI and skill intelligence, we connect you to the right opportunities—accurately, privately, and without the noise.
          </p>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-[#36af4c] focus:border-transparent transition-colors text-sm sm:text-base ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your first name"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#36af4c] focus:border-transparent transition-colors ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your last name"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled
                className="w-full px-4 py-3 border rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed border-gray-300"
                placeholder="Email address (pre-filled)"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="flex gap-2">
                <div className="w-24">
                  <select
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-[#36af4c] focus:border-transparent transition-colors ${
                      errors.countryCode ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="IN">🇮🇳 +91</option>
                    <option value="US">🇺🇸 +1</option>
                  </select>
                </div>
                <div className="flex-1">
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#36af4c] focus:border-transparent transition-colors ${
                      errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={formData.countryCode === "IN" ? "Enter your 10-digit phone number" : "Enter your 10-digit phone number"}
                    maxLength={10}
                  />
                </div>
              </div>
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-[#36af4c] focus:border-transparent transition-colors ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <HiEyeOff className="w-5 h-5" />
                  ) : (
                    <HiEye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-[#36af4c] focus:border-transparent transition-colors ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <HiEyeOff className="w-5 h-5" />
                  ) : (
                    <HiEye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-6 rounded-lg font-medium focus:ring-2 focus:ring-[#36af4c] focus:ring-offset-2 transition-colors flex items-center justify-center ${
                isLoading 
                  ? 'bg-[#36af4c]/70 text-white cursor-not-allowed' 
                  : 'bg-[#36af4c] text-white hover:bg-[#2d8a3f]'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-[#36af4c] rounded-full"></div>
            <span className="text-sm font-medium text-gray-900">PROFESSIONAL PLATFORM</span>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            By continuing, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>
          
          <div className="flex justify-between items-end">
            <p className="text-sm text-gray-600">
              2025 Dharwin. All rights reserved.
            </p>
            <span className="text-sm text-gray-400">v2.0</span>
          </div>
        </div>
      </div>

      {/* Right Column - Purple Gradient Background */}
      <div className="flex-1 bg-gradient-to-br from-[#093464] to-[#0a4a7a] p-4 sm:p-6 lg:p-8 xl:p-12 flex flex-col justify-between">
        {/* Header Badges */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-2">
          <div className="bg-[#093464]/80 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center space-x-1 sm:space-x-2">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs sm:text-sm font-medium text-white">ALL EXPERIENCE LEVELS</span>
          </div>
          <div className="bg-[#093464]/80 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center space-x-1 sm:space-x-2">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs sm:text-sm font-medium text-white">ALL INDUSTRIES WELCOME</span>
          </div>
          <div className="bg-[#093464]/80 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center space-x-1 sm:space-x-2">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-xs sm:text-sm font-medium text-white">PRIVATE & SECURE</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-4 sm:mb-6">
            Where top talent meets top opportunities.
          </h2>
          
          <p className="text-sm sm:text-base lg:text-lg text-blue-100 mb-6 sm:mb-8 leading-relaxed">
            Dharwin uses AI and skill intelligence to cut through the noise. Apply once → get matched to roles that fit your skills. Stay visible to verified employers only. Move faster with no ghosting, no wasted time.
          </p>
          
          <p className="text-sm sm:text-base lg:text-lg text-white font-medium mb-6 sm:mb-8">
            Create your profile. See roles. Apply fast.
          </p>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-[#093464]/80 p-3 sm:p-6 rounded-xl">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2">10K+</div>
              <div className="text-xs sm:text-sm text-blue-100">Candidates placed faster</div>
            </div>
            <div className="bg-[#093464]/80 p-3 sm:p-6 rounded-xl">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1 sm:mb-2">500+</div>
              <div className="text-xs sm:text-sm text-blue-100">Companies hiring smarter</div>
            </div>
          </div>

          {/* Testimonial Card */}
          <div className="bg-[#093464]/80 p-4 sm:p-6 rounded-xl mb-6 sm:mb-8">
            <div className="flex items-start space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#36af4c] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm sm:text-base">RS</span>
              </div>
              <div>
                <p className="text-white mb-2 sm:mb-3 leading-relaxed text-sm sm:text-base">
                  "With Dharwin, I stopped spraying resumes. I was matched to roles that fit my skills—and landed two offers in 3 weeks."
                </p>
                <div>
                  <div className="text-white font-semibold text-sm sm:text-base">Rahul Sharma</div>
                  <div className="text-blue-200 text-xs sm:text-sm">Software Engineer</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted by Section */}
        <div>
          <p className="text-white mb-3 sm:mb-4 text-sm sm:text-base">Trusted by</p>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="bg-[#093464]/80 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <span className="text-xs sm:text-sm font-medium text-white">Startups</span>
            </div>
            <div className="bg-[#093464]/80 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <span className="text-xs sm:text-sm font-medium text-white">Tech Giants</span>
            </div>
            <div className="bg-[#093464]/80 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <span className="text-xs sm:text-sm font-medium text-white">Fortune 500</span>
            </div>
            <div className="bg-[#093464]/80 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
              <span className="text-xs sm:text-sm font-medium text-white">SMEs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
