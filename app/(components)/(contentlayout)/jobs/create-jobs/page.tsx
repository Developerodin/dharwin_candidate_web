"use client";
import React, { Fragment, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import { createJob, getJobTemplates, getJobTemplateById } from '@/shared/lib/jobs';
import Swal from 'sweetalert2';
import Editordata from '@/shared/data/apps/projects/createprojectdata';

interface Organisation {
  name: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  description: string;
}

interface SalaryRange {
  min: number;
  max: number;
  currency: string;
}

interface JobFormData {
  title: string;
  organisation: Organisation;
  jobDescription: string;
  jobType: string;
  location: string;
  skillTags: string[];
  salaryRange: SalaryRange;
  experienceLevel: string;
  status: string;
  templateId?: string;
}

interface Template {
  id: string;
  title: string;
  jobDescription: string;
}

const CreateJobs = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillTagInput, setSkillTagInput] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [isCustomTitle, setIsCustomTitle] = useState(false);

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    organisation: {
      name: '',
      website: '',
      email: '',
      phone: '',
      address: '',
      description: ''
    },
    jobDescription: '',
    jobType: 'Full-time',
    location: '',
    skillTags: [],
    salaryRange: {
      min: 0,
      max: 0,
      currency: 'USD'
    },
    experienceLevel: 'Mid Level',
    status: 'Active',
    templateId: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('organisation.')) {
      const orgField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        organisation: {
          ...prev.organisation,
          [orgField]: value
        }
      }));
    } else if (name.startsWith('salaryRange.')) {
      const salaryField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        salaryRange: {
          ...prev.salaryRange,
          [salaryField]: salaryField === 'currency' ? value : Number(value)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };


  const handleAddSkillTag = () => {
    if (skillTagInput.trim() && !formData.skillTags.includes(skillTagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skillTags: [...prev.skillTags, skillTagInput.trim()]
      }));
      setSkillTagInput('');
    }
  };

  const handleRemoveSkillTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      skillTags: prev.skillTags.filter(t => t !== tag)
    }));
  };

  const handleSkillTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkillTag();
    }
  };

  // Fetch job templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const response = await getJobTemplates({ limit: 1000 });
        if (response && response.results) {
          setTemplates(response.results);
        } else if (Array.isArray(response)) {
          setTemplates(response);
        }
      } catch (err: any) {
        console.error('Failed to fetch templates:', err);
        // Don't show error to user, just log it
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, []);

  // Handle template selection
  const handleTemplateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    
    if (!templateId) {
      // Clear template data if "Select a template" is selected
      setFormData(prev => ({
        ...prev,
        title: '',
        jobDescription: '',
        templateId: ''
      }));
      setIsCustomTitle(false);
      return;
    }

    // Check if "Custom" option is selected
    if (templateId === 'custom') {
      setIsCustomTitle(true);
      setFormData(prev => ({
        ...prev,
        title: '',
        jobDescription: '',
        templateId: ''
      }));
      return;
    }

    setIsCustomTitle(false);

    try {
      // Fetch template details
      const template = await getJobTemplateById(templateId);
      
      // Process job description: decode HTML entities and clean malformed HTML
      const description = template?.jobDescription || '';
      let formattedDescription = '';
      
      if (description && description.trim()) {
        if (typeof window !== 'undefined') {
          // Decode HTML entities if they exist (e.g., &lt;p&gt; -> <p>)
          const textarea = document.createElement('textarea');
          textarea.innerHTML = description;
          let decodedDescription = textarea.value;
          
          // Clean up malformed HTML (remove nested empty p tags, fix structure)
          decodedDescription = decodedDescription.replace(/<p>\s*<p>/g, '<p>');
          decodedDescription = decodedDescription.replace(/<\/p>\s*<\/p>/g, '</p>');
          
          // Check if it contains HTML tags
          if (decodedDescription.includes('<') && decodedDescription.includes('>')) {
            // It's HTML, use it as-is (ReactQuill will render it as formatted text)
            formattedDescription = decodedDescription;
          } else if (decodedDescription.trim()) {
            // Plain text, wrap in paragraph
            formattedDescription = `<p>${decodedDescription}</p>`;
          }
        } else {
          // Server-side: basic HTML entity decoding
          formattedDescription = description
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        }
      }

      // Update form data with template data
      setFormData(prev => ({
        ...prev,
        title: template.title || '',
        jobDescription: formattedDescription || '',
        templateId: templateId
      }));
    } catch (err: any) {
      console.error('Failed to fetch template details:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load template details. Please try again.',
        confirmButtonText: 'OK'
      });
    }
  };

  const stripHtml = (html: string): string => {
    if (typeof window === 'undefined') return html.replace(/<[^>]*>/g, '').trim();
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const validateForm = (): boolean => {
    // Either template must be selected or custom title must be provided
    if (!isCustomTitle && !formData.templateId) {
      setError('Please select a job template or choose custom option');
      return false;
    }
    if (!formData.title.trim()) {
      setError('Job title is required');
      return false;
    }
    if (!formData.organisation.name.trim()) {
      setError('Organisation name is required');
      return false;
    }
    if (!formData.organisation.email.trim()) {
      setError('Organisation email is required');
      return false;
    }
    if (!stripHtml(formData.jobDescription)) {
      setError('Job description is required');
      return false;
    }
    if (!formData.location.trim()) {
      setError('Location is required');
      return false;
    }
    if (formData.salaryRange.min < 0 || formData.salaryRange.max < 0) {
      setError('Salary range must be positive numbers');
      return false;
    }
    if (formData.salaryRange.min > formData.salaryRange.max) {
      setError('Minimum salary cannot be greater than maximum salary');
      return false;
    }
    if (!formData.organisation.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (formData.organisation.website && !formData.organisation.website.match(/^https?:\/\/.+/)) {
      setError('Please enter a valid website URL (starting with http:// or https://)');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      await Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: error || 'Please fill in all required fields',
        confirmButtonText: 'OK'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare the request payload
      const payload: any = {
        title: formData.title,
        organisation: {
          name: formData.organisation.name,
          website: formData.organisation.website || undefined,
          email: formData.organisation.email,
          phone: formData.organisation.phone || undefined,
          address: formData.organisation.address || undefined,
          description: formData.organisation.description || undefined
        },
        jobDescription: formData.jobDescription,
        jobType: formData.jobType,
        location: formData.location,
        skillTags: formData.skillTags,
        salaryRange: {
          min: formData.salaryRange.min,
          max: formData.salaryRange.max,
          currency: formData.salaryRange.currency
        },
        experienceLevel: formData.experienceLevel,
        status: formData.status
      };

      // Add templateId only if provided
      if (formData.templateId && formData.templateId.trim()) {
        payload.templateId = formData.templateId.trim();
      }

      // Remove undefined fields from organisation
      Object.keys(payload.organisation).forEach(key => {
        if (payload.organisation[key] === undefined) {
          delete payload.organisation[key];
        }
      });

      await createJob(payload);

      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Job created successfully!',
        confirmButtonText: 'OK',
        timer: 2000,
        timerProgressBar: true
      });

      // Redirect to manage jobs page
      router.push('/jobs/manage-jobs');
    } catch (err: any) {
      console.error('Error creating job:', err);
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to create job. Please try again.';
      setError(errorMessage);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Fragment>
      <Seo title={"Create Job"} />
      <Pageheader currentpage="Create Job" activepage="Jobs" mainpage="Create Job" />
      
      <div className="grid grid-cols-12 gap-x-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box">
            <div className="box-header">
              <div className="box-title">Job Information</div>
            </div>
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="alert alert-danger mb-4" role="alert">
                    {error}
                  </div>
                )}

                {/* Job Title from Template or Custom */}
                <div className="grid grid-cols-12 gap-x-6">
                  <div className="xl:col-span-6 col-span-12">
                    <div className="mb-3">
                      <label htmlFor="templateId" className="form-label">Job Title <span className="text-danger">*</span></label>
                      {!isCustomTitle ? (
                        <>
                          <select
                            className="form-control"
                            id="templateId"
                            name="templateId"
                            value={formData.templateId || ''}
                            onChange={handleTemplateChange}
                            required
                            disabled={loadingTemplates}
                          >
                            <option value="">Select a template...</option>
                            {templates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.title}
                              </option>
                            ))}
                            <option value="custom">Custom (Manual Entry)</option>
                          </select>
                          {loadingTemplates && (
                            <small className="text-muted">Loading templates...</small>
                          )}
                        </>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="form-control"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder="Enter job title manually"
                            required
                          />
                          <button
                            type="button"
                            className="btn btn-light"
                            onClick={() => {
                              setIsCustomTitle(false);
                              setFormData(prev => ({
                                ...prev,
                                title: '',
                                templateId: ''
                              }));
                            }}
                          >
                            <i className="ri-arrow-go-back-line"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Job Type */}
                  <div className="xl:col-span-6 col-span-12">
                    <div className="mb-3">
                      <label htmlFor="jobType" className="form-label">Job Type <span className="text-danger">*</span></label>
                      <select
                        className="form-control"
                        id="jobType"
                        name="jobType"
                        value={formData.jobType}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Freelance">Freelance</option>
                        <option value="Internship">Internship</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Location and Experience Level */}
                <div className="grid grid-cols-12 gap-x-6">
                  <div className="xl:col-span-6 col-span-12">
                    <div className="mb-3">
                      <label htmlFor="location" className="form-label">Location <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="e.g., San Francisco, CA"
                        required
                      />
                    </div>
                  </div>

                  <div className="xl:col-span-6 col-span-12">
                    <div className="mb-3">
                      <label htmlFor="experienceLevel" className="form-label">Experience Level <span className="text-danger">*</span></label>
                      <select
                        className="form-control"
                        id="experienceLevel"
                        name="experienceLevel"
                        value={formData.experienceLevel}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="Entry Level">Entry Level</option>
                        <option value="Mid Level">Mid Level</option>
                        <option value="Senior Level">Senior Level</option>
                        <option value="Executive Level">Executive Level</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="grid grid-cols-12 gap-x-6">
                  <div className="xl:col-span-6 col-span-12">
                    <div className="mb-3">
                      <label htmlFor="status" className="form-label">Status <span className="text-danger">*</span></label>
                      <select
                        className="form-control"
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Draft">Draft</option>
                      </select>
                    </div>
                  </div>

                  <div className="xl:col-span-6 col-span-12">
                    <div className="mb-3">
                      <label htmlFor="templateId" className="form-label">Template ID (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        id="templateId"
                        name="templateId"
                        value={formData.templateId}
                        onChange={handleInputChange}
                        placeholder="Enter template ID if applicable"
                      />
                    </div>
                  </div>
                </div>

                {/* Job Description */}
                <div className="mb-3">
                  <label htmlFor="jobDescription" className="form-label">Job Description <span className="text-danger">*</span></label>
                  <div id="job-description-editor">
                    <Editordata 
                      key={formData.templateId || 'create-job-editor'}
                      value={formData.jobDescription}
                      onChange={(html: string) => {
                        setFormData(prev => ({
                          ...prev,
                          jobDescription: html
                        }));
                      }}
                    />
                  </div>
                  {!stripHtml(formData.jobDescription) && (
                    <div className="text-danger text-sm mt-1">Job description is required</div>
                  )}
                </div>

                {/* Organisation Section */}
                <div className="mb-4">
                  <h5 className="mb-3">Organisation Details</h5>
                  
                  <div className="grid grid-cols-12 gap-x-6">
                    <div className="xl:col-span-6 col-span-12">
                      <div className="mb-3">
                        <label htmlFor="organisation.name" className="form-label">Organisation Name <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          id="organisation.name"
                          name="organisation.name"
                          value={formData.organisation.name}
                          onChange={handleInputChange}
                          placeholder="e.g., Tech Corp"
                          required
                        />
                      </div>
                    </div>

                    <div className="xl:col-span-6 col-span-12">
                      <div className="mb-3">
                        <label htmlFor="organisation.email" className="form-label">Organisation Email <span className="text-danger">*</span></label>
                        <input
                          type="email"
                          className="form-control"
                          id="organisation.email"
                          name="organisation.email"
                          value={formData.organisation.email}
                          onChange={handleInputChange}
                          placeholder="e.g., hr@techcorp.com"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-x-6">
                    <div className="xl:col-span-6 col-span-12">
                      <div className="mb-3">
                        <label htmlFor="organisation.website" className="form-label">Website</label>
                        <input
                          type="url"
                          className="form-control"
                          id="organisation.website"
                          name="organisation.website"
                          value={formData.organisation.website}
                          onChange={handleInputChange}
                          placeholder="https://techcorp.com"
                        />
                      </div>
                    </div>

                    <div className="xl:col-span-6 col-span-12">
                      <div className="mb-3">
                        <label htmlFor="organisation.phone" className="form-label">Phone</label>
                        <input
                          type="tel"
                          className="form-control"
                          id="organisation.phone"
                          name="organisation.phone"
                          value={formData.organisation.phone}
                          onChange={handleInputChange}
                          placeholder="+1234567890"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="organisation.address" className="form-label">Address</label>
                    <input
                      type="text"
                      className="form-control"
                      id="organisation.address"
                      name="organisation.address"
                      value={formData.organisation.address}
                      onChange={handleInputChange}
                      placeholder="123 Tech Street, San Francisco, CA"
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="organisation.description" className="form-label">Organisation Description</label>
                    <textarea
                      className="form-control"
                      id="organisation.description"
                      name="organisation.description"
                      value={formData.organisation.description}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Brief description about the organisation..."
                    />
                  </div>
                </div>

                {/* Salary Range */}
                <div className="mb-4">
                  <h5 className="mb-3">Salary Range</h5>
                  <div className="grid grid-cols-12 gap-x-6">
                    <div className="xl:col-span-4 col-span-12">
                      <div className="mb-3">
                        <label htmlFor="salaryRange.min" className="form-label">Minimum Salary</label>
                        <input
                          type="number"
                          className="form-control"
                          id="salaryRange.min"
                          name="salaryRange.min"
                          value={formData.salaryRange.min}
                          onChange={handleInputChange}
                          min="0"
                          placeholder="120000"
                        />
                      </div>
                    </div>

                    <div className="xl:col-span-4 col-span-12">
                      <div className="mb-3">
                        <label htmlFor="salaryRange.max" className="form-label">Maximum Salary</label>
                        <input
                          type="number"
                          className="form-control"
                          id="salaryRange.max"
                          name="salaryRange.max"
                          value={formData.salaryRange.max}
                          onChange={handleInputChange}
                          min="0"
                          placeholder="180000"
                        />
                      </div>
                    </div>

                    <div className="xl:col-span-4 col-span-12">
                      <div className="mb-3">
                        <label htmlFor="salaryRange.currency" className="form-label">Currency</label>
                        <select
                          className="form-control"
                          id="salaryRange.currency"
                          name="salaryRange.currency"
                          value={formData.salaryRange.currency}
                          onChange={handleInputChange}
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="INR">INR</option>
                          <option value="CAD">CAD</option>
                          <option value="AUD">AUD</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skill Tags */}
                <div className="mb-4">
                  <h5 className="mb-3">Skill Tags</h5>
                  <div className="mb-3">
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter a skill tag and press Enter"
                        value={skillTagInput}
                        onChange={(e) => setSkillTagInput(e.target.value)}
                        onKeyDown={handleSkillTagKeyDown}
                      />
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary"
                        onClick={handleAddSkillTag}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  {formData.skillTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.skillTags.map((tag, index) => (
                        <span
                          key={index}
                          className="badge bg-primary/10 text-primary inline-flex items-center gap-2"
                        >
                          {tag}
                          <button
                            type="button"
                            className="text-primary hover:text-danger"
                            onClick={() => handleRemoveSkillTag(tag)}
                          >
                            <i className="ri-close-line"></i>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary !bg-primary !text-white !py-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin me-1"></i>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line me-1"></i>
                        Create Job
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="ti-btn ti-btn-light"
                    onClick={() => router.push('/jobs/manage-jobs')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default CreateJobs;

