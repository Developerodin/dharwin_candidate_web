import api from './api';
import { Support_Tickets_API, Support_Ticket_Comments_API } from './constants';

// Support Ticket Types
export interface CreateTicketData {
  title: string;
  description: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  category?: string;
  attachments?: File[]; // Optional array of files
}

export interface UpdateTicketData {
  status?: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  category?: string;
  assignedTo?: string;
}

export interface TicketFilters {
  status?: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}

// Create a new support ticket with optional file uploads
export const createSupportTicket = async (ticketData: CreateTicketData) => {
  // If files are provided, use FormData
  if (ticketData.attachments && ticketData.attachments.length > 0) {
    const formData = new FormData();
    
    // Add text fields
    formData.append('title', ticketData.title);
    formData.append('description', ticketData.description);
    if (ticketData.priority) {
      formData.append('priority', ticketData.priority);
    }
    if (ticketData.category) {
      formData.append('category', ticketData.category);
    }
    
    // Add files (all files use the same field name 'attachments')
    ticketData.attachments.forEach((file) => {
      formData.append('attachments', file);
    });
    
    const response = await api.post(Support_Tickets_API, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } else {
    // No files, use regular JSON
    const response = await api.post(Support_Tickets_API, {
      title: ticketData.title,
      description: ticketData.description,
      priority: ticketData.priority,
      category: ticketData.category
    });
    return response.data;
  }
};

// Get all support tickets with optional filters
export const getAllSupportTickets = async (filters?: TicketFilters) => {
  const queryParams = new URLSearchParams();
  
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.priority) queryParams.append('priority', filters.priority);
  if (filters?.category) queryParams.append('category', filters.category);
  if (filters?.page) queryParams.append('page', filters.page.toString());
  if (filters?.limit) queryParams.append('limit', filters.limit.toString());
  if (filters?.sortBy) queryParams.append('sortBy', filters.sortBy);
  
  const queryString = queryParams.toString();
  const url = queryString ? `${Support_Tickets_API}?${queryString}` : Support_Tickets_API;
  
  const response = await api.get(url);
  return response.data;
};

// Get a single support ticket by ID
export const getSupportTicketById = async (ticketId: string) => {
  const response = await api.get(`${Support_Tickets_API}/${ticketId}`);
  return response.data;
};

// Update a support ticket
export const updateSupportTicket = async (ticketId: string, updateData: UpdateTicketData) => {
  const response = await api.patch(`${Support_Tickets_API}/${ticketId}`, updateData);
  return response.data;
};

// Add a comment to a support ticket
export const addCommentToTicket = async (ticketId: string, content: string) => {
  const response = await api.post(Support_Ticket_Comments_API(ticketId), { content });
  return response.data;
};

// Delete a support ticket (admin only)
export const deleteSupportTicket = async (ticketId: string) => {
  const response = await api.delete(`${Support_Tickets_API}/${ticketId}`);
  return response.data;
};

