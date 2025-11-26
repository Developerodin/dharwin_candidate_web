"use client";
import React, { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import { createJobTemplate } from '@/shared/lib/jobs';
import Swal from 'sweetalert2';
import Editordata from '@/shared/data/apps/projects/createprojectdata';

interface TemplateFormData {
  title: string;
  jobDescription: string;
}

const CreateJobTemplate = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<TemplateFormData>({
    title: '',
    jobDescription: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const stripHtml = (html: string): string => {
    if (typeof window === 'undefined') return html.replace(/<[^>]*>/g, '').trim();
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError('Template title is required');
      return false;
    }
    if (!stripHtml(formData.jobDescription)) {
      setError('Job description is required');
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
      const payload = {
        title: formData.title.trim(),
        jobDescription: formData.jobDescription || '<p></p>',
      };

      await createJobTemplate(payload);

      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Job template created successfully!',
        confirmButtonText: 'OK',
        timer: 2000,
        timerProgressBar: true
      });

      // Reset form
      setFormData({
        title: '',
        jobDescription: '',
      });

      // Optionally redirect or stay on page
      // router.push('/master/jobs/templates');
    } catch (err: any) {
      console.error('Error creating job template:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to create job template. Please try again.';
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
      <Seo title={"Create Job Template"} />
      <Pageheader currentpage="Create Job Template" activepage="Jobs" mainpage="Create Job Template" />
      
      <div className="grid grid-cols-12 gap-x-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box">
            <div className="box-header">
              <div className="box-title">Job Template Information</div>
            </div>
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="alert alert-danger mb-4" role="alert">
                    {error}
                  </div>
                )}

                {/* Template Title */}
                <div className="mb-3">
                  <label htmlFor="title" className="form-label">
                    Template Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Software Engineer Template"
                    required
                  />
                </div>

                {/* Job Description */}
                <div className="mb-3">
                  <label htmlFor="jobDescription" className="form-label">
                    Job Description <span className="text-danger">*</span>
                  </label>
                  <div id="job-description-editor">
                    <Editordata 
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

                {/* Submit Button */}
                <div className="mb-3">
                  <button
                    type="submit"
                    className="ti-btn !ti-btn-primary !bg-primary !text-white !py-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating...
                      </>
                    ) : (
                      'Create Template'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-light ms-2 !ti-btn-light !bg-light !text-black rounded-sm py-1.5 px-3"
                    onClick={() => {
                      setFormData({
                        title: '',
                        jobDescription: '',
                      });
                      setError(null);
                    }}
                    disabled={isSubmitting}
                  >
                    Reset
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

export default CreateJobTemplate;

