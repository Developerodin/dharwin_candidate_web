"use client"
import React, { useState, useRef } from 'react';
import Swal from 'sweetalert2';
import { onboardCandidate } from '@/shared/lib/candidates';
import * as XLSX from 'xlsx';

interface EmailData {
  id: string;
  email: string;
  url?: string;
}

const ShareCandidateForm = () => {
  const [emails, setEmails] = useState<EmailData[]>([{ id: '1', email: '' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [importMode, setImportMode] = useState<'manual' | 'excel'>('manual');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleEmailChange = (id: string, value: string) => {
    setEmails(prev => prev.map(email => 
      email.id === id ? { ...email, email: value } : email
    ));
  };

  const addEmailField = () => {
    const newId = (emails.length + 1).toString();
    setEmails(prev => [...prev, { id: newId, email: '' }]);
  };

  const removeEmailField = (id: string) => {
    if (emails.length > 1) {
      setEmails(prev => prev.filter(email => email.id !== id));
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateAllEmails = () => {
    const validEmails = emails.filter(email => email.email.trim() && validateEmail(email.email));
    return validEmails;
  };

  const handleShare = async () => {
    // Validate emails
    const validEmails = validateAllEmails();
    
    if (validEmails.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Email Required',
        text: 'Please enter at least one valid candidate email address.',
        confirmButtonColor: '#36af4c'
      });
      return;
    }

    // Check for invalid emails
    const invalidEmails = emails.filter(email => email.email.trim() && !validateEmail(email.email));
    if (invalidEmails.length > 0) {
      await Swal.fire({
        icon: 'error',
        title: 'Invalid Email(s)',
        text: `Please enter valid email addresses for: ${invalidEmails.map(e => e.email).join(', ')}`,
        confirmButtonColor: '#36af4c'
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

    setIsLoading(true);

    try {
      // Encrypt the admin ID for secure URL
      const encryptedAdminId = encryptData(userId);
      const baseUrl = window.location.origin;
      
      // Generate onboarding URLs for all valid emails
      const emailData = validEmails.map(email => {
        const secureToken = generateSecureToken();
        const encryptedEmail = encryptData(email.email);
        const onboardingUrl = `${baseUrl}/candidate-onboard?token=${secureToken}&adminId=${encryptedAdminId}&email=${encryptedEmail}&expires=${Date.now() + (24 * 60 * 60 * 1000)}`;
        
        return {
          email: email.email,
          onboardUrl: onboardingUrl
        };
      });
      
      // Call onboardCandidate API for each email
      const apiResponses = await Promise.all(
        emailData.map(data => onboardCandidate(data))
      );
      
      // Check if all API calls were successful
      const successfulResponses = apiResponses.filter(response => 
        response.message && response.message.includes('successfully')
      );
      
      if (successfulResponses.length > 0) {
        // Generate HTML for multiple URLs
        const urlsHtml = emailData.map((data, index) => {
          const response = apiResponses[index];
          return `
            <div style="margin-bottom: 15px; padding: 10px; background: #f8fafc; border-radius: 6px; border-left: 4px solid #36af4c;">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #36af4c;">
                ${data.email}
              </p>
              <div style="background: #ffffff; padding: 8px; border-radius: 4px; border: 1px solid #e5e7eb; word-break: break-all; font-size: 11px; color: #6b7280; margin-bottom: 8px;">
                ${data.onboardUrl}
              </div>
              <button 
                onclick="navigator.clipboard.writeText('${data.onboardUrl}'); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy URL', 2000);"
                style="background: #36af4c; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer;"
              >
                Copy URL
              </button>
            </div>
          `;
        }).join('');
        
        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          html: `
            <div style="text-align: left; line-height: 1.6;">
              <p style="margin-bottom: 15px; font-size: 16px;">
                Successfully sent onboarding links to ${successfulResponses.length} candidate(s)!
              </p>
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #36af4c;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #374151; font-weight: 600;">
                  Generated Onboarding URLs:
                </p>
                ${urlsHtml}
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
                Each candidate can use their secure link to access the onboarding form. Links expire in 24 hours.
              </p>
            </div>
          `,
          confirmButtonText: 'Got it!',
          confirmButtonColor: '#36af4c',
          width: '700px',
          padding: '2rem'
        });

        // Reset form
        setEmails([{ id: '1', email: '' }]);
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Send Failed',
          text: 'Failed to send onboarding emails. Please try again.',
          confirmButtonColor: '#dc3545'
        });
      }
    } catch (error: any) {
      console.error('Error calling onboardCandidate API:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Send Failed',
        text: error?.message || 'An error occurred while sending the onboarding link. Please try again.',
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

  const copyAllUrls = () => {
    const validEmails = validateAllEmails();
    if (validEmails.length > 0) {
      // This would need to be implemented with the actual URLs
      // For now, we'll show a message
      Swal.fire({
        icon: 'info',
        title: 'Copy All URLs',
        text: 'Use the individual copy buttons for each URL.',
        confirmButtonColor: '#36af4c'
      });
    }
  };

  // Excel file parsing functions
  const parseExcelFile = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Extract emails from the data
          const emails: string[] = [];
          
          jsonData.forEach((row: any) => {
            if (Array.isArray(row)) {
              row.forEach((cell: any) => {
                if (typeof cell === 'string' && validateEmail(cell.trim())) {
                  emails.push(cell.trim());
                }
              });
            } else if (typeof row === 'object') {
              Object.values(row).forEach((value: any) => {
                if (typeof value === 'string' && validateEmail(value.trim())) {
                  emails.push(value.trim());
                }
              });
            }
          });
          
          // Remove duplicates
          const uniqueEmails = Array.from(new Set(emails));
          resolve(uniqueEmails);
        } catch (error) {
          reject(new Error('Failed to parse Excel file. Please ensure it contains valid email addresses.'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read the file.'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (!allowedTypes.includes(file.type)) {
      await Swal.fire({
        icon: 'error',
        title: 'Invalid File Type',
        text: 'Please upload an Excel file (.xlsx, .xls) or CSV file.',
        confirmButtonColor: '#36af4c'
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      await Swal.fire({
        icon: 'error',
        title: 'File Too Large',
        text: 'Please upload a file smaller than 5MB.',
        confirmButtonColor: '#36af4c'
      });
      return;
    }
    
    try {
      setIsLoading(true);
      const extractedEmails = await parseExcelFile(file);
      
      if (extractedEmails.length === 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'No Emails Found',
          text: 'No valid email addresses were found in the uploaded file.',
          confirmButtonColor: '#36af4c'
        });
        return;
      }
      
      // Convert to EmailData format
      const emailData: EmailData[] = extractedEmails.map((email, index) => ({
        id: (index + 1).toString(),
        email: email
      }));
      
      setEmails(emailData);
      
      await Swal.fire({
        icon: 'success',
        title: 'Import Successful!',
        html: `
          <div style="text-align: left; line-height: 1.6;">
            <p style="margin-bottom: 15px; font-size: 16px;">
              Successfully imported <strong>${extractedEmails.length}</strong> email address${extractedEmails.length !== 1 ? 'es' : ''} from the Excel file.
            </p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #36af4c;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #374151; font-weight: 600;">
                Imported Emails:
              </p>
              <div style="max-height: 200px; overflow-y: auto; background: #ffffff; padding: 10px; border-radius: 6px; border: 1px solid #e5e7eb;">
                ${extractedEmails.map(email => `<div style="padding: 2px 0; font-size: 12px; color: #6b7280;">${email}</div>`).join('')}
              </div>
            </div>
            <p style="margin-top: 15px; font-size: 13px; color: #6b7280;">
              You can now review and edit the imported emails before sending the onboarding links.
            </p>
          </div>
        `,
        confirmButtonText: 'Got it!',
        confirmButtonColor: '#36af4c',
        width: '600px',
        padding: '2rem'
      });
      
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Import Failed',
        text: error.message || 'Failed to import the Excel file. Please try again.',
        confirmButtonColor: '#dc3545'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const downloadTemplate = () => {
    // Create a sample Excel file with email addresses
    const sampleData = [
      ['Email Address'],
      ['john.doe@example.com'],
      ['jane.smith@example.com'],
      ['candidate@company.com']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Email List');
    
    XLSX.writeFile(wb, 'candidate_email_template.xlsx');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Form Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Share Candidate Onboarding Forms
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Send personalized candidate onboarding form links to multiple candidates via email. Each candidate will receive their unique secure link to complete the onboarding process.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="space-y-6">
            {/* Import Mode Toggle */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Input Method:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setImportMode('manual')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      importMode === 'manual'
                        ? 'bg-[#36af4c] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <i className="ri-edit-line mr-2"></i>
                    Manual Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('excel')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      importMode === 'excel'
                        ? 'bg-[#36af4c] text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <i className="ri-file-excel-line mr-2"></i>
                    Excel Import
                  </button>
                </div>
              </div>
              
              {importMode === 'excel' && (
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center px-3 py-2 border border-[#093464] text-sm font-medium rounded-lg text-[#093464] bg-white hover:bg-[#093464] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#093464] transition-colors duration-200"
                >
                  <i className="ri-download-line mr-1"></i>
                  Download Template
                </button>
              )}
            </div>

            {/* Manual Entry Mode */}
            {importMode === 'manual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Candidate Email Addresses
                </label>
              <div className="space-y-3">
                {emails.map((emailData, index) => (
                  <div key={emailData.id} className="flex items-center space-x-2">
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className="ri-mail-line text-gray-400 text-lg"></i>
                      </div>
                      <input
                        type="email"
                        value={emailData.email}
                        onChange={(e) => handleEmailChange(emailData.id, e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={`Enter candidate ${index + 1}'s email address`}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#36af4c] focus:border-[#36af4c] transition-colors duration-200 text-gray-900 placeholder-gray-500"
                        disabled={isLoading}
                      />
                    </div>
                    {emails.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEmailField(emailData.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        disabled={isLoading}
                      >
                        <i className="ri-delete-bin-line text-lg"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Add Email Button */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={addEmailField}
                  className="inline-flex items-center px-3 py-2 border border-[#36af4c] text-sm font-medium rounded-lg text-[#36af4c] bg-white hover:bg-[#36af4c] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#36af4c] transition-colors duration-200"
                  disabled={isLoading}
                >
                  <i className="ri-add-line mr-1"></i>
                  Add Another Email
                </button>
              </div>
              
                <p className="mt-2 text-sm text-gray-500">
                  Each candidate will receive an email with their unique onboarding form link.
                </p>
              </div>
            )}

            {/* Excel Import Mode */}
            {importMode === 'excel' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Excel File with Email Addresses
                </label>
                
                {/* File Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
                    isDragOver
                      ? 'border-[#36af4c] bg-[#36af4c]/5'
                      : 'border-gray-300 hover:border-[#36af4c] hover:bg-gray-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-[#36af4c]/10 rounded-full flex items-center justify-center">
                      <i className="ri-file-excel-line text-2xl text-[#36af4c]"></i>
                    </div>
                    
                    <div>
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        {isDragOver ? 'Drop your Excel file here' : 'Drag and drop your Excel file here'}
                      </p>
                      <p className="text-sm text-gray-600 mb-4">
                        or click to browse files
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center px-4 py-2 border border-[#36af4c] text-sm font-medium rounded-lg text-[#36af4c] bg-white hover:bg-[#36af4c] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#36af4c] transition-colors duration-200"
                        disabled={isLoading}
                      >
                        <i className="ri-upload-line mr-2"></i>
                        Choose File
                      </button>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      <p>Supported formats: .xlsx, .xls, .csv</p>
                      <p>Maximum file size: 5MB</p>
                    </div>
                  </div>
                </div>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                
                {/* Imported Emails Display */}
                {emails.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700">
                        Imported Email Addresses ({emails.length})
                      </h3>
                      <button
                        type="button"
                        onClick={() => setEmails([{ id: '1', email: '' }])}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Clear All
                      </button>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                      {emails.map((emailData, index) => (
                        <div key={emailData.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500 w-6">#{index + 1}</span>
                            <span className="text-sm text-gray-900">{emailData.email}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEmailField(emailData.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors duration-200"
                          >
                            <i className="ri-delete-bin-line text-sm"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="mt-4 text-sm text-gray-500">
                  Upload an Excel file containing email addresses. The system will automatically extract and validate all email addresses from the file.
                </p>
              </div>
            )}

            {/* Share Button */}
            <div className="pt-4">
              <button
                onClick={handleShare}
                disabled={isLoading || validateAllEmails().length === 0}
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[#36af4c] hover:bg-[#2d8a3f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#36af4c] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
                    Send Onboarding Form Links ({validateAllEmails().length} email{validateAllEmails().length !== 1 ? 's' : ''})
                  </>
                )}
              </button>
            </div>

            {/* Additional Information */}
            <div className="bg-[#093464]/10 border border-[#093464]/20 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <i className="ri-information-line text-[#093464] text-lg"></i>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-[#093464]">
                    What happens when you send the links?
                  </h3>
                  <div className="mt-2 text-sm text-[#093464]/80">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Each candidate will receive a unique email with their personalized onboarding form link</li>
                      <li>They can click their link to access the candidate onboarding form</li>
                      <li>Each link is secure and expires in 24 hours</li>
                      <li>You can manually add email addresses or import them from an Excel file</li>
                      <li>Excel import supports .xlsx, .xls, and .csv files up to 5MB</li>
                      <li>You will receive confirmation for each successfully sent link</li>
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
            This form is for sharing personalized candidate onboarding form links with multiple new candidates.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareCandidateForm;