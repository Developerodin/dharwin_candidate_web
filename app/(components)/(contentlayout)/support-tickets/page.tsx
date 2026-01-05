"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import Swal from "sweetalert2";
import {
  createSupportTicket,
  getAllSupportTickets,
  getSupportTicketById,
  updateSupportTicket,
  addCommentToTicket,
  deleteSupportTicket,
  type TicketFilters
} from '@/shared/lib/supportTickets';

const SupportTickets = () => {
  // State management
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState<string>('createdAt:desc');
  
  // User role
  const [userRole, setUserRole] = useState<string>('user');
  const [userId, setUserId] = useState<string>('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  
  // Create ticket form
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
    category: 'General'
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Comment form
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  
  // Update ticket form (admin only)
  const [updateForm, setUpdateForm] = useState({
    status: '',
    priority: '',
    category: '',
    assignedTo: ''
  });
  const [updatingTicket, setUpdatingTicket] = useState(false);
  
  // Get user role and ID from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUserRole(parsedUser.role || 'user');
          setUserId(parsedUser.id || parsedUser._id || '');
        } catch (error) {
          console.error('Error parsing user data:', error);
          setUserRole('user');
        }
      }
    }
  }, []);

  // Build filter parameters
  const buildFilterParams = (): TicketFilters => {
    const params: TicketFilters = {
      page: currentPage,
      limit: limit,
      sortBy: sortBy,
    };

    if (statusFilter) params.status = statusFilter as any;
    if (priorityFilter) params.priority = priorityFilter as any;
    if (categoryFilter.trim()) params.category = categoryFilter.trim();

    return params;
  };

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildFilterParams();
      const data = await getAllSupportTickets(params);
      
      if (data && data.results) {
        setTickets(data.results);
        setTotalPages(data.totalPages || 1);
        setTotalResults(data.totalResults || 0);
      } else if (Array.isArray(data)) {
        setTickets(data);
        setTotalPages(1);
        setTotalResults(data.length);
      } else {
        setTickets([]);
        setTotalPages(1);
        setTotalResults(0);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to fetch support tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, sortBy, statusFilter, priorityFilter, categoryFilter]);

  // Fetch tickets when filters change
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Debounce category filter
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchTickets();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [categoryFilter]);

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Open create ticket modal
  const openCreateModal = () => {
    setCreateForm({
      title: '',
      description: '',
      priority: 'Medium',
      category: 'General'
    });
    setAttachments([]);
    setAttachmentErrors([]);
    setShowCreateModal(true);
  };

  // Close create ticket modal
  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm({
      title: '',
      description: '',
      priority: 'Medium',
      category: 'General'
    });
    setAttachments([]);
    setAttachmentErrors([]);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const errors: string[] = [];
    const validFiles: File[] = [];

    // Check total file count
    if (attachments.length + files.length > 10) {
      errors.push('Maximum 10 files allowed. Please select fewer files.');
      setAttachmentErrors(errors);
      return;
    }

    // Validate each file
    files.forEach((file) => {
      // Check file size (100MB = 100 * 1024 * 1024 bytes)
      const maxSize = 100 * 1024 * 1024;
      if (file.size > maxSize) {
        errors.push(`${file.name}: File size exceeds 100MB limit.`);
        return;
      }

      // Check file type
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
      const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
      const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: File type not allowed. Allowed: Images (JPEG, PNG, GIF, WEBP, BMP, SVG) and Videos (MP4, WEBM, MOV, AVI, MKV)`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setAttachmentErrors(errors);
    } else {
      setAttachmentErrors([]);
    }

    setAttachments([...attachments, ...validFiles]);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
    setAttachmentErrors([]);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Handle create ticket
  const handleCreateTicket = async () => {
    // Validate title (5-200 characters)
    if (!createForm.title.trim() || createForm.title.length < 5) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Title',
        text: 'Title must be at least 5 characters long.',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (createForm.title.length > 200) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Title',
        text: 'Title must not exceed 200 characters.',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Validate description (10-5000 characters)
    if (!createForm.description.trim() || createForm.description.length < 10) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Description',
        text: 'Description must be at least 10 characters long.',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (createForm.description.length > 5000) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Description',
        text: 'Description must not exceed 5000 characters.',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Check for attachment errors
    if (attachmentErrors.length > 0) {
      await Swal.fire({
        icon: 'error',
        title: 'File Upload Error',
        html: attachmentErrors.join('<br>'),
        confirmButtonText: 'OK'
      });
      return;
    }

    try {
      setCreatingTicket(true);
      await createSupportTicket({
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        priority: createForm.priority,
        category: createForm.category.trim() || 'General',
        attachments: attachments.length > 0 ? attachments : undefined
      });

      await Swal.fire({
        icon: 'success',
        title: 'Ticket Created!',
        text: 'Your support ticket has been created successfully.',
        timer: 2000,
        showConfirmButton: false
      });

      closeCreateModal();
      fetchTickets();
    } catch (error: any) {
      console.error('Create ticket error:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Failed to Create Ticket',
        text: error?.response?.data?.message || error?.message || 'Failed to create ticket. Please try again.',
        confirmButtonText: 'OK'
      });
    } finally {
      setCreatingTicket(false);
    }
  };

  // Open ticket details modal
  const openTicketModal = async (ticket: any) => {
    setSelectedTicket(ticket);
    setCommentText('');
    setUpdateForm({
      status: ticket.status || '',
      priority: ticket.priority || '',
      category: ticket.category || '',
      assignedTo: ticket.assignedTo?.id || ticket.assignedTo?._id || ''
    });
    setShowTicketModal(true);
    
    // Fetch latest ticket data
    try {
      const ticketId = ticket.id || ticket._id;
      const latestTicket = await getSupportTicketById(ticketId);
      setSelectedTicket(latestTicket);
      setUpdateForm({
        status: latestTicket.status || '',
        priority: latestTicket.priority || '',
        category: latestTicket.category || '',
        assignedTo: latestTicket.assignedTo?.id || latestTicket.assignedTo?._id || ''
      });
    } catch (error) {
      console.error('Failed to fetch ticket details:', error);
    }
  };

  // Close ticket details modal
  const closeTicketModal = () => {
    setShowTicketModal(false);
    setSelectedTicket(null);
    setCommentText('');
    setUpdateForm({
      status: '',
      priority: '',
      category: '',
      assignedTo: ''
    });
  };

  // Handle add comment
  const handleAddComment = async () => {
    // Validate comment (5-2000 characters)
    if (!commentText.trim() || commentText.length < 5) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Comment',
        text: 'Comment must be at least 5 characters long.',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (commentText.length > 2000) {
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Comment',
        text: 'Comment must not exceed 2000 characters.',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (!selectedTicket) return;

    try {
      setAddingComment(true);
      const ticketId = selectedTicket.id || selectedTicket._id;
      const updatedTicket = await addCommentToTicket(ticketId, commentText.trim());

      setCommentText('');
      
      // Update selected ticket with new comment
      const latestTicket = await getSupportTicketById(ticketId);
      setSelectedTicket(latestTicket);
      
      // Update ticket in list
      setTickets(prev => prev.map(t => {
        const tId = t.id || t._id;
        return tId === ticketId ? latestTicket : t;
      }));

      await Swal.fire({
        icon: 'success',
        title: 'Comment Added!',
        text: 'Your comment has been added successfully.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error: any) {
      console.error('Add comment error:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Failed to Add Comment',
        text: error?.response?.data?.message || error?.message || 'Failed to add comment. Please try again.',
        confirmButtonText: 'OK'
      });
    } finally {
      setAddingComment(false);
    }
  };

  // Handle update ticket (admin only)
  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;

    const updateData: any = {};
    if (updateForm.status && updateForm.status !== selectedTicket.status) {
      updateData.status = updateForm.status;
    }
    if (updateForm.priority && updateForm.priority !== selectedTicket.priority) {
      updateData.priority = updateForm.priority;
    }
    if (updateForm.category && updateForm.category !== selectedTicket.category) {
      updateData.category = updateForm.category;
    }
    if (updateForm.assignedTo && updateForm.assignedTo !== (selectedTicket.assignedTo?.id || selectedTicket.assignedTo?._id)) {
      updateData.assignedTo = updateForm.assignedTo;
    }

    if (Object.keys(updateData).length === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'No Changes',
        text: 'No changes were made to the ticket.',
        confirmButtonText: 'OK'
      });
      return;
    }

    try {
      setUpdatingTicket(true);
      const ticketId = selectedTicket.id || selectedTicket._id;
      const updatedTicket = await updateSupportTicket(ticketId, updateData);

      // Fetch latest ticket data
      const latestTicket = await getSupportTicketById(ticketId);
      setSelectedTicket(latestTicket);
      setUpdateForm({
        status: latestTicket.status || '',
        priority: latestTicket.priority || '',
        category: latestTicket.category || '',
        assignedTo: latestTicket.assignedTo?.id || latestTicket.assignedTo?._id || ''
      });

      // Update ticket in list
      setTickets(prev => prev.map(t => {
        const tId = t.id || t._id;
        return tId === ticketId ? latestTicket : t;
      }));

      await Swal.fire({
        icon: 'success',
        title: 'Ticket Updated!',
        text: 'Ticket has been updated successfully.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error: any) {
      console.error('Update ticket error:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Failed to Update Ticket',
        text: error?.response?.data?.message || error?.message || 'Failed to update ticket. Please try again.',
        confirmButtonText: 'OK'
      });
    } finally {
      setUpdatingTicket(false);
    }
  };

  // Handle delete ticket (admin only)
  const handleDeleteTicket = async (ticket: any) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const ticketId = ticket.id || ticket._id;
          await deleteSupportTicket(ticketId);

          if (selectedTicket && (selectedTicket.id || selectedTicket._id) === ticketId) {
            closeTicketModal();
          }

          fetchTickets();
          
          await Swal.fire(
            "Deleted!",
            "The ticket has been deleted.",
            "success"
          );
        } catch (error: any) {
          console.error('Delete ticket error:', error);
          await Swal.fire(
            "Delete failed",
            error?.response?.data?.message || error?.message || "Unable to delete ticket.",
            "error"
          );
        }
      }
    });
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-100 text-blue-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      case 'Closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get priority badge color
  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'Low':
        return 'bg-gray-100 text-gray-800';
      case 'Medium':
        return 'bg-blue-100 text-blue-800';
      case 'High':
        return 'bg-orange-100 text-orange-800';
      case 'Urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isAdmin = userRole === 'admin';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Support Tickets</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {totalResults} {totalResults === 1 ? 'ticket' : 'tickets'} found
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-bodydark rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <input
              type="text"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="Filter by category"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Tickets List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white dark:bg-bodydark rounded-lg shadow-sm p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No tickets found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {statusFilter || priorityFilter || categoryFilter
              ? 'Try adjusting your filters.'
              : 'Get started by creating a new support ticket.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-bodydark rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ticket ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created By
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-bodydark divide-y divide-gray-200 dark:divide-gray-700">
                {tickets.map((ticket) => {
                  const ticketId = ticket.id || ticket._id;
                  const canView = isAdmin || (ticket.createdBy?.id || ticket.createdBy?._id || ticket.candidate?.id || ticket.candidate?._id) === userId;
                  
                  return (
                    <tr key={ticketId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-900 dark:text-white">
                          {ticket.ticketId || ticketId.slice(-8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {ticket.title}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {ticket.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {ticket.category || 'General'}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {ticket.createdBy?.name || ticket.candidate?.fullName || 'N/A'}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(ticket.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-center gap-1">
                          {canView && (
                            <button
                              onClick={() => openTicketModal(ticket)}
                              className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-success/10 text-success hover:bg-success hover:text-white hover:border-success"
                              title="View Details"
                            >
                              <i className="ri-eye-line"></i>
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteTicket(ticket)}
                              className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-danger/10 text-danger hover:bg-danger hover:text-white hover:border-danger"
                              title="Delete Ticket"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-bodydark px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-bodydark hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-bodydark hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * limit, totalResults)}</span> of{' '}
                    <span className="font-medium">{totalResults}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-bodydark text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 2 && page <= currentPage + 2)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === currentPage
                                ? 'z-10 bg-primary border-primary text-white'
                                : 'bg-white dark:bg-bodydark border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 3 || page === currentPage + 3) {
                        return (
                          <span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-bodydark text-sm font-medium text-gray-700 dark:text-gray-300">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-bodydark text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-bodydark rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Support Ticket</h2>
                <button
                  onClick={closeCreateModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="Enter ticket title (5-200 characters)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                    minLength={5}
                    maxLength={200}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Describe your issue in detail (10-5000 characters)"
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                    minLength={10}
                    maxLength={5000}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority
                    </label>
                    <select
                      value={createForm.priority}
                      onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={createForm.category}
                      onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                      placeholder="e.g., Technical, General"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* File Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Attachments (Optional)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Maximum 10 files, 10MB per file. Allowed: Images (JPEG, PNG, GIF, WEBP, BMP, SVG) and Videos (MP4, WEBM, MOV, AVI, MKV)
                  </p>
                  
                  {/* Attachment Errors */}
                  {attachmentErrors.length > 0 && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      {attachmentErrors.map((error, index) => (
                        <p key={index} className="text-xs text-red-600 dark:text-red-400">{error}</p>
                      ))}
                    </div>
                  )}

                  {/* Selected Files List */}
                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Selected Files ({attachments.length}/10):
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {attachments.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <i className={`ri-${file.type.startsWith('image/') ? 'image' : 'video'}-line text-lg text-gray-500 dark:text-gray-400`}></i>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 dark:text-white truncate">{file.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeAttachment(index)}
                              className="ml-2 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                              title="Remove file"
                            >
                              <i className="ri-close-circle-line text-lg"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeCreateModal}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTicket}
                  disabled={creatingTicket}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingTicket ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Details Modal */}
      {showTicketModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-bodydark rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTicket.title}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Ticket ID: {selectedTicket.ticketId || (selectedTicket.id || selectedTicket._id).slice(-8).toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={closeTicketModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Ticket Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <span className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Priority</p>
                  <span className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeColor(selectedTicket.priority)}`}>
                    {selectedTicket.priority}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {selectedTicket.category || 'General'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {formatDate(selectedTicket.createdAt)}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Attachments */}
              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Attachments ({selectedTicket.attachments.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {selectedTicket.attachments.map((attachment: any, index: number) => {
                      const isImage = attachment.mimeType?.startsWith('image/');
                      const isVideo = attachment.mimeType?.startsWith('video/');
                      
                      return (
                        <div
                          key={attachment.id || attachment._id || index}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800"
                        >
                          {isImage ? (
                            <div className="relative aspect-square bg-gray-100 dark:bg-gray-900">
                              <img
                                src={attachment.url}
                                alt={attachment.originalName || 'Attachment'}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => window.open(attachment.url, '_blank')}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EImage%3C/text%3E%3C/svg%3E';
                                }}
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                                {attachment.originalName || 'Image'}
                              </div>
                            </div>
                          ) : isVideo ? (
                            <div className="relative aspect-square bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                              <video
                                src={attachment.url}
                                controls
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLVideoElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `
                                      <div class="flex flex-col items-center justify-center h-full p-2">
                                        <i class="ri-video-line text-3xl text-gray-400 mb-2"></i>
                                        <p class="text-xs text-gray-500 dark:text-gray-400 text-center truncate w-full">${attachment.originalName || 'Video'}</p>
                                        <a href="${attachment.url}" target="_blank" class="text-xs text-primary mt-1 hover:underline">Open Video</a>
                                      </div>
                                    `;
                                  }
                                }}
                              >
                                Your browser does not support the video tag.
                              </video>
                            </div>
                          ) : (
                            <div className="aspect-square flex flex-col items-center justify-center p-4">
                              <i className="ri-file-line text-3xl text-gray-400 mb-2"></i>
                              <p className="text-xs text-gray-500 dark:text-gray-400 text-center truncate w-full">
                                {attachment.originalName || 'File'}
                              </p>
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary mt-1 hover:underline"
                              >
                                Download
                              </a>
                            </div>
                          )}
                          <div className="p-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={attachment.originalName}>
                              {attachment.originalName || 'Attachment'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {formatFileSize(attachment.size || 0)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Admin Update Form */}
              {isAdmin && (
                <div className="mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Update Ticket</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Status
                      </label>
                      <select
                        value={updateForm.status}
                        onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Priority
                      </label>
                      <select
                        value={updateForm.priority}
                        onChange={(e) => setUpdateForm({ ...updateForm, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                      </label>
                      <input
                        type="text"
                        value={updateForm.category}
                        onChange={(e) => setUpdateForm({ ...updateForm, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleUpdateTicket}
                    disabled={updatingTicket}
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatingTicket ? 'Updating...' : 'Update Ticket'}
                  </button>
                </div>
              )}

              {/* Candidate can only close their own tickets */}
              {!isAdmin && (selectedTicket.createdBy?.id || selectedTicket.createdBy?._id || selectedTicket.candidate?.id || selectedTicket.candidate?._id) === userId && selectedTicket.status !== 'Closed' && (
                <div className="mb-6">
                  <button
                    onClick={async () => {
                      try {
                        const ticketId = selectedTicket.id || selectedTicket._id;
                        await updateSupportTicket(ticketId, { status: 'Closed' });
                        const latestTicket = await getSupportTicketById(ticketId);
                        setSelectedTicket(latestTicket);
                        fetchTickets();
                        await Swal.fire({
                          icon: 'success',
                          title: 'Ticket Closed',
                          text: 'Your ticket has been closed.',
                          timer: 2000,
                          showConfirmButton: false
                        });
                      } catch (error: any) {
                        await Swal.fire({
                          icon: 'error',
                          title: 'Failed to Close Ticket',
                          text: error?.response?.data?.message || error?.message || 'Failed to close ticket.',
                          confirmButtonText: 'OK'
                        });
                      }
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close Ticket
                  </button>
                </div>
              )}

              {/* Comments Section */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Comments ({selectedTicket.comments?.length || 0})
                </h3>
                <div className="space-y-4 max-h-64 overflow-y-auto mb-4">
                  {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                    selectedTicket.comments.map((comment: any) => (
                      <div
                        key={comment.id || comment._id}
                        className={`p-3 rounded-lg ${
                          comment.isAdminComment
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                            : 'bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {comment.commentedBy?.name || comment.commentedBy?.email || 'Unknown'}
                              {comment.isAdminComment && (
                                <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                                  Admin
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(comment.createdAt)}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                </div>

                {/* Add Comment Form */}
                {selectedTicket.status !== 'Closed' && (
                  <div>
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment (5-2000 characters)..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white mb-2"
                      minLength={5}
                      maxLength={2000}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={addingComment || !commentText.trim()}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingComment ? 'Adding...' : 'Add Comment'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTickets;

