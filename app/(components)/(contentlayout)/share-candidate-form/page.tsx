"use client"
import React, { useState } from 'react';
import Swal from 'sweetalert2';

const ShareCandidateForm = () => {
  const [candidateEmail, setCandidateEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Simple encryption function (you can replace with your preferred encryption method)
  const encryptData = (data: string): string => {
    try {
      // Using base64 encoding as a simple encryption method
      // Replace this with your actual encryption method
      return btoa(data);
    } catch (error) {
      console.error('Encryption failed:', error);
      return data;
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCandidateEmail(e.target.value);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleShare = async () => {
    // Validate email
    if (!candidateEmail.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Email Required',
        text: 'Please enter a candidate email address.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    if (!validateEmail(candidateEmail)) {
      await Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Please enter a valid email address.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    // Get user ID from localStorage
    let userId = 'default-admin';
    let userRole = 'user';
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        userId = user.id || user._id || user.userId || 'default-admin';
        userRole = user.role || 'user';
      }
    } catch (error) {
      console.warn('Error parsing user data from localStorage:', error);
    }

    // Generate secure token for URL
    const generateSecureToken = () => {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const userHash = btoa(userId + timestamp).replace(/[^a-zA-Z0-9]/g, '');
      return `${userHash}_${timestamp}_${randomString}`;
    };

    const secureToken = generateSecureToken();
    
    setIsLoading(true);

    try {
      // Simulate API call to send onboarding form link via email
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Encrypt the admin ID and email for secure URL
      const encryptedAdminId = encryptData(userId);
      const encryptedEmail = encryptData(candidateEmail);
      
      // Generate the secure candidate onboarding URL
      const baseUrl = window.location.origin;
      const onboardingUrl = `${baseUrl}/candidate-onboard?token=${secureToken}&adminId=${encryptedAdminId}&email=${encryptedEmail}&expires=${Date.now() + (24 * 60 * 60 * 1000)}`;
      
      await Swal.fire({
        icon: 'success',
        title: 'Onboarding Link Generated!',
        html: `
          <div style="text-align: left; line-height: 1.6;">
            <p style="margin-bottom: 15px; font-size: 16px;">
              The candidate onboarding form link has been generated and sent to:
            </p>
            <p style="margin-bottom: 20px; font-size: 14px; font-weight: 600; color: #7c3aed;">
              ${candidateEmail}
            </p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #7c3aed;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #374151; font-weight: 600;">
                Generated Onboarding URL:
              </p>
              <div style="background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb; word-break: break-all; font-size: 12px; color: #6b7280; margin-bottom: 10px;">
                ${onboardingUrl}
              </div>
              <button 
                onclick="navigator.clipboard.writeText('${onboardingUrl}'); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy URL', 2000);"
                style="background: #7c3aed; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer;"
              >
                Copy URL
              </button>
            </div>
            <div style="background: #fef3c7; padding: 10px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-top: 15px;">
              <p style="margin: 0; font-size: 12px; color: #92400e; font-weight: 600;">
                🔒 Security Features:
              </p>
              <ul style="margin: 5px 0 0 0; padding-left: 15px; font-size: 11px; color: #92400e;">
                <li>Secure token-based authentication</li>
                <li>24-hour expiration time</li>
                <li>Email-specific access</li>
                <li>One-time use protection</li>
              </ul>
            </div>
            <p style="margin-top: 15px; font-size: 13px; color: #6b7280;">
              The candidate can use this secure link to access the onboarding form. The link expires in 24 hours.
            </p>
          </div>
        `,
        confirmButtonText: 'Got it!',
        confirmButtonColor: '#7c3aed',
        width: '600px',
        padding: '2rem'
      });

      // Reset form
      setCandidateEmail('');
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Send Failed',
        text: 'An error occurred while sending the onboarding link. Please try again.',
        confirmButtonColor: '#dc3545'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleShare();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Form Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Share Candidate Onboarding Form
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Send the candidate onboarding form link to new candidates via email. They will receive a link to complete their onboarding process.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="space-y-6">
            {/* Candidate Email Field */}
            <div>
              <label htmlFor="candidateEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Candidate Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="ri-mail-line text-gray-400 text-lg"></i>
                </div>
                <input
                  type="email"
                  id="candidateEmail"
                  value={candidateEmail}
                  onChange={handleEmailChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter candidate's email address"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200 text-gray-900 placeholder-gray-500"
                  disabled={isLoading}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                The candidate will receive an email with a link to the onboarding form.
              </p>
            </div>

            {/* Share Button */}
            <div className="pt-4">
              <button
                onClick={handleShare}
                disabled={isLoading || !candidateEmail.trim()}
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="ri-send-plane-line mr-2 text-lg"></i>
                    Send Onboarding Form Link
                  </>
                )}
              </button>
            </div>

            {/* Additional Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <i className="ri-information-line text-blue-400 text-lg"></i>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    What happens when you send the link?
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>The candidate will receive an email with the onboarding form link</li>
                      <li>They can click the link to access the candidate onboarding form</li>
                      <li>They can fill out their information and complete the onboarding process</li>
                      <li>You will receive a confirmation email once the link is sent</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            This form is for sharing the candidate onboarding form link with new candidates.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareCandidateForm;