"use client";
import React, { Fragment, useState, useEffect, useCallback } from 'react';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import { getJobTemplates, getJobTemplateById, updateJobTemplate, deleteJobTemplate } from '@/shared/lib/jobs';
import Link from 'next/link';
import Swal from 'sweetalert2';
import Editordata from '@/shared/data/apps/projects/createprojectdata';

interface Template {
  id: string;
  title: string;
  jobDescription: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const JobTemplates = () => {
  // State
  const [allTemplates, setAllTemplates] = useState<Template[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [titleFilter, setTitleFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt:desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  
  // Modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateDetail, setTemplateDetail] = useState<Template | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  
  // Update modal state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateFormData, setUpdateFormData] = useState({ title: '', jobDescription: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  // Delete state
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  // Fetch templates - fetch all and filter client-side for partial matching
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: 1,
        limit: 1000, // Fetch a large number to enable client-side filtering
        sortBy: sortBy,
      };

      const response = await getJobTemplates(params);
      
      let fetchedTemplates: Template[] = [];
      if (response && response.results) {
        fetchedTemplates = response.results;
      } else if (Array.isArray(response)) {
        fetchedTemplates = response;
      }

      setAllTemplates(fetchedTemplates);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch templates');
      setAllTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  // Filter templates client-side for partial matching
  useEffect(() => {
    let filtered = [...allTemplates];

    // Apply title filter with case-insensitive partial matching
    if (titleFilter.trim()) {
      const filterLower = titleFilter.trim().toLowerCase();
      filtered = filtered.filter(template =>
        template.title?.toLowerCase().includes(filterLower)
      );
    }

    // Calculate pagination
    const total = filtered.length;
    const totalPagesCount = Math.ceil(total / limit);
    setTotalPages(totalPagesCount);
    setTotalResults(total);

    // Apply pagination
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTemplates = filtered.slice(startIndex, endIndex);

    setTemplates(paginatedTemplates);
  }, [allTemplates, titleFilter, currentPage, limit]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [titleFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Decode HTML for display
  const decodeHtml = (html: string): string => {
    if (!html) return '';
    let decoded = '';
    
    if (typeof window === 'undefined') {
      // Server-side: basic HTML entity decoding
      decoded = html
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
    } else {
      // Client-side: use DOM to decode
      const textarea = document.createElement('textarea');
      textarea.innerHTML = html;
      decoded = textarea.value;
    }
    
    // Clean up malformed HTML (remove nested empty p tags, fix structure)
    decoded = decoded.replace(/<p>\s*<p>/g, '<p>');
    decoded = decoded.replace(/<\/p>\s*<\/p>/g, '</p>');
    
    // If it doesn't contain HTML tags but has content, wrap in paragraph
    if (decoded.trim() && !decoded.includes('<') && !decoded.includes('>')) {
      decoded = `<p>${decoded}</p>`;
    }
    
    return decoded;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle view template details
  const handleViewTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsDetailModalOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setTemplateDetail(null);

    try {
      const data = await getJobTemplateById(templateId);
      setTemplateDetail(data);
    } catch (err: any) {
      setDetailError(err?.response?.data?.message || err?.message || 'Failed to load template details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Close detail modal
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTemplateId(null);
    setTemplateDetail(null);
    setDetailError(null);
  };

  // Handle edit template
  const handleEditTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsUpdateModalOpen(true);
    setUpdateError(null);
    setUpdateFormData({ title: '', jobDescription: '' });
    setDetailLoading(true);

    try {
      const data = await getJobTemplateById(templateId);
      
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
      } else {
        formattedDescription = '';
      }
      
      setUpdateFormData({
        title: data.title || '',
        jobDescription: formattedDescription,
      });
    } catch (err: any) {
      setUpdateError(err?.response?.data?.message || err?.message || 'Failed to load template for editing');
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.message || err?.message || 'Failed to load template for editing',
        confirmButtonText: 'OK'
      });
    } finally {
      setDetailLoading(false);
    }
  };

  // Close update modal
  const closeUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedTemplateId(null);
    setUpdateFormData({ title: '', jobDescription: '' });
    setUpdateError(null);
  };

  // Handle update form input change
  const handleUpdateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUpdateFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Strip HTML for validation
  const stripHtml = (html: string): string => {
    if (typeof window === 'undefined') return html.replace(/<[^>]*>/g, '').trim();
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Validate update form
  const validateUpdateForm = (): boolean => {
    if (!updateFormData.title.trim()) {
      setUpdateError('Template title is required');
      return false;
    }
    if (!stripHtml(updateFormData.jobDescription)) {
      setUpdateError('Job description is required');
      return false;
    }
    return true;
  };

  // Handle update form submission
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);

    if (!validateUpdateForm()) {
      await Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: updateError || 'Please fill in all required fields',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (!selectedTemplateId) return;

    setIsUpdating(true);

    try {
      const payload = {
        title: updateFormData.title.trim(),
        jobDescription: updateFormData.jobDescription || '<p></p>',
      };

      await updateJobTemplate(selectedTemplateId, payload);

      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Template updated successfully!',
        confirmButtonText: 'OK',
        timer: 2000,
        timerProgressBar: true
      });

      // Refresh templates list
      fetchTemplates();
      
      // Close modal
      closeUpdateModal();
    } catch (err: any) {
      console.error('Error updating template:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update template. Please try again.';
      setUpdateError(errorMessage);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle delete template
  const handleDeleteTemplate = async (templateId: string, templateTitle: string) => {
    if (!templateId || deletingTemplateId) return;

    const result = await Swal.fire({
      title: 'Delete this template?',
      text: `Are you sure you want to delete "${templateTitle}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setDeletingTemplateId(templateId);
      await deleteJobTemplate(templateId);

      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Template deleted successfully.',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });

      // Refresh templates list
      fetchTemplates();
      
      // Reset to page 1 if current page becomes empty
      if (templates.length === 1 && currentPage > 1) {
        setCurrentPage(1);
      }
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.message || err?.message || 'Failed to delete template. Please try again.',
        confirmButtonText: 'OK'
      });
    } finally {
      setDeletingTemplateId(null);
    }
  };

  return (
    <Fragment>
      <Seo title={"Job Templates"} />
      <Pageheader currentpage="Job Templates" activepage="Jobs" mainpage="Job Templates" />
      <div className="grid grid-cols-12 gap-x-6">
        <div className="col-span-12">
          <div className="box box-card">
            <div className="box-header justify-between">
              <div className="box-title">
                Job Templates List
              </div>
              <div className="sm:flex items-center gap-2 flex-wrap">
                {/* Sort */}
                <div className="">
                  <select
                    className="ti-form-control form-control-sm w-full"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="createdAt:desc">Newest First</option>
                    <option value="createdAt:asc">Oldest First</option>
                    <option value="title:asc">Title A-Z</option>
                    <option value="title:desc">Title Z-A</option>
                    <option value="usageCount:desc">Most Used</option>
                    <option value="usageCount:asc">Least Used</option>
                  </select>
                </div>
                <Link
                  href="/master/jobs/create-template"
                  className="ti-btn ti-btn-primary-full !py-1 !px-3 !text-[0.75rem] !m-0 !gap-1 !font-medium"
                >
                  <i className="ri-add-line"></i> Create Template
                </Link>
              </div>
            </div>
            <div className="box-body">
              {/* Search */}
              <div className="grid grid-cols-12 gap-4 mb-4">
                <div className="lg:col-span-6 md:col-span-6 col-span-12">
                  <input
                    className="ti-form-control form-control-sm w-full"
                    type="text"
                    placeholder="Search by title..."
                    value={titleFilter}
                    onChange={(e) => setTitleFilter(e.target.value)}
                  />
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-[#8c9097] dark:text-white/50">Loading templates...</p>
                </div>
              )}

              {/* Error State */}
              {error && !loading && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              {/* Templates Table */}
              {!loading && !error && (
                <>
                  <div className="table-responsive">
                    <table className="table whitespace-nowrap table-hover border table-bordered min-w-full">
                      <thead>
                        <tr>
                          <th scope="col" className="text-start">Title</th>
                          <th scope="col" className="text-start">Description</th>
                          <th scope="col" className="text-start">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {templates.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center py-8 text-[#8c9097] dark:text-white/50">
                              No templates found
                            </td>
                          </tr>
                        ) : (
                          templates.map((template) => (
                            <tr
                              key={template.id}
                              className="border hover:bg-gray-100 dark:hover:bg-light dark:border-defaultborder/10 border-defaultborder !border-x-0"
                            >
                              <td>
                                <div className="font-semibold">{template.title || '-'}</div>
                              </td>
                              <td>
                                {template.jobDescription ? (
                                  <div 
                                    className="text-[0.9375rem] text-[#8c9097] dark:text-white/70 ql-editor"
                                    dangerouslySetInnerHTML={{ __html: decodeHtml(template.jobDescription) }}
                                  />
                                ) : (
                                  <p className="text-[0.9375rem] text-[#8c9097] dark:text-white/70">
                                    No description provided.
                                  </p>
                                )}
                              </td>
                              <td>
                                <div className="flex flex-row items-center !gap-2 text-[0.9375rem]">
                                  <button
                                    type="button"
                                    onClick={() => handleViewTemplate(template.id)}
                                    className="ti-btn ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-info/10 text-info hover:bg-info hover:text-white hover:border-info"
                                    aria-label="View"
                                  >
                                    <i className="ri-eye-line"></i>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEditTemplate(template.id)}
                                    className="ti-btn ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-primary/10 text-primary hover:bg-primary hover:text-white hover:border-primary"
                                    aria-label="Edit"
                                  >
                                    <i className="ri-edit-line"></i>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTemplate(template.id, template.title)}
                                    className="ti-btn ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-danger/10 text-danger hover:bg-danger hover:text-white hover:border-danger disabled:opacity-60 disabled:cursor-not-allowed"
                                    aria-label="Delete"
                                    disabled={deletingTemplateId === template.id}
                                  >
                                    {deletingTemplateId === template.id ? (
                                      <i className="ri-loader-4-line animate-spin"></i>
                                    ) : (
                                      <i className="ri-delete-bin-line"></i>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="box-footer">
                      <div className="sm:flex items-center">
                        <div className="dark:text-defaulttextcolor/70">
                          Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalResults)} of {totalResults} entries
                        </div>
                        <div className="ms-auto">
                          <nav aria-label="Page navigation" className="pagination-style-4">
                            <ul className="ti-pagination mb-0">
                              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                <button
                                  className="page-link"
                                  onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                                  disabled={currentPage === 1}
                                >
                                  Prev
                                </button>
                              </li>
                              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                if (
                                  page === 1 ||
                                  page === totalPages ||
                                  (page >= currentPage - 1 && page <= currentPage + 1)
                                ) {
                                  return (
                                    <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                                      <button
                                        className="page-link"
                                        onClick={() => handlePageChange(page)}
                                      >
                                        {page}
                                      </button>
                                    </li>
                                  );
                                } else if (page === currentPage - 2 || page === currentPage + 2) {
                                  return (
                                    <li key={page} className="page-item">
                                      <span className="page-link">...</span>
                                    </li>
                                  );
                                }
                                return null;
                              })}
                              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                <button
                                  className="page-link !text-primary"
                                  onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                                  disabled={currentPage === totalPages}
                                >
                                  Next
                                </button>
                              </li>
                            </ul>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeDetailModal} />
          <div className="relative z-10 w-full max-w-4xl mx-4 rounded-lg bg-white dark:bg-bodybg shadow-lg">
            <div className="flex items-center justify-between border-b border-defaultborder dark:border-defaultborder/10 px-4 py-3">
              <h3 className="text-lg font-semibold">Template Details</h3>
              <button 
                onClick={closeDetailModal} 
                className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-light" 
                aria-label="Close"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
              {detailLoading && (
                <div className="py-6 text-center text-[#8c9097] dark:text-white/50">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2">Loading template details...</p>
                </div>
              )}
              {!detailLoading && detailError && (
                <div className="alert alert-danger" role="alert">
                  {detailError}
                </div>
              )}
              {!detailLoading && !detailError && templateDetail && (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-[#8c9097] dark:text-white/50 mb-1">Title</div>
                    <div className="text-lg font-semibold">{templateDetail.title || '-'}</div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-[#8c9097] dark:text-white/50 mb-2">Job Description</div>
                    <div className="border border-dashed border-defaultborder dark:border-defaultborder/10 rounded-md p-4">
                      {templateDetail.jobDescription ? (
                        <div 
                          className="text-[0.9375rem] text-[#8c9097] dark:text-white/70 ql-editor"
                          dangerouslySetInnerHTML={{ __html: decodeHtml(templateDetail.jobDescription) }}
                        />
                      ) : (
                        <p className="text-[0.9375rem] text-[#8c9097] dark:text-white/70">
                          No description provided.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-defaultborder dark:border-defaultborder/10">
                    <div>
                      <div className="text-xs text-[#8c9097] dark:text-white/50 mb-1">Created By</div>
                      <div className="font-medium">{templateDetail.createdBy?.name || '-'}</div>
                      {templateDetail.createdBy?.email && (
                        <div className="text-sm text-[#8c9097] dark:text-white/50">
                          {templateDetail.createdBy.email}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-[#8c9097] dark:text-white/50 mb-1">Usage Count</div>
                      <div className="font-medium">
                        <span className="badge bg-primary/10 text-primary">
                          {templateDetail.usageCount || 0}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#8c9097] dark:text-white/50 mb-1">Last Used</div>
                      <div className="text-sm">
                        {templateDetail.lastUsedAt ? formatDateTime(templateDetail.lastUsedAt) : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#8c9097] dark:text-white/50 mb-1">Created At</div>
                      <div className="text-sm">{formatDate(templateDetail.createdAt)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#8c9097] dark:text-white/50 mb-1">Updated At</div>
                      <div className="text-sm">{formatDate(templateDetail.updatedAt)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeUpdateModal} />
          <div className="relative z-10 w-full max-w-4xl mx-4 rounded-lg bg-white dark:bg-bodybg shadow-lg">
            <div className="flex items-center justify-between border-b border-defaultborder dark:border-defaultborder/10 px-4 py-3">
              <h3 className="text-lg font-semibold">Update Template</h3>
              <button 
                onClick={closeUpdateModal} 
                className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-light" 
                aria-label="Close"
                disabled={isUpdating}
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto px-4 py-4">
              {detailLoading && (
                <div className="py-6 text-center text-[#8c9097] dark:text-white/50">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2">Loading template...</p>
                </div>
              )}
              {!detailLoading && (
                <form onSubmit={handleUpdateSubmit}>
                  {updateError && (
                    <div className="alert alert-danger mb-4" role="alert">
                      {updateError}
                    </div>
                  )}

                  {/* Template Title */}
                  <div className="mb-3">
                    <label htmlFor="update-title" className="form-label">
                      Template Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="update-title"
                      name="title"
                      value={updateFormData.title}
                      onChange={handleUpdateInputChange}
                      placeholder="e.g., Software Engineer Template"
                      required
                      disabled={isUpdating}
                    />
                  </div>

                  {/* Job Description */}
                  <div className="mb-3">
                    <label htmlFor="update-jobDescription" className="form-label">
                      Job Description <span className="text-danger">*</span>
                    </label>
                    <div id="update-job-description-editor">
                      <Editordata 
                        key={selectedTemplateId || 'update-editor'}
                        value={updateFormData.jobDescription}
                        onChange={(html: string) => {
                          setUpdateFormData(prev => ({
                            ...prev,
                            jobDescription: html
                          }));
                        }}
                      />
                    </div>
                    {!stripHtml(updateFormData.jobDescription) && (
                      <div className="text-danger text-sm mt-1">Job description is required</div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="mb-3 flex gap-2">
                    <button
                      type="submit"
                      className="ti-btn !ti-btn-primary !bg-primary !text-white !py-1"
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Updating...
                        </>
                      ) : (
                        'Update Template'
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-light !ti-btn-light !bg-light !text-black rounded-sm py-1.5 px-3"
                      onClick={closeUpdateModal}
                      disabled={isUpdating}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
};

export default JobTemplates;

