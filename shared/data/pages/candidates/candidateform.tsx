"use client"
import React, { useState } from "react";
import Select, { Props as SelectProps } from 'react-select';
import { Selectoption4 } from '@/shared/data/pages/candidates/skillsdata';
import { addCandidate, updateCandidate } from "@/shared/lib/candidates";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Wizard Component
const Wizard = ({ step: currentIndex, onChange, onSubmit, children, validateStep, stepValidationErrors, canNavigateToStep }: any) => {
  const steps = React.Children.toArray(children) as React.ReactElement[];
  const prevStep = currentIndex !== 0 && (steps[currentIndex - 1] as any).props;
  const nextStep = currentIndex !== steps.length - 1 && (steps[currentIndex + 1] as any).props;

  const handleNext = () => {
    if (validateStep && !validateStep(currentIndex)) {
      return; // Don't proceed if validation fails
    }
    onChange(currentIndex + 1);
  };

  const handleStepClick = (targetStep: number) => {
    if (canNavigateToStep && !canNavigateToStep(targetStep)) {
      return; // Don't allow navigation if step is not accessible
    }
    onChange(targetStep);
  };

  return (
    <div>
      <nav className="btn-group steps basicsteps">
        {steps.map((step: any, index: number) => {
          const isDisabled = index === currentIndex || (canNavigateToStep && !canNavigateToStep(index));
          return (
            <Button
              key={index}
              onClick={() => handleStepClick(index)}
              className={getClsNavBtn(index === currentIndex, isDisabled)}
              disabled={isDisabled}
            >
              {step.props.title}
            </Button>
          );
        })}
      </nav>

      {steps[currentIndex]}

      <div className="p-3 flex justify-between border-t border-dashed border-defaultborder dark:border-defaultborder/10">
        <Button
          visible={prevStep}
          onClick={() => onChange(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          Back
        </Button>

        {currentIndex === steps.length - 1 ? (
          <button
            type="button"
            onClick={onSubmit}
            className="ti-btn bg-green-600 text-white !py-2 !px-4 !rounded-md"
          >
            Submit
          </button>
        ) : (
          <Button
            visible={nextStep}
            onClick={handleNext}
            disabled={currentIndex === steps.length - 1}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

const Step = ({ children }: any) => children;

function getClsNavBtn(active: boolean, disabled: boolean = false) {
  let className = "btn";
  if (active) className += " active";
  if (disabled) className += " disabled";
  return className;
}

function Button({ visible = true, disabled, ...props }: any) {
  if (!visible) return null;
  return (
    <button
      className="ti-btn ti-btn-primary-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={disabled}
      {...props}
    />
  );
}

// Function to get clickable document thumbnail for supported file types (JPG, JPEG, PNG, PDF)
const getFileThumbnail = (file: File) => {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const fileUrl = URL.createObjectURL(file);
  
  // Image files (JPG, JPEG, PNG) - show actual image
  if (fileType.startsWith('image/') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-16 rounded overflow-hidden border bg-white shadow-sm block hover:shadow-md transition-shadow cursor-pointer"
        title="Click to view image"
      >
        <img 
          src={fileUrl} 
          alt="Document Preview" 
          className="w-full h-full object-cover"
        />
      </a>
    );
  }
  
  // PDF files - show PDF preview
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-16 rounded overflow-hidden border bg-white shadow-sm block hover:shadow-md transition-shadow cursor-pointer relative"
        title="Click to view PDF"
      >
        <iframe
          src={fileUrl + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH'}
          className="w-full h-full border-0 pointer-events-none"
          title="PDF Preview"
          onError={(e) => {
            // Fallback to PDF icon if iframe fails
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div className="w-full h-full bg-red-50 dark:bg-red-900/20 rounded flex items-center justify-center absolute inset-0" style={{display: 'none'}}>
          <div className="text-center">
            <i className="ri-file-pdf-line text-2xl text-red-600 dark:text-red-400 mb-1"></i>
            <div className="text-xs text-red-600 dark:text-red-400">PDF</div>
          </div>
        </div>
      </a>
    );
  }
  
  // Unsupported file type - show generic file icon
  return (
    <div className="w-12 h-16 rounded overflow-hidden border bg-white shadow-sm">
      <div className="w-full h-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-file-line text-2xl text-gray-600 dark:text-gray-400 mb-1"></i>
          <div className="text-xs text-gray-600 dark:text-gray-400">FILE</div>
        </div>
      </div>
    </div>
  );
};

// Function to get clickable document thumbnail for existing files (JPG, JPEG, PNG, PDF only)
const getExistingFileThumbnail = (url: string, label: string) => {
  const fileName = url.toLowerCase();
  const docLabel = (label || '').toLowerCase();
  
  // PDF files - show PDF preview
  if (fileName.includes('.pdf') || docLabel.includes('pdf')) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-16 rounded overflow-hidden border bg-white shadow-sm block hover:shadow-md transition-shadow cursor-pointer relative"
        title="Click to view PDF"
      >
        <iframe
          src={url + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH'}
          className="w-full h-full border-0 pointer-events-none"
          title="PDF Preview"
          onError={(e) => {
            // Fallback to PDF icon if iframe fails
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div className="w-full h-full bg-red-50 dark:bg-red-900/20 rounded flex items-center justify-center absolute inset-0" style={{display: 'none'}}>
          <div className="text-center">
            <i className="ri-file-pdf-line text-2xl text-red-600 dark:text-red-400 mb-1"></i>
            <div className="text-xs text-red-600 dark:text-red-400">PDF</div>
          </div>
        </div>
      </a>
    );
  }
  
  // Image files (JPG, JPEG, PNG) - show actual image
  if (fileName.includes('.jpg') || fileName.includes('.jpeg') || fileName.includes('.png')) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-12 h-16 rounded overflow-hidden border bg-white shadow-sm block hover:shadow-md transition-shadow cursor-pointer relative"
        title="Click to view image"
      >
        <img 
          src={url} 
          alt="Document Preview" 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to image icon if image fails to load
            e.currentTarget.style.display = 'none';
            const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
            if (nextElement) {
              nextElement.style.display = 'flex';
            }
          }}
        />
        <div className="w-full h-full bg-gray-50 dark:bg-gray-700 rounded flex items-center justify-center absolute inset-0" style={{display: 'none'}}>
          <div className="text-center">
            <i className="ri-image-line text-2xl text-gray-600 dark:text-gray-400 mb-1"></i>
            <div className="text-xs text-gray-600 dark:text-gray-400">IMG</div>
          </div>
        </div>
      </a>
    );
  }
  
  // Unsupported file type - show generic file icon
  return (
    <div className="w-12 h-16 rounded overflow-hidden border bg-white shadow-sm">
      <div className="w-full h-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-file-line text-2xl text-gray-600 dark:text-gray-400 mb-1"></i>
          <div className="text-xs text-gray-600 dark:text-gray-400">FILE</div>
        </div>
      </div>
    </div>
  );
};

export const Basicwizard = ({ initialData }: { initialData?: any }) => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Security check for edit permissions
  useEffect(() => {
    const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUser(user);
      
      // If editing existing data, check permissions
      if (initialData) {
        // Admin can edit any profile
        if (user.role === 'admin') {
          return; // Allow access
        }
        
        // Regular users can only edit their own profile
        if (user.role === 'user' && String(user.id) !== String(initialData.owner)) {
          Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            text: 'You can only edit your own profile.',
            confirmButtonText: 'OK'
          }).then(() => {
            router.push('/profile');
          });
          return;
        }
      }
    }
  }, [initialData, router]);

  const [formData, setFormData] = useState({ 
    fullName: "", email: "", phoneNumber: "", shortBio: "", sevisId: "", ead: "", degree: "", supervisorName: "", supervisorContact: "", password: "",
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear individual field error when user starts typing
    clearFieldError(e.target.name);
  };

  // ------------------------------- State: Education -------------------------------

  const [educations, setEducations] = useState([
    { degree: "", institute: "", location: "", startYear: "", endYear: "", description: "" },
  ]);

  const handleAddEducation = () => {
    setEducations([
      ...educations,
      { degree: "", institute: "", location: "", startYear: "", endYear: "", description: "" },
    ]);
  };

  const handleEducationChange = (index: number, field: string, value: string) => {
    const newEducations = [...educations];
    (newEducations[index] as any)[field] = value;
    setEducations(newEducations);
  };

  // ------------------------------- State: Work Experience -------------------------------

  const [experiences, setExperiences] = useState([
    { company: "", role: "", startDate: "", endDate: "", description: "" },
  ]);

  const handleAddExperience = () => {
    setExperiences([
      ...experiences,
      { company: "", role: "", startDate: "", endDate: "", description: "" },
    ]);
  };

  const handleExpChange = (index: number, field: string, value: string) => {
    const newExperiences = [...experiences];
    (newExperiences[index] as any)[field] = value;
    setExperiences(newExperiences);
  };

  // ------------------------------- State: Skills -------------------------------

  const [skills, setSkills] = useState<{id: number, name: string, level: string}[]>([]);

  // ------------------------------- State: Social Links -------------------------------

  const [socialLinks, setSocialLinks] = useState<{id: number, platform: string, url: string}[]>([]);

  const handleAddSkill = () => {
    setSkills([
      ...skills,
      { id: Date.now(), name: "", level: "Beginner" },
    ]);
  };

  const handleSkillChange = (index: number, field: string, value: string) => {
    const newSkills = [...skills];
    (newSkills[index] as any)[field] = value;
    setSkills(newSkills);
  };

  const handleAddSocialLink = () => {
    setSocialLinks([
      ...socialLinks,
      { id: Date.now(), platform: "", url: "" },
    ]);
    // Clear social links error when adding a new link
    clearFieldError('socialLinks');
  };

  const handleSocialLinkChange = (index: number, field: string, value: string) => {
    const newSocialLinks = [...socialLinks];
    (newSocialLinks[index] as any)[field] = value;
    setSocialLinks(newSocialLinks);
    // Clear social links error when user starts typing
    clearFieldError('socialLinks');
  };

  const handleRemoveSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
    // Clear social links error when removing a link
    clearFieldError('socialLinks');
  };

  // ------------------------------- Salary Slips Handlers -------------------------------
  const handleAddSalarySlip = () => {
    setSalarySlips([
      ...salarySlips,
      { id: Date.now(), month: "", year: "", file: null, documentUrl: "" },
    ]);
  };

  const handleSalarySlipChange = (index: number, field: string, value: string | File | null) => {
    const newSalarySlips = [...salarySlips];
    (newSalarySlips[index] as any)[field] = value;
    setSalarySlips(newSalarySlips);
  };

  // Function to validate duplicate month/year combinations
  const validateSalarySlipDuplicates = (slips: any[]) => {
    const combinations = new Set();
    const duplicates: number[] = [];
    
    slips.forEach((slip, index) => {
      if (slip.month && slip.year) {
        const combination = `${slip.month}_${slip.year}`;
        if (combinations.has(combination)) {
          duplicates.push(index);
        } else {
          combinations.add(combination);
        }
      }
    });
    
    return duplicates;
  };

  // ------------------------------- State: Documents -------------------------------

  const [documentsList, setDocumentsList] = useState<{id: number, name: string, customName: string, file: File | null}[]>([]);

  const [existingDocs, setExistingDocs] = useState<{ label: string; url: string }[]>([]);

  const [documents, setDocuments] = useState<{
    cv?: File;
    marksheets?: File;
    certificates?: File;
    experienceLetters?: File;
    other?: File;
  }>({});

  // ------------------------------- State: Salary Slips -------------------------------
  const [salarySlips, setSalarySlips] = useState<{id: number, month: string, year: string, file: File | null, documentUrl: string}[]>([
    { id: 1, month: "", year: "", file: null, documentUrl: "" },
  ]);
  const [existingSalarySlips, setExistingSalarySlips] = useState<{ month: string; year: string; documentUrl: string }[]>([]);

  // ------------------------------- Step Control -------------------------------
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ------------------------------- Validation State -------------------------------
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [stepValidationErrors, setStepValidationErrors] = useState<{[key: number]: string[]}>({});

  // ------------------------------- Validation Functions -------------------------------
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const validateURL = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateRequired = (value: string): boolean => {
    return value.trim() !== '';
  };

  const validateYearRange = (startYear: string, endYear: string): boolean => {
    if (!startYear || !endYear) return true; // Allow empty values, they'll be caught by required validation
    const start = parseInt(startYear);
    const end = parseInt(endYear);
    return start <= end;
  };

  const validateDateRange = (startDate: string, endDate: string): boolean => {
    if (!startDate || !endDate) return true; // Allow empty values, they'll be caught by required validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
  };

  const validateNotFutureDate = (date: string): boolean => {
    if (!date) return true; // Allow empty values, they'll be caught by required validation
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today to allow today's date
    return inputDate <= today;
  };

  // Generate year options from 2000 to current year
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2000; year--) {
      years.push(year);
    }
    return years;
  };

  const validateStep = (stepIndex: number): boolean => {
    const errors: string[] = [];
    const newFieldErrors: {[key: string]: string} = {};
    
    switch (stepIndex) {
      case 0: // Personal Info
        if (!validateRequired(formData.fullName)) {
          errors.push('Full Name is required');
          newFieldErrors['fullName'] = 'Full Name is required';
        }
        if (!validateRequired(formData.email)) {
          errors.push('Email is required');
          newFieldErrors['email'] = 'Email is required';
        } else if (!validateEmail(formData.email)) {
          errors.push('Please enter a valid email address');
          newFieldErrors['email'] = 'Please enter a valid email address';
        }
        if (!validateRequired(formData.phoneNumber)) {
          errors.push('Phone Number is required');
          newFieldErrors['phoneNumber'] = 'Phone Number is required';
        } else if (!validatePhone(formData.phoneNumber)) {
          errors.push('Please enter a valid phone number');
          newFieldErrors['phoneNumber'] = 'Please enter a valid phone number';
        }
        if (formData.supervisorContact && !validatePhone(formData.supervisorContact)) {
          errors.push('Please enter a valid supervisor phone number');
          newFieldErrors['supervisorContact'] = 'Please enter a valid supervisor phone number';
        }
        if (!initialData && !validateRequired(formData.password)) {
          errors.push('Password is required');
          newFieldErrors['password'] = 'Password is required';
        }
        // Validate social links - at least one entry is required
        const validSocialLinks = socialLinks.filter(link => 
          validateRequired(link.platform) && validateRequired(link.url) && validateURL(link.url)
        );
        if (validSocialLinks.length === 0) {
          errors.push('At least one social link is required');
          newFieldErrors['socialLinks'] = 'At least one social link is required';
        }
        break;
        
      case 1: // Qualification
        const validEducations = educations.filter(edu => 
          validateRequired(edu.degree) && validateRequired(edu.institute) && validateRequired(edu.location) && validateRequired(edu.startYear) && validateRequired(edu.endYear)
        );
        if (validEducations.length === 0) {
          errors.push('education required');
          newFieldErrors['education'] = 'education required';
        }
        // Validate year ranges for all educations
        const invalidYearRanges = educations.filter(edu => 
          edu.startYear && edu.endYear && !validateYearRange(edu.startYear, edu.endYear)
        );
        if (invalidYearRanges.length > 0) {
          errors.push('Start year cannot be ahead of end year');
          newFieldErrors['education'] = 'Start year cannot be ahead of end year';
        }
        const validSkills = skills.filter(skill => validateRequired(skill.name));
        if (validSkills.length === 0) {
          errors.push('skill is required');
          newFieldErrors['skills'] = 'skill is required';
        }
        break;
        
      case 2: // Work Experience
        const validExperiences = experiences.filter(exp => 
          validateRequired(exp.company) && validateRequired(exp.role) && validateRequired(exp.startDate) && validateRequired(exp.endDate)
        );
        if (validExperiences.length === 0) {
          errors.push('work experience required');
          newFieldErrors['experience'] = 'work experience required';
        }
        // Validate date ranges for all experiences
        const invalidDateRanges = experiences.filter(exp => 
          exp.startDate && exp.endDate && !validateDateRange(exp.startDate, exp.endDate)
        );
        if (invalidDateRanges.length > 0) {
          errors.push('Start date cannot be ahead of end date');
          newFieldErrors['experience'] = 'Start date cannot be ahead of end date';
        }
        // Validate that end dates are not in the future
        const futureEndDates = experiences.filter(exp => 
          exp.endDate && !validateNotFutureDate(exp.endDate)
        );
        if (futureEndDates.length > 0) {
          errors.push('End date cannot be in the future');
          newFieldErrors['experience'] = 'End date cannot be in the future';
        }
        break;
        
      case 3: // Documents
        const hasNewDocuments = documentsList.some(doc => doc.file && doc.name);
        const hasExistingDocuments = existingDocs.length > 0;
        if (!hasNewDocuments && !hasExistingDocuments) {
          errors.push('document is required');
          newFieldErrors['documents'] = 'document is required';
        }
        break;
        
      case 4: // Salary Slips
        const validSalarySlips = salarySlips.filter(slip => 
          validateRequired(slip.month) && validateRequired(slip.year) && (slip.file || slip.documentUrl)
        );
        const hasExistingSalarySlips = existingSalarySlips.length > 0;
        const hasDuplicates = validateSalarySlipDuplicates(salarySlips).length > 0;
        
        if (validSalarySlips.length === 0 && !hasExistingSalarySlips) {
          errors.push('At least one salary slip is required');
          newFieldErrors['salarySlips'] = 'At least one salary slip is required';
        }
        if (hasDuplicates) {
          errors.push('Duplicate month/year combinations found');
          newFieldErrors['salarySlips'] = 'Duplicate month/year combinations found';
        }
        break;
    }
    
    setStepValidationErrors(prev => ({ ...prev, [stepIndex]: errors }));
    setFieldErrors(prev => ({ ...prev, ...newFieldErrors }));
    return errors.length === 0;
  };

  const clearValidationErrors = () => {
    setFieldErrors({});
    setStepValidationErrors({});
  };

  const clearFieldError = (fieldName: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  // ------------------------------- Step Navigation Validation -------------------------------
  const isStepValid = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Personal Info
        const validSocialLinks = socialLinks.filter(link => 
          validateRequired(link.platform) && validateRequired(link.url) && validateURL(link.url)
        );
        return validateRequired(formData.fullName) && 
               validateRequired(formData.email) && 
               validateEmail(formData.email) &&
               validateRequired(formData.phoneNumber) && 
               validatePhone(formData.phoneNumber) &&
               (!formData.supervisorContact || validatePhone(formData.supervisorContact)) &&
               (initialData || validateRequired(formData.password)) &&
               validSocialLinks.length > 0;
               
      case 1: // Qualification
        const validEducations = educations.filter(edu => 
          validateRequired(edu.degree) && validateRequired(edu.institute) && validateRequired(edu.location) && validateRequired(edu.startYear) && validateRequired(edu.endYear)
        );
        const validSkills = skills.filter(skill => validateRequired(skill.name));
        const invalidYearRanges = educations.filter(edu => 
          edu.startYear && edu.endYear && !validateYearRange(edu.startYear, edu.endYear)
        );
        return validEducations.length > 0 && validSkills.length > 0 && invalidYearRanges.length === 0;
        
      case 2: // Work Experience
        const validExperiences = experiences.filter(exp => 
          validateRequired(exp.company) && validateRequired(exp.role) && validateRequired(exp.startDate) && validateRequired(exp.endDate)
        );
        const invalidDateRanges = experiences.filter(exp => 
          exp.startDate && exp.endDate && !validateDateRange(exp.startDate, exp.endDate)
        );
        const futureEndDates = experiences.filter(exp => 
          exp.endDate && !validateNotFutureDate(exp.endDate)
        );
        return validExperiences.length > 0 && invalidDateRanges.length === 0 && futureEndDates.length === 0;
        
      case 3: // Documents
        const hasNewDocuments = documentsList.some(doc => doc.file && doc.name);
        const hasExistingDocuments = existingDocs.length > 0;
        return hasNewDocuments || hasExistingDocuments;
        
      case 4: // Salary Slips
        const validSalarySlips = salarySlips.filter(slip => 
          validateRequired(slip.month) && validateRequired(slip.year) && (slip.file || slip.documentUrl)
        );
        const hasExistingSalarySlips = existingSalarySlips.length > 0;
        const hasDuplicates = validateSalarySlipDuplicates(salarySlips).length > 0;
        return (validSalarySlips.length > 0 || hasExistingSalarySlips) && !hasDuplicates;
        
      default:
        return false;
    }
  };

  const canNavigateToStep = (targetStep: number): boolean => {
    // Can always go to step 0
    if (targetStep === 0) return true;
    
    // Check if all previous steps are valid
    for (let i = 0; i < targetStep; i++) {
      if (!isStepValid(i)) {
        return false;
      }
    }
    return true;
  };

  // ------------------------------- Prefill on Edit -------------------------------
  React.useEffect(() => {
    // Initialize documentsList with default entry for new candidates
    if (!initialData && documentsList.length === 0) {
      setDocumentsList([{ id: Date.now(), name: "CV/Resume", customName: "", file: null }]);
    }
    
    // Initialize skills with default entry for new candidates
    if (!initialData && skills.length === 0) {
      setSkills([{ id: Date.now(), name: "", level: "Beginner" }]);
    }
    
    // Initialize social links with default entry for new candidates
    if (!initialData && socialLinks.length === 0) {
      setSocialLinks([{ id: Date.now(), platform: "", url: "" }]);
    }
    
    if (!initialData) return;
    try {
      setFormData({
        fullName: initialData.fullName || "",
        email: initialData.email || "",
        phoneNumber: initialData.phoneNumber || "",
        shortBio: initialData.shortBio || "",
        sevisId: initialData.sevisId || "",
        ead: initialData.ead || "",
        degree: initialData.degree || "",
        supervisorName: initialData.supervisorName || "",
        supervisorContact: initialData.supervisorContact || "",
        password: initialData ? "" : "",
      });
      if (Array.isArray(initialData.qualifications) && initialData.qualifications.length) {
        setEducations(initialData.qualifications.map((q: any) => ({
          degree: q.degree || "",
          institute: q.institute || "",
          location: q.location || "",
          startYear: q.startYear ? String(q.startYear) : "",
          endYear: q.endYear ? String(q.endYear) : "",
          description: q.description || "",
        })));
      }
      if (Array.isArray(initialData.experiences) && initialData.experiences.length) {
        setExperiences(initialData.experiences.map((x: any) => ({
          company: x.company || "",
          role: x.role || "",
          startDate: x.startDate ? String(x.startDate).slice(0,10) : "",
          endDate: x.endDate ? String(x.endDate).slice(0,10) : "",
          description: x.description || "",
        })));
      }
      if (Array.isArray(initialData.documents)) {
        setExistingDocs(initialData.documents.map((d: any) => ({ label: d.label, url: d.url })));
      }
      if (Array.isArray(initialData.salarySlips) && initialData.salarySlips.length) {
        setExistingSalarySlips(initialData.salarySlips.map((s: any) => ({
          month: s.month || "",
          year: s.year || "",
          documentUrl: s.documentUrl || "",
        })));
        // Clear the default blank entry when editing existing profile with salary slips
        setSalarySlips([]);
      }
      if (Array.isArray(initialData.skills) && initialData.skills.length) {
        setSkills(initialData.skills.map((s: any) => ({
          id: Date.now() + Math.random(),
          name: s.name || "",
          level: s.level || "Beginner",
        })));
      }
      if (Array.isArray(initialData.socialLinks) && initialData.socialLinks.length) {
        setSocialLinks(initialData.socialLinks.map((s: any) => ({
          id: Date.now() + Math.random(),
          platform: s.platform || "",
          url: s.url || "",
        })));
      }
    } catch {}
  }, [initialData]);


  // ------------------------------- Handle Final Submission -------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    clearValidationErrors();
    
    // Validate all steps before submission
    let allStepsValid = true;
    for (let i = 0; i < 5; i++) {
      if (!validateStep(i)) {
        allStepsValid = false;
      }
    }
    
    if (!allStepsValid) {
      setError("Please fix all validation errors before submitting");
      setLoading(false);
      return;
    }
    
    try {
      const toYear = (dateStr: string) => {
        if (!dateStr) return undefined as number | undefined;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return undefined;
        return d.getUTCFullYear();
      };

      // Upload documents to local documents folder and capture their paths
      const uploadedDocs: { label: string; url: string }[] = [];
      for (const doc of documentsList) {
        if (doc.file && doc.name) {
          const form = new FormData();
          form.append('file', doc.file);
          // Use custom name if "Other" is selected, otherwise use predefined name
          const documentLabel = doc.name === "Other" ? doc.customName : doc.name;
          form.append('label', documentLabel);
          const res = await fetch('/api/upload', { method: 'POST', body: form });
          if (!res.ok) throw new Error('Upload failed');
          const data = await res.json();
          console.log('Document public path:', data.path);
          uploadedDocs.push({ label: documentLabel, url: data.path });
        }
      }

      // Upload salary slips to salarySlips folder and capture their paths
      const uploadedSalarySlips: { month: string; year: string; documentUrl: string }[] = [];
      for (const slip of salarySlips) {
        if (slip.file && slip.month && slip.year) {
          const form = new FormData();
          form.append('file', slip.file);
          form.append('month', slip.month);
          form.append('year', slip.year);
          const res = await fetch('/api/upload-salary-slip', { method: 'POST', body: form });
          if (!res.ok) throw new Error('Salary slip upload failed');
          const data = await res.json();
          console.log('Salary slip public path:', data.path);
          uploadedSalarySlips.push({ 
            month: slip.month, 
            year: slip.year, 
            documentUrl: data.path 
          });
        }
      }

      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        shortBio: formData.shortBio,
        sevisId: formData.sevisId,
        ead: formData.ead,
        degree: formData.degree,
        supervisorName: formData.supervisorName,
        supervisorContact: formData.supervisorContact,
        ...(initialData ? {} : { password: formData.password }),
        qualifications: educations.map((edu) => ({
          degree: edu.degree,
          institute: edu.institute,
          location: edu.location,
          startYear: edu.startYear ? Number(edu.startYear) : undefined,
          endYear: edu.endYear ? Number(edu.endYear) : undefined,
          description: edu.description,
        })),
        experiences: experiences.map((exp) => ({
          company: exp.company,
          role: exp.role,
          startDate: (exp as any).startDate ? new Date((exp as any).startDate).toISOString() : undefined,
          endDate: (exp as any).endDate ? new Date((exp as any).endDate).toISOString() : undefined,
          description: exp.description,
        })),
        skills: skills.filter(skill => skill.name.trim() !== "").map((skill) => ({
          name: skill.name,
          level: skill.level,
        })),
        socialLinks: socialLinks.filter(link => link.platform.trim() !== "" && link.url.trim() !== "").map((link) => ({
          platform: link.platform,
          url: link.url,
        })),
        documents: [...existingDocs, ...uploadedDocs],
        salarySlips: [...existingSalarySlips, ...uploadedSalarySlips],
        adminId: typeof window !== 'undefined' ? localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}').id : null : null,
      } as any;

      let res: any;
      const isEdit = initialData?.id || initialData?._id;
      
      if (isEdit) {
        res = await updateCandidate({ id: String(initialData.id || initialData._id), ...payload });
        
        // Success alert for editing
        await Swal.fire({
          icon: 'success',
          title: 'Profile Updated!',
          text: 'Candidate profile has been successfully updated.',
          confirmButtonText: 'OK',
          timer: 3000,
          timerProgressBar: true
        });
      } else {
        res = await addCandidate(payload);
        
        // Success alert for adding new candidate
        await Swal.fire({
          icon: 'success',
          title: 'Candidate Added!',
          text: 'New candidate has been successfully added to the system.',
          confirmButtonText: 'OK',
          timer: 3000,
          timerProgressBar: true
        });
      }

      // Redirect after successful operation
      router.push("/candidates");
    } catch (err: any) {
      setError("Failed to add candidate");
      await Swal.fire({
        icon: 'error',
        title: 'Creation Failed',
        text: err?.message || err?.response?.data?.message || 'An error occurred while adding candidate.',
        confirmButtonText: 'OK'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wizard 
      step={step} 
      onChange={setStep} 
      onSubmit={handleSubmit}
      validateStep={validateStep}
      stepValidationErrors={stepValidationErrors}
      canNavigateToStep={canNavigateToStep}
    >
      <Step title={<><i className="ri-user-3-line basicstep-icon"></i> Personal Info</>}>
        <div className="p-6">
          <p className="mb-1 font-semibold text-[#8c9097] dark:text-white/50 opacity-50 text-[1.25rem]">01</p>
          <div className="grid grid-cols-12 gap-4">
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="fullName" className="form-label">Full Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="fullName" 
                  value={formData.fullName} 
                  onChange={handleFormChange} 
                  className={`form-control w-full !rounded-md ${fieldErrors['fullName'] ? 'border-red-500' : ''}`} 
                  placeholder="Full Name" 
                  // required
                />
                {fieldErrors['fullName'] && (
                  <div className="text-red-500 text-sm mt-1">{fieldErrors['fullName']}</div>
                )}
            </div>
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="email" className="form-label">Email <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleFormChange} 
                  className={`form-control w-full !rounded-md ${fieldErrors['email'] ? 'border-red-500' : ''}`} 
                  placeholder="xyz@example.com" 
                  // required
                />
                {fieldErrors['email'] && (
                  <div className="text-red-500 text-sm mt-1">{fieldErrors['email']}</div>
                )}
            </div>
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="phone" className="form-label">Phone Number <span className="text-red-500">*</span></label>
                <input 
                  type="tel" 
                  name="phoneNumber" 
                  value={formData.phoneNumber} 
                  onChange={handleFormChange} 
                  className={`form-control w-full !rounded-md ${fieldErrors['phoneNumber'] ? 'border-red-500' : ''}`} 
                  id="phone" 
                  placeholder="ex: 98XXX4XXX0" 
                  // required
                />
                {fieldErrors['phoneNumber'] && (
                  <div className="text-red-500 text-sm mt-1">{fieldErrors['phoneNumber']}</div>
                )}
            </div>
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="sevisId" className="form-label">SEVIS ID</label>
                <input type="text" name="sevisId" value={formData.sevisId} onChange={handleFormChange} className="form-control w-full !rounded-md" id="sevisId" placeholder="SEVIS ID" />
            </div>
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="ead" className="form-label">EAD</label>
                <input type="text" name="ead" value={formData.ead} onChange={handleFormChange} className="form-control w-full !rounded-md" id="ead" placeholder="EAD" />
            </div>
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="degree" className="form-label">Degree</label>
                <input type="text" name="degree" value={formData.degree} onChange={handleFormChange} className="form-control w-full !rounded-md" id="degree" placeholder="Degree" />
            </div>
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="supervisorName" className="form-label">Supervisor Name</label>
                <input type="text" name="supervisorName" value={formData.supervisorName} onChange={handleFormChange} className="form-control w-full !rounded-md" id="supervisorName" placeholder="supervisor name" />
            </div>
            <div className="xl:col-span-6 col-span-12">
                <label htmlFor="supervisorContact" className="form-label">Supervisor Phone No.</label>
                <input 
                  type="text" 
                  name="supervisorContact" 
                  value={formData.supervisorContact} 
                  onChange={handleFormChange} 
                  className={`form-control w-full !rounded-md ${fieldErrors['supervisorContact'] ? 'border-red-500' : ''}`} 
                  id="supervisorContact" 
                  placeholder="ex: 98XXX4XXX0" 
                />
                {fieldErrors['supervisorContact'] && (
                  <div className="text-red-500 text-sm mt-1">{fieldErrors['supervisorContact']}</div>
                )}
            </div>
                            
            <div className="xl:col-span-12 col-span-12">
                <label htmlFor="bio" className="form-label">Short Bio </label>
                <textarea name="shortBio" value={formData.shortBio} onChange={handleFormChange} className="form-control w-full !rounded-md" rows={3}></textarea>
            </div>

            {/* Social Links Section */}
            <div className="xl:col-span-12 col-span-12">
              <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
                <div>Social Links <span className="text-red-500">*</span> :</div>
                <button
                  type="button"
                  onClick={handleAddSocialLink}
                  className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
                >
                  + Add Social Link
                </button>
              </div>
              {fieldErrors['socialLinks'] && (
                <div className="text-red-500 text-sm mb-3">
                  {fieldErrors['socialLinks']}
                </div>
              )}

              {socialLinks.map((link, index) => (
                <div key={link.id} className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3">
                  <button
                    type="button"
                    onClick={() => handleRemoveSocialLink(index)}
                    className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
                  >
                    ✕
                  </button>

                  <div className="xl:col-span-6 col-span-12">
                    <label className="form-label">Platform <span className="text-red-500">*</span></label>
                    <select
                      className="form-control w-full !rounded-md"
                      value={link.platform}
                      onChange={(e) => handleSocialLinkChange(index, "platform", e.target.value)}
                      required
                    >
                      <option value="">Select Platform</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="GitHub">GitHub</option>
                      <option value="Twitter">Twitter</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Portfolio">Portfolio</option>
                      <option value="Website">Website</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="xl:col-span-6 col-span-12">
                    <label className="form-label">URL <span className="text-red-500">*</span></label>
                    <input
                      type="url"
                      className="form-control w-full !rounded-md"
                      placeholder="https://example.com"
                      value={link.url}
                      onChange={(e) => handleSocialLinkChange(index, "url", e.target.value)}
                      required
                    />
                    {link.url && !validateURL(link.url) && (
                      <div className="text-red-500 text-sm mt-1">Please enter a valid URL</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!initialData && (
              <div className="xl:col-span-6 col-span-12">
                <label htmlFor="password" className="form-label">Password <span className="text-red-500">*</span></label>
                <input 
                  type="password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleFormChange} 
                  className={`form-control w-full !rounded-md ${fieldErrors['password'] ? 'border-red-500' : ''}`} 
                  placeholder="Enter password" 
                  required
                />
                {fieldErrors['password'] && (
                  <div className="text-red-500 text-sm mt-1">{fieldErrors['password']}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </Step>

      <Step title={<><i className="ri-book-line basicstep-icon"></i> Qualification</>}>
        <div className="p-4">
          <p className="mb-1 font-semibold text-[#8c9097] opacity-50 text-[1.25rem]">02</p>
          <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
            <div>Qualification :</div>
            <button
              type="button"
              onClick={handleAddEducation}
              className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
            >
              + Add Education
            </button>
          </div>
          {fieldErrors['education'] && (
            <div className="text-red-500 text-sm mb-3">{fieldErrors['education']}</div>
          )}

          {educations.map((edu, index) => (
            <div key={index} className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3">
              <button type="button" onClick={() => { setEducations(educations.filter((_, i) => i !== index)) }} className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600">
                ✕
              </button>
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">Degree <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={`form-control w-full !rounded-md ${fieldErrors['education'] ? 'border-red-500' : ''}`}
                  placeholder="Degree"
                  value={edu.degree}
                  onChange={(e) => handleEducationChange(index, "degree", e.target.value)}
                  // required
                />
              </div>
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">University <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={`form-control w-full !rounded-md ${fieldErrors['education'] ? 'border-red-500' : ''}`}
                  placeholder="University/Institute"
                  value={edu.institute}
                  onChange={(e) => handleEducationChange(index, "institute", e.target.value)}
                  // required
                />
              </div>
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">Location <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={`form-control w-full !rounded-md ${fieldErrors['education'] ? 'border-red-500' : ''}`}
                  placeholder="Location"
                  value={edu.location}
                  onChange={(e) => handleEducationChange(index, "location", e.target.value)}
                  // required
                />
              </div>
              <div className="xl:col-span-6 col-span-12">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-6">
                    <label className="form-label">Start Year <span className="text-red-500">*</span></label>
                    <select
                      className={`form-control w-full !rounded-md ${fieldErrors['education'] ? 'border-red-500' : ''}`}
                      value={(edu as any).startYear}
                      onChange={(e) => handleEducationChange(index, "startYear", e.target.value)}
                    >
                      <option value="">Select Start Year</option>
                      {generateYearOptions().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-6">
                    <label className="form-label">End Year <span className="text-red-500">*</span></label>
                    <select
                      className={`form-control w-full !rounded-md ${fieldErrors['education'] ? 'border-red-500' : ''}`}
                      value={(edu as any).endYear}
                      onChange={(e) => handleEducationChange(index, "endYear", e.target.value)}
                    >
                      <option value="">Select End Year</option>
                      {generateYearOptions().map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {edu.startYear && edu.endYear && !validateYearRange(edu.startYear, edu.endYear) && (
                  <div className="text-red-500 text-sm mt-2 col-span-12">
                    Start year cannot be ahead of end year
                  </div>
                )}
              </div>
              
              <div className="xl:col-span-12 col-span-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control w-full !rounded-md"
                  rows={3}
                  placeholder="Description"
                  value={edu.description}
                  onChange={(e) => handleEducationChange(index, "description", e.target.value)}
                />
              </div>
            </div>
          ))}
          <div className="xl:col-span-12 col-span-12">
            <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
              <div>Skills :</div>
              <button
                type="button"
                onClick={handleAddSkill}
                className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
              >
                + Add Skill
              </button>
            </div>
            {fieldErrors['skills'] && (
              <div className="text-red-500 text-sm mb-3">{fieldErrors['skills']}</div>
            )}

            {skills.map((skill, index) => (
              <div key={skill.id} className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3">
                <button
                  type="button"
                  onClick={() => setSkills(skills.filter((_, i) => i !== index))}
                  className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
                >
                  ✕
                </button>

                <div className="xl:col-span-6 col-span-12">
                  <label className="form-label">Skill Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className={`form-control w-full !rounded-md ${fieldErrors['skills'] ? 'border-red-500' : ''}`}
                    placeholder="e.g., JavaScript, Python, React"
                    value={skill.name}
                    onChange={(e) => handleSkillChange(index, "name", e.target.value)}
                    // required
                  />
                </div>

                <div className="xl:col-span-6 col-span-12">
                  <label className="form-label">Skill Level</label>
                  <select
                    className="form-control w-full !rounded-md"
                    value={skill.level}
                    onChange={(e) => handleSkillChange(index, "level", e.target.value)}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Step>

      <Step title={<><i className="ri-bank-card-line basicstep-icon"></i> Work Experience</>}>
        <div className="p-4">
          <p className="mb-1 font-semibold text-[#8c9097] opacity-50 text-[1.25rem]">03</p>
          <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
            <div>Experience :</div>
            <button
              type="button"
              onClick={handleAddExperience}
              className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
            >
              + Add Experience
            </button>
          </div>
          {fieldErrors['experience'] && (
            <div className="text-red-500 text-sm mb-3">{fieldErrors['experience']}</div>
          )}
          {experiences.map((exp, index) => (
            <div key={index} className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3">
              <button type="button"
                onClick={() => setExperiences(experiences.filter((_, i) => i !== index))}
                className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
              >
                ✕
              </button>

              {/* Fields */}
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={`form-control w-full !rounded-md ${fieldErrors['experience'] ? 'border-red-500' : ''}`}
                  placeholder="Company Name"
                  value={exp.company}
                  onChange={(e) => handleExpChange(index, "company", e.target.value)}
                  // required
                />
              </div>
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">Role/Designation <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={`form-control w-full !rounded-md ${fieldErrors['experience'] ? 'border-red-500' : ''}`}
                  placeholder="Role/Designation"
                  value={exp.role}
                  onChange={(e) => handleExpChange(index, "role", e.target.value)}
                  // required
                />
              </div>
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">Start Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  className={`form-control w-full !rounded-md ${fieldErrors['experience'] ? 'border-red-500' : ''}`}
                  placeholder="Start Date"
                  value={(exp as any).startDate}
                  onChange={(e) => handleExpChange(index, "startDate", e.target.value)}
                  // required
                />
              </div>
              <div className="xl:col-span-6 col-span-12">
                <label className="form-label">End Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  className={`form-control w-full !rounded-md ${fieldErrors['experience'] ? 'border-red-500' : ''}`}
                  placeholder="End Date"
                  value={(exp as any).endDate}
                  onChange={(e) => handleExpChange(index, "endDate", e.target.value)}
                  // required
                />
              </div>
              {exp.startDate && exp.endDate && !validateDateRange(exp.startDate, exp.endDate) && (
                <div className="text-red-500 text-sm mt-2 col-span-12">
                  Start date cannot be ahead of end date
                </div>
              )}
              {exp.endDate && !validateNotFutureDate(exp.endDate) && (
                <div className="text-red-500 text-sm mt-2 col-span-12">
                  End date cannot be in the future
                </div>
              )}
              <div className="xl:col-span-12 col-span-12">
                <label className="form-label">Responsibilities / Description</label>
                <textarea
                  className="form-control w-full !rounded-md"
                  rows={3}
                  placeholder="Responsibilities / Description"
                  value={exp.description}
                  onChange={(e) => handleExpChange(index, "description", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </Step>

      <Step title={<><i className="ri-checkbox-circle-line basicstep-icon"></i> Document Uploads</>}>
        <div className="p-4">
          <p className="mb-1 font-semibold text-[#8c9097] opacity-50 text-[1.25rem]">04</p>
          <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
            <div>Document :</div>
            <button
              type="button"
              onClick={() => setDocumentsList([...documentsList, { id: Date.now(), name: "", customName: "", file: null }])}
              className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
            >
              + Add Document
            </button>
          </div>
          {fieldErrors['documents'] && (
            <div className="text-red-500 text-sm mb-3">{fieldErrors['documents']}</div>
          )}

          {/* Existing Documents */}
          {existingDocs.length > 0 && (
            <div className="mb-6">
              <h6 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Existing Documents</h6>
              {existingDocs.map((doc, index) => (
                <div key={index} className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3 bg-gray-50 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => setExistingDocs(existingDocs.filter((_, i) => i !== index))}
                    className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
                  >
                    ✕
                  </button>

                  <div className="xl:col-span-4 col-span-12">
                    <label className="form-label">Document Type</label>
                    <input
                      type="text"
                      className="form-control w-full !rounded-md bg-white dark:bg-gray-700"
                      value={doc.label}
                      readOnly
                    />
                  </div>

                  <div className="xl:col-span-4 col-span-12">
                    <label className="form-label">Current File</label>
                    <div className="flex items-center">
                      {getExistingFileThumbnail(doc.url, doc.label)}
                      <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="text-xs">{doc.label || 'Document'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="xl:col-span-4 col-span-12">
                    <label className="form-label">Replace File</label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="form-control w-full !rounded-md"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const updated = [...documentsList];
                          updated.push({ 
                            id: Date.now() + index, 
                            name: doc.label, 
                            customName: "",
                            file: e.target.files[0] 
                          });
                          setDocumentsList(updated);
                          // Remove from existing docs since we're replacing it
                          setExistingDocs(existingDocs.filter((_, i) => i !== index));
                        }
                      }}
                    />
                    <small className="text-gray-500 text-xs mt-1">Supported formats: JPG, JPEG, PNG, PDF</small>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New Documents */}
          {documentsList.length > 0 && (
            <div>
              <h6 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">New Documents</h6>
              {documentsList.map((doc, index) => (
                <div key={doc.id} className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setDocumentsList(documentsList.filter(d => d.id !== doc.id))}
                    className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
                  >
                    ✕
                  </button>

              <div className="xl:col-span-4 col-span-12">
                <label className="form-label">Document Type <span className="text-red-500">*</span></label>
                <select
                  className={`form-control w-full !rounded-md ${fieldErrors['documents'] ? 'border-red-500' : ''}`}
                  value={doc.name}
                  onChange={(e) => {
                    const updated = [...documentsList];
                    updated[index].name = e.target.value;
                    // Clear custom name when changing from "Other" to a predefined type
                    if (e.target.value !== "Other") {
                      updated[index].customName = "";
                    }
                    setDocumentsList(updated);
                  }}
                  required
                >
                  <option value="">Select Document Type</option>
                  <option value="CV/Resume">CV/Resume</option>
                  <option value="Marksheet">Marksheet</option>
                  <option value="Degree Certificate">Degree Certificate</option>
                  <option value="Experience Letter">Experience Letter</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Custom Document Name Input - Show only when "Other" is selected */}
              {doc.name === "Other" && (
                <div className="xl:col-span-4 col-span-12">
                  <label className="form-label">Custom Document Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className={`form-control w-full !rounded-md ${fieldErrors['documents'] ? 'border-red-500' : ''}`}
                    placeholder="Enter custom document name"
                    value={doc.customName}
                    onChange={(e) => {
                      const updated = [...documentsList];
                      updated[index].customName = e.target.value;
                      setDocumentsList(updated);
                    }}
                    required
                  />
                </div>
              )}

              <div className="xl:col-span-4 col-span-12">
                <label className="form-label">Upload File <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className={`form-control w-full !rounded-md ${fieldErrors['documents'] ? 'border-red-500' : ''}`}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const updated = [...documentsList];
                      updated[index].file = e.target.files[0];
                      setDocumentsList(updated);
                    }
                  }}
                  required
                />
                <small className="text-gray-500 text-xs mt-1">Supported formats: JPG, JPEG, PNG, PDF</small>
              </div>

                  {doc.file && (
                    <div className="xl:col-span-4 col-span-12 mt-6">
                      <label className="form-label">File Preview</label>
                      <div className="flex items-center">
                        {getFileThumbnail(doc.file)}
                        <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                          <div className="text-xs">{doc.file.name}</div>
                          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            {doc.name === "Other" ? doc.customName : doc.name}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Step>

      <Step title={<><i className="ri-money-dollar-box-line basicstep-icon"></i> Salary Slips</>}>
        <div className="p-4">
          <p className="mb-1 font-semibold text-[#8c9097] opacity-50 text-[1.25rem]">05</p>
          <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
            <div>Salary Slips <span className="text-red-500">*</span> :</div>
            <button
              type="button"
              onClick={handleAddSalarySlip}
              className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
            >
              + Add Salary Slip
            </button>
          </div>
          {fieldErrors['salarySlips'] && (
            <div className="text-red-500 text-sm mb-3">{fieldErrors['salarySlips']}</div>
          )}
          {validateSalarySlipDuplicates(salarySlips).length > 0 && (
            <div className="text-red-500 text-sm mb-3">
              Duplicate month/year combinations found. Each month and year combination must be unique.
            </div>
          )}

          {/* Existing Salary Slips */}
          {existingSalarySlips.length > 0 && (
            <div className="mb-6">
              <h6 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Existing Salary Slips</h6>
              {existingSalarySlips.map((slip, index) => (
                <div key={index} className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3 bg-gray-50 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => setExistingSalarySlips(existingSalarySlips.filter((_, i) => i !== index))}
                    className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
                  >
                    ✕
                  </button>

                  <div className="xl:col-span-4 col-span-12">
                    <label className="form-label">Month</label>
                    <input
                      type="text"
                      className="form-control w-full !rounded-md bg-white dark:bg-gray-700"
                      value={slip.month}
                      readOnly
                    />
                  </div>

                  <div className="xl:col-span-4 col-span-12">
                    <label className="form-label">Year</label>
                    <input
                      type="text"
                      className="form-control w-full !rounded-md bg-white dark:bg-gray-700"
                      value={slip.year}
                      readOnly
                    />
                  </div>

                  <div className="xl:col-span-4 col-span-12">
                    <label className="form-label">File Preview</label>
                    <div className="flex items-center">
                      {getExistingFileThumbnail(slip.documentUrl, `${slip.month} ${slip.year}`)}
                      <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="text-xs">Existing File</div>
                        <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {slip.month} {slip.year}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New Salary Slips */}
          {salarySlips.length > 0 && (
            <div>
              {salarySlips.map((slip, index) => {
                const duplicateIndexes = validateSalarySlipDuplicates(salarySlips);
                const isDuplicate = duplicateIndexes.includes(index);
                return (
            <div key={slip.id} className={`relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3 ${isDuplicate ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}>
              <button
                type="button"
                onClick={() => setSalarySlips(salarySlips.filter(s => s.id !== slip.id))}
                className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
              >
                ✕
              </button>

              <div className="xl:col-span-2 col-span-6">
                <label className="form-label">Month <span className="text-red-500">*</span></label>
                <select
                  className={`form-control w-full !rounded-md ${fieldErrors['salarySlips'] || isDuplicate ? 'border-red-500' : ''}`}
                  value={slip.month}
                  onChange={(e) => handleSalarySlipChange(index, "month", e.target.value)}
                  required
                >
                  <option value="">Select</option>
                  <option value="January">January</option>
                  <option value="February">February</option>
                  <option value="March">March</option>
                  <option value="April">April</option>
                  <option value="May">May</option>
                  <option value="June">June</option>
                  <option value="July">July</option>
                  <option value="August">August</option>
                  <option value="September">September</option>
                  <option value="October">October</option>
                  <option value="November">November</option>
                  <option value="December">December</option>
                </select>
              </div>

              <div className="xl:col-span-2 col-span-6">
                <label className="form-label">Year <span className="text-red-500">*</span></label>
                <select
                  className={`form-control w-full !rounded-md ${fieldErrors['salarySlips'] || isDuplicate ? 'border-red-500' : ''}`}
                  value={slip.year}
                  onChange={(e) => handleSalarySlipChange(index, "year", e.target.value)}
                  required
                >
                  <option value="">Select</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <option key={year} value={year.toString()}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="xl:col-span-4 col-span-12">
                <label className="form-label">Upload Salary Slip <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className={`form-control w-full !rounded-md ${fieldErrors['salarySlips'] ? 'border-red-500' : ''}`}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleSalarySlipChange(index, "file", e.target.files[0]);
                    }
                  }}
                  required
                />
                <small className="text-gray-500 text-xs mt-1">Supported formats: JPG, JPEG, PNG, PDF</small>
              </div>

              {(slip.file || slip.documentUrl) && (
                <div className="xl:col-span-4 col-span-12 mt-6">
                  <label className="form-label">File Preview</label>
                  <div className="flex items-center">
                    {slip.file ? getFileThumbnail(slip.file) : getExistingFileThumbnail(slip.documentUrl, `${slip.month} ${slip.year}`)}
                    <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="text-xs">{slip.file ? slip.file.name : 'Uploaded File'}</div>
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {slip.month} {slip.year}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
                );
              })}
            </div>
          )}
        </div>
      </Step>
    </Wizard>
  );
};