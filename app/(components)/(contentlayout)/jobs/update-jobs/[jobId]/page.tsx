"use client";

import React, { Fragment, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import { getJobById, updateJob } from "@/shared/lib/jobs";
import Editordata from "@/shared/data/apps/projects/createprojectdata";

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

const defaultFormData: JobFormData = {
  title: "",
  organisation: {
    name: "",
    website: "",
    email: "",
    phone: "",
    address: "",
    description: "",
  },
  jobDescription: "",
  jobType: "Full-time",
  location: "",
  skillTags: [],
  salaryRange: {
    min: 0,
    max: 0,
    currency: "USD",
  },
  experienceLevel: "Mid Level",
  status: "Draft",
  templateId: "",
};

const UpdateJob = () => {
  const router = useRouter();
  const params = useParams();
  const jobId = (params?.jobId as string) || "";

  const [formData, setFormData] = useState<JobFormData>(defaultFormData);
  const [skillTagInput, setSkillTagInput] = useState("");
  const [loadingJob, setLoadingJob] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const fetchJobDetails = async () => {
      setLoadingJob(true);
      setError(null);
      try {
        const data = await getJobById(jobId);
        
        // Process job description: decode HTML entities and clean malformed HTML
        // ReactQuill will display HTML as formatted text (not raw HTML tags)
        const description = data?.jobDescription || '';
        let formattedDescription = '';
        
        if (description.trim() && typeof window !== 'undefined') {
          // Decode HTML entities if they exist (e.g., &lt;p&gt; -> <p>)
          const textarea = document.createElement('textarea');
          textarea.innerHTML = description;
          let decodedDescription = textarea.value;
          
          // Clean up malformed HTML (remove nested empty p tags, fix structure)
          // Replace multiple consecutive <p> tags with single ones
          decodedDescription = decodedDescription.replace(/<p>\s*<p>/g, '<p>');
          decodedDescription = decodedDescription.replace(/<\/p>\s*<\/p>/g, '</p>');
          
          // Check if it contains HTML tags
          if (decodedDescription.includes('<') && decodedDescription.includes('>')) {
            // It's HTML, use it as-is (ReactQuill will render it as formatted text)
            formattedDescription = decodedDescription;
          } else {
            // Plain text, wrap in paragraph
            formattedDescription = `<p>${decodedDescription}</p>`;
          }
        } else if (description.trim()) {
          // Server-side: basic HTML entity decoding
          formattedDescription = description
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        }
        
        setFormData({
          title: data?.title || "",
          organisation: {
            name: data?.organisation?.name || "",
            website: data?.organisation?.website || "",
            email: data?.organisation?.email || "",
            phone: data?.organisation?.phone || "",
            address: data?.organisation?.address || "",
            description: data?.organisation?.description || "",
          },
          jobDescription: formattedDescription || description || "",
          jobType: data?.jobType || "Full-time",
          location: data?.location || "",
          skillTags: Array.isArray(data?.skillTags) ? data.skillTags : [],
          salaryRange: {
            min: data?.salaryRange?.min ?? 0,
            max: data?.salaryRange?.max ?? 0,
            currency: data?.salaryRange?.currency || "USD",
          },
          experienceLevel: data?.experienceLevel || "Mid Level",
          status: data?.status || "Draft",
          templateId:
            typeof data?.templateId === "object"
              ? data?.templateId?.id || data?.templateId?.name || ""
              : data?.templateId || "",
        });
      } catch (err: any) {
        console.error("Failed to fetch job details:", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load job details"
        );
      } finally {
        setLoadingJob(false);
      }
    };

    fetchJobDetails();
  }, [jobId]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    if (name.startsWith("organisation.")) {
      const orgField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        organisation: {
          ...prev.organisation,
          [orgField]: value,
        },
      }));
    } else if (name.startsWith("salaryRange.")) {
      const salaryField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        salaryRange: {
          ...prev.salaryRange,
          [salaryField]:
            salaryField === "currency" ? value : Number(value) || 0,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleAddSkillTag = () => {
    if (skillTagInput.trim() && !formData.skillTags.includes(skillTagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        skillTags: [...prev.skillTags, skillTagInput.trim()],
      }));
    }
    setSkillTagInput("");
  };

  const handleRemoveSkillTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      skillTags: prev.skillTags.filter((item) => item !== tag),
    }));
  };

  const handleSkillTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSkillTag();
    }
  };

  const stripHtml = (html: string): string => {
    if (typeof window === 'undefined') return html.replace(/<[^>]*>/g, '').trim();
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setError("Job title is required");
      return false;
    }
    if (!formData.organisation.name.trim()) {
      setError("Organisation name is required");
      return false;
    }
    if (!formData.organisation.email.trim()) {
      setError("Organisation email is required");
      return false;
    }
    if (!stripHtml(formData.jobDescription)) {
      setError("Job description is required");
      return false;
    }
    if (!formData.location.trim()) {
      setError("Location is required");
      return false;
    }
    if (formData.salaryRange.min < 0 || formData.salaryRange.max < 0) {
      setError("Salary range must be positive numbers");
      return false;
    }
    if (formData.salaryRange.min > formData.salaryRange.max) {
      setError("Minimum salary cannot be greater than maximum salary");
      return false;
    }
    if (
      formData.organisation.email &&
      !formData.organisation.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    ) {
      setError("Please enter a valid email address");
      return false;
    }
    if (
      formData.organisation.website &&
      !formData.organisation.website.match(/^https?:\/\/.+/)
    ) {
      setError("Please enter a valid website URL (starting with http:// or https://)");
      return false;
    }
    return true;
  };

  const buildPayload = () => {
    const payload: any = {
      title: formData.title,
      organisation: {
        name: formData.organisation.name,
        website: formData.organisation.website || undefined,
        email: formData.organisation.email,
        phone: formData.organisation.phone || undefined,
        address: formData.organisation.address || undefined,
        description: formData.organisation.description || undefined,
      },
      jobDescription: formData.jobDescription,
      jobType: formData.jobType,
      location: formData.location,
      skillTags: formData.skillTags,
      salaryRange: {
        min: formData.salaryRange.min,
        max: formData.salaryRange.max,
        currency: formData.salaryRange.currency,
      },
      experienceLevel: formData.experienceLevel,
      status: formData.status,
    };

    if (formData.templateId && formData.templateId.trim()) {
      payload.templateId = formData.templateId.trim();
    }

    Object.keys(payload.organisation).forEach((key) => {
      if (payload.organisation[key] === undefined || payload.organisation[key] === "") {
        delete payload.organisation[key];
      }
    });

    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      await Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: error || "Please fill in all required fields",
        confirmButtonText: "OK",
      });
      return;
    }

    if (!jobId) {
      await Swal.fire({
        icon: "error",
        title: "Invalid Job",
        text: "Job ID is missing.",
        confirmButtonText: "OK",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = buildPayload();
      await updateJob(jobId, payload);

      await Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Job updated successfully!",
        confirmButtonText: "OK",
        timer: 2000,
        timerProgressBar: true,
      });

      router.push("/jobs/manage-jobs");
    } catch (err: any) {
      console.error("Error updating job:", err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to update job. Please try again.";
      setError(errorMessage);

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        confirmButtonText: "OK",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Fragment>
      <Seo title={"Update Job"} />
      <Pageheader currentpage="Update Job" activepage="Jobs" mainpage="Manage Jobs" />

      <div className="grid grid-cols-12 gap-x-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box">
            <div className="box-header">
              <div className="box-title">Job Information</div>
            </div>
            <div className="box-body">
              {loadingJob ? (
                <div className="text-center py-16">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="mt-3 text-[#8c9097] dark:text-white/50">Loading job details...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="alert alert-danger mb-4" role="alert">
                      {error}
                    </div>
                  )}

                  {/* Job Title & Job Type */}
                  <div className="grid grid-cols-12 gap-x-6">
                    <div className="xl:col-span-6 col-span-12">
                      <div className="mb-3">
                        <label htmlFor="title" className="form-label">
                          Job Title <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="title"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          placeholder="e.g., Senior Software Engineer"
                          required
                        />
                      </div>
                    </div>

                    <div className="xl:col-span-6 col-span-12">
                      <div className="mb-3">
                        <label htmlFor="jobType" className="form-label">
                          Job Type <span className="text-danger">*</span>
                        </label>
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
                          <option value="Temporary">Temporary</option>
                          <option value="Internship">Internship</option>
                          <option value="Freelance">Freelance</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Location & Experience */}
                  <div className="grid grid-cols-12 gap-x-6">
                    <div className="xl:col-span-6 col-span-12">
                      <div className="mb-3">
                        <label htmlFor="location" className="form-label">
                          Location <span className="text-danger">*</span>
                        </label>
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
                        <label htmlFor="experienceLevel" className="form-label">
                          Experience Level <span className="text-danger">*</span>
                        </label>
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
                          <option value="Executive">Executive</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Status & Template */}
                  <div className="grid grid-cols-12 gap-x-6">
                    <div className="xl:col-span-6 col-span-12">
                      <div className="mb-3">
                        <label htmlFor="status" className="form-label">
                          Status <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-control"
                          id="status"
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="Draft">Draft</option>
                          <option value="Active">Active</option>
                          <option value="Closed">Closed</option>
                          <option value="Archived">Archived</option>
                        </select>
                      </div>
                    </div>

                    <div className="xl:col-span-6 col-span-12">
                      <div className="mb-3">
                        <label htmlFor="templateId" className="form-label">
                          Template ID (Optional)
                        </label>
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
                    <label htmlFor="jobDescription" className="form-label">
                      Job Description <span className="text-danger">*</span>
                    </label>
                    <div id="job-description-editor">
                      <Editordata 
                        key={jobId || 'update-job'}
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

                  {/* Organisation */}
                  <div className="mb-4">
                    <h5 className="mb-3">Organisation Details</h5>
                    <div className="grid grid-cols-12 gap-x-6">
                      <div className="xl:col-span-6 col-span-12">
                        <div className="mb-3">
                          <label htmlFor="organisation.name" className="form-label">
                            Organisation Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            id="organisation.name"
                            name="organisation.name"
                            value={formData.organisation.name}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                      <div className="xl:col-span-6 col-span-12">
                        <div className="mb-3">
                          <label htmlFor="organisation.website" className="form-label">
                            Organisation Website
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            id="organisation.website"
                            name="organisation.website"
                            value={formData.organisation.website}
                            onChange={handleInputChange}
                            placeholder="https://example.com"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-x-6">
                      <div className="xl:col-span-6 col-span-12">
                        <div className="mb-3">
                          <label htmlFor="organisation.email" className="form-label">
                            Organisation Email <span className="text-danger">*</span>
                          </label>
                          <input
                            type="email"
                            className="form-control"
                            id="organisation.email"
                            name="organisation.email"
                            value={formData.organisation.email}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                      <div className="xl:col-span-6 col-span-12">
                        <div className="mb-3">
                          <label htmlFor="organisation.phone" className="form-label">
                            Organisation Phone
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            id="organisation.phone"
                            name="organisation.phone"
                            value={formData.organisation.phone}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-x-6">
                      <div className="xl:col-span-6 col-span-12">
                        <div className="mb-3">
                          <label htmlFor="organisation.address" className="form-label">
                            Organisation Address
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            id="organisation.address"
                            name="organisation.address"
                            value={formData.organisation.address}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                      <div className="xl:col-span-6 col-span-12">
                        <div className="mb-3">
                          <label htmlFor="organisation.description" className="form-label">
                            Organisation Description
                          </label>
                          <textarea
                            className="form-control"
                            id="organisation.description"
                            name="organisation.description"
                            value={formData.organisation.description}
                            onChange={handleInputChange}
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Salary Range */}
                  <div className="mb-4">
                    <h5 className="mb-3">Salary Range</h5>
                    <div className="grid grid-cols-12 gap-x-6">
                      <div className="xl:col-span-4 col-span-12">
                        <div className="mb-3">
                          <label htmlFor="salaryRange.min" className="form-label">
                            Minimum Salary
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            id="salaryRange.min"
                            name="salaryRange.min"
                            value={formData.salaryRange.min}
                            onChange={handleInputChange}
                            min={0}
                          />
                        </div>
                      </div>
                      <div className="xl:col-span-4 col-span-12">
                        <div className="mb-3">
                          <label htmlFor="salaryRange.max" className="form-label">
                            Maximum Salary
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            id="salaryRange.max"
                            name="salaryRange.max"
                            value={formData.salaryRange.max}
                            onChange={handleInputChange}
                            min={0}
                          />
                        </div>
                      </div>
                      <div className="xl:col-span-4 col-span-12">
                        <div className="mb-3">
                          <label htmlFor="salaryRange.currency" className="form-label">
                            Currency
                          </label>
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
                            <option value="AUD">AUD</option>
                            <option value="CAD">CAD</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Skill Tags */}
                  <div className="mb-4">
                    <h5 className="mb-3">Skill Tags</h5>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.skillTags.map((tag) => (
                        <span
                          key={tag}
                          className="badge bg-primary/10 text-primary d-inline-flex align-items-center gap-1"
                        >
                          {tag}
                          <button
                            type="button"
                            className="btn-close btn-sm ms-1"
                            onClick={() => handleRemoveSkillTag(tag)}
                            aria-label="Remove skill tag"
                          ></button>
                        </span>
                      ))}
                      {formData.skillTags.length === 0 && (
                        <span className="text-[#8c9097] dark:text-white/50">
                          No skill tags added yet.
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <input
                        type="text"
                        className="form-control max-w-[20rem]"
                        placeholder="Add a skill and press Enter"
                        value={skillTagInput}
                        onChange={(e) => setSkillTagInput(e.target.value)}
                        onKeyDown={handleSkillTagKeyDown}
                      />
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary ti-btn-wave"
                        onClick={handleAddSkillTag}
                      >
                        Add Skill
                      </button>
                    </div>
                  </div>

                  <div className="text-end">
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary ti-btn-wave"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Updating..." : "Update Job"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default UpdateJob;

