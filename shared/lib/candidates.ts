import api from './api';
import { Attendance_API, Backdated_Attendance_Requests_API, Candidate_SalarySlips_API, Candidates_API, Documents_API, Export_Candidates_API, Fetch_Candidate_Documents_API, Forgot_Password_API, Join_Meeting_API, Leave_Requests_API, Logs_API, Meeting_API, Onboard_Candidate_API, Register_User_API, Share_Candidate_API, Transcription_API, Transcription_Download_API, Transcription_Start_API, Transcription_Status_API, Users_API, Verify_Document_API } from './constants';

// Fetch all leads with optional query parameters
export const fetchAllCandidates = async (params?: {
  owner?: string;
  fullName?: string;
  email?: string;
  employeeId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  skills?: string | string[];
  skillLevel?: string;
  skillMatchMode?: 'all' | 'any';
  experienceLevel?: string;
  minYearsOfExperience?: number;
  maxYearsOfExperience?: number;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  degree?: string;
  visaType?: string;
}) => {
  const queryParams = new URLSearchParams();
  
  if (params?.owner) queryParams.append('owner', params.owner);
  if (params?.fullName) queryParams.append('fullName', params.fullName);
  if (params?.email) queryParams.append('email', params.email);
  if (params?.employeeId) queryParams.append('employeeId', params.employeeId);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  
  // Skills filtering
  if (params?.skills) {
    if (Array.isArray(params.skills)) {
      params.skills.forEach(skill => {
        queryParams.append('skills', skill);
      });
    } else {
      queryParams.append('skills', params.skills);
    }
  }
  if (params?.skillLevel) queryParams.append('skillLevel', params.skillLevel);
  if (params?.skillMatchMode) queryParams.append('skillMatchMode', params.skillMatchMode);
  
  // Experience filtering
  if (params?.experienceLevel) queryParams.append('experienceLevel', params.experienceLevel);
  if (params?.minYearsOfExperience) queryParams.append('minYearsOfExperience', params.minYearsOfExperience.toString());
  if (params?.maxYearsOfExperience) queryParams.append('maxYearsOfExperience', params.maxYearsOfExperience.toString());
  
  // Location filtering
  if (params?.location) queryParams.append('location', params.location);
  if (params?.city) queryParams.append('city', params.city);
  if (params?.state) queryParams.append('state', params.state);
  if (params?.country) queryParams.append('country', params.country);
  
  // Education & Visa filtering
  if (params?.degree) queryParams.append('degree', params.degree);
  if (params?.visaType) queryParams.append('visaType', params.visaType);
  
  const queryString = queryParams.toString();
  const url = queryString ? `${Candidates_API}?${queryString}` : Candidates_API;
  
  const response = await api.get(url);
  return response.data;
};

export const fetchCandidateById = async (id: string) => {
  const response = await api.get(`${Candidates_API}/${id}`);
  return response.data;
};

// Create a new lead
export const addCandidate = async (candidateData: any) => {
  const response = await api.post(Candidates_API, candidateData);
  return response.data;
};

// Update a lead (send id as URL param)
export const updateCandidate = async (candidateData: any) => {
  const { id, ...rest } = candidateData;
  const response = await api.patch(`${Candidates_API}/${id}`, rest);
  return response.data;
};

// Delete a lead (send id as URL param)
export const deleteCandidate = async (leadId: string) => {
  const response = await api.delete(`${Candidates_API}/${leadId}`);
  return response.data;
};

// Register a new candidate using the auth register API
export const registerCandidate = async (candidateData: {
  name: string;
  email: string;
  password: string;
  role: string;
  phoneNumber: string;
  adminId: string;
}) => {
  const response = await api.post(Register_User_API, candidateData);
  return response.data;
};

// Onboard a candidate using the auth onboard-candidate API
export const onboardCandidate = async (candidateData: {
  email: string;
  onboardUrl: string;
}) => {
  const response = await api.post(Onboard_Candidate_API, candidateData);
  return response.data;
};

// Upload documents with files and labels
export const uploadDocuments = async (files: File[], labels: string[]) => {
  const formData = new FormData();
  
  // Append files to FormData
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  // Append labels as a JSON string array
  formData.append('labels', JSON.stringify(labels));
  
  const response = await api.post(Documents_API, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Export candidates
export const exportCandidates = async () => {
  const response = await api.post(Export_Candidates_API);
  return response.data;
};

// Get candidate salary slips
export const getCandidateSalarySlips = async (candidateId: string) => {
  const response = await api.get(`${Candidate_SalarySlips_API}/${candidateId}`);
  return response.data;
};

// Post candidate salary slips
export const addCandidateSalarySlips = async (candidateId: string, salarySlipData: {
  month: string;
  year: number;
  documentUrl: string;
  key: string;
  originalName: string;
  size: number;
  mimeType: string;
}) => {
  const response = await api.post(`${Candidate_SalarySlips_API}/${candidateId}`, salarySlipData);
  return response.data;
};

// Forgot password
export const forgotPassword = async (email: string) => {
  const response = await api.post(Forgot_Password_API, { email });
  return response.data;
};

// Verify document
export const verifyDocument = async (candidateId: string, documentIndex: number, status: number) => {
  const response = await api.patch(`${Verify_Document_API}/${candidateId}/${documentIndex}`, { status });
  return response.data;
};

// Fetch candidate documents
export const fetchCandidateDocuments = async (candidateId: string) => {
  const response = await api.get(`${Fetch_Candidate_Documents_API}/${candidateId}`);
  return response.data;
};

// Share candidate
export const shareCandidate = async (candidateId: string, shareData: {
  email: string;
  withDoc: boolean;
}) => {
  const response = await api.post(`${Share_Candidate_API}/${candidateId}`, shareData);
  return response.data;
};

// Create meeting
export const createMeeting = async (meetingData: {
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  maxParticipants: number;
  allowGuestJoin: boolean;
  requireApproval: boolean;
  hosts?: { name: string; email: string }[];
  emailInvites?: string[];
}) => {
  const response = await api.post(Meeting_API, meetingData);
  return response.data;
};

// Get meetings list
export const getMeetingsList = async () => {
  const response = await api.get(Meeting_API);
  return response.data;
};

// get meeting by id
export const getMeetingById = async (meetingId: string) => {
  const response = await api.get(`${Meeting_API}/${meetingId}`);
  return response.data;
};

// update meeting by id
export const updateMeetingById = async (meetingId: string, meetingData: {
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  maxParticipants: number;
  allowGuestJoin: boolean;
  requireApproval: boolean;
}) => {
  const response = await api.patch(`${Meeting_API}/${meetingId}`, meetingData);
  return response.data;
};

// delete meeting by id
export const deleteMeetingById = async (meetingId: string) => {
  const response = await api.delete(`${Meeting_API}/${meetingId}`);
  return response.data;
};

// Join meeting
export const joinMeeting = async (meetingId: string, data: {
  joinToken: string;
  name: string;
  email: string;
}) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/join`, data);
  return response.data;
};

// Leave meeting
export const leaveMeeting = async (meetingId: string, data: {
  email: string;
}) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/leave`, data);
  return response.data;
};

// List participants in a meeting
export const listParticipantsInMeeting = async (meetingId: string) => {
  const response = await api.get(`${Meeting_API}/${meetingId}/participants`);
  return response.data;
};

// end meeting
export const endMeeting = async (meetingId: string) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/end`);
  return response.data;
};

// Get meeting info
export const getMeetingInfo = async (meetingId: string, token: string) => {
  const response = await api.get(`${Meeting_API}/${meetingId}/info?token=${token}`);
  return response.data;
};

// Get screen share token for a meeting
export const getScreenShareToken = async (meetingId: string, data: {
  joinToken: string;
  screenShareUid: string | number;
  email: string;
}) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/screen-share-token`, data);
  return response.data;
};


// Get logs
export const getLogs = async (page?: number, limit?: number) => {
  const params = new URLSearchParams();
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());
  const queryString = params.toString();
  const url = `${Logs_API}${queryString ? `?${queryString}` : ''}`;
  const response = await api.get(url);
  return response.data;
};


// Punch in attendance
export const punchInAttendance = async (candidateId: string, attendanceData?: {
  punchInTime?: string;  // Optional: ISO 8601 date string. Defaults to current time if not provided
  notes?: string;        // Optional: Additional notes
  timezone?: string;     // Optional: IANA timezone (e.g., 'America/New_York', 'Asia/Kolkata', 'UTC'). Defaults to 'UTC'
}) => {
  const response = await api.post(`${Attendance_API}/punch-in/${candidateId}`, attendanceData || {});
  return response.data;
};

// Punch out attendance
export const punchOutAttendance = async (candidateId: string, attendanceData?: {
  punchOutTime?: string;  // Optional: ISO 8601 date string. Defaults to current time if not provided
  notes?: string;         // Optional: Additional notes
}) => {
  const response = await api.post(`${Attendance_API}/punch-out/${candidateId}`, attendanceData || {});
  return response.data;
};

// Get Punch In/Out Status by candidate id
export const getPunchInOutStatus = async (candidateId: string) => {
  const response = await api.get(`${Attendance_API}/status/${candidateId}`);
  return response.data;
};

// Get Attendance by Candidate
export const getAttendanceByCandidate = async (candidateId: string, params?: {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const queryString = queryParams.toString();
  const url = `${Attendance_API}/candidate/${candidateId}${queryString ? `?${queryString}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

// Get Attendance
export const getAttendance = async (page?: number, limit?: number) => {
  const params = new URLSearchParams();
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());
  const queryString = params.toString();
  const url = `${Attendance_API}${queryString ? `?${queryString}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

/**
 * Assign holidays to multiple candidates
 * @param candidateIds - Array of candidate MongoDB ObjectIds
 * @param holidayIds - Array of holiday MongoDB ObjectIds
 * @returns Promise with assignment results
 */
export const assignHolidaysToCandidates = async (candidateIds: string[], holidayIds: string[]): Promise<any> => {
  const response = await api.post(`${Attendance_API}/holidays`, {
    candidateIds,
    holidayIds
  });
  return response.data;
};

/**
 * Remove holidays from multiple candidates
 * @param candidateIds - Array of candidate MongoDB ObjectIds
 * @param holidayIds - Array of holiday MongoDB ObjectIds
 * @returns Promise with removal results
 */
export const removeHolidaysFromCandidates = async (candidateIds: string[], holidayIds: string[]): Promise<any> => {
  const response = await api.delete(`${Attendance_API}/holidays`, {
    data: {
      candidateIds,
      holidayIds
    }
  });
  return response.data;
};

/**
 * Assign shift to multiple candidates
 * @param candidateIds - Array of candidate MongoDB ObjectIds
 * @param shiftId - Shift ObjectId from the shifts API
 * @returns Promise with assignment results
 */
export const assignShiftToCandidates = async (
  candidateIds: string[],
  shiftId: string
): Promise<any> => {
  const response = await api.post(`${Candidates_API}/assign-shift`, {
    candidateIds,
    shiftId
  });
  return response.data;
};

/**
 * Assign leaves to multiple candidates
 * @param candidateIds - Array of candidate MongoDB ObjectIds
 * @param dates - Array of dates for leave (ISO 8601 format)
 * @param leaveType - Type of leave: "casual", "sick", or "unpaid"
 * @param notes - Optional notes for the leave
 * @returns Promise with assignment results
 */
export const assignLeavesToCandidates = async (
  candidateIds: string[],
  dates: string[],
  leaveType: 'casual' | 'sick' | 'unpaid',
  notes?: string
): Promise<any> => {
  const response = await api.post(`${Attendance_API}/leaves`, {
    candidateIds,
    dates,
    leaveType,
    notes
  });
  return response.data;
};

/**
 * Update an existing leave for a candidate
 * @param candidateId - MongoDB ObjectId of the candidate
 * @param leaveId - MongoDB ObjectId of the leave entry (from candidate.leaves array)
 * @param updates - Partial leave data to update (date, leaveType, or notes)
 * @returns Promise with updated leave data
 */
export const updateLeave = async (
  candidateId: string,
  leaveId: string,
  updates: {
    date?: string;
    leaveType?: 'casual' | 'sick' | 'unpaid';
    notes?: string;
  }
): Promise<any> => {
  const response = await api.patch(`${Attendance_API}/leaves/${candidateId}/${leaveId}`, updates);
  return response.data;
};

/**
 * Delete an existing leave for a candidate
 * @param candidateId - MongoDB ObjectId of the candidate
 * @param leaveId - MongoDB ObjectId of the leave entry (from candidate.leaves array)
 * @returns Promise with deletion confirmation
 */
export const deleteLeave = async (
  candidateId: string,
  leaveId: string
): Promise<any> => {
  const response = await api.delete(`${Attendance_API}/leaves/${candidateId}/${leaveId}`);
  return response.data;
};

/**
 * Cancel an existing leave for a candidate
 * @param candidateId - MongoDB ObjectId of the candidate
 * @param leaveId - MongoDB ObjectId of the leave entry (from candidate.leaves array)
 * @returns Promise with cancellation confirmation
 */
export const cancelLeave = async (
  candidateId: string,
  leaveId: string
): Promise<any> => {
  const response = await api.post(`${Attendance_API}/leaves/${candidateId}/${leaveId}/cancel`, {});
  return response.data;
};

// Recording API functions
// Get recording status
export const getRecordingStatus = async (meetingId: string) => {
  const response = await api.get(`${Meeting_API}/${meetingId}/recording/status`);
  return response.data;
};

// Start recording
export const startRecording = async (meetingId: string, options?: {
  format?: 'mp4' | 'webm' | 'm3u8';
  resolution?: string;
  fps?: number;
  bitrate?: number;
}) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/recording/start`, options || {});
  return response.data;
};

// Stop recording
export const stopRecording = async (meetingId: string) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/recording/stop`);
  return response.data;
};

// Get recording download URL
export const getRecordingDownloadUrl = async (meetingId: string) => {
  const response = await api.get(`${Meeting_API}/${meetingId}/recording/download`);
  return response.data;
};

// Retry S3 upload
export const retryRecordingUpload = async (meetingId: string) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/recording/retry-upload`);
  return response.data;
};

// Upload recording file
export const uploadRecordingFile = async (meetingId: string, file: File, onProgress?: (progress: number) => void) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(`${Meeting_API}/${meetingId}/recording/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
  return response.data;
};

// Transcription API functions
// Start transcription
export const startTranscription = async (meetingId: string, language: string = 'en') => {
  const response = await api.post(Transcription_Start_API(meetingId), { language });
  return response.data;
};

// Get transcription status
export const getTranscriptionStatus = async (meetingId: string) => {
  const response = await api.get(Transcription_Status_API(meetingId));
  return response.data;
};

// Get transcript content
export const getTranscript = async (meetingId: string) => {
  const response = await api.get(Transcription_API(meetingId));
  return response.data;
};

// Update transcript (edit)
export const updateTranscript = async (meetingId: string, transcript: string) => {
  const response = await api.patch(Transcription_API(meetingId), { transcript });
  return response.data;
};

// Download transcript
export const downloadTranscript = async (meetingId: string, format: string = 'txt') => {
  const response = await api.get(Transcription_Download_API(meetingId, format));
  return response.data;
};

// Share meeting invite via email
export const shareMeeting = async (meetingId: string, shareData: {
  emails: string[];
  message?: string;
}) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/share`, shareData);
  return response.data;
};


// resend email verification
export const resendEmailVerification = async (candidateId: string) => {
  const response = await api.post(`${Candidates_API}/${candidateId}/resend-verification-email`);
  return response.data;
};

// Add note to candidate (Recruiter and Admin only)
export const addNoteToCandidate = async (candidateId: string, note: string) => {
  const response = await api.post(`${Candidates_API}/${candidateId}/notes`, { note });
  return response.data;
};

// Add feedback to candidate (Recruiter and Admin only)
export const addFeedbackToCandidate = async (candidateId: string, feedback: string, rating?: number) => {
  const response = await api.post(`${Candidates_API}/${candidateId}/feedback`, { feedback, rating });
  return response.data;
};

// Assign recruiter to candidate (Admin only)
export const assignRecruiterToCandidate = async (candidateId: string, recruiterId: string) => {
  const response = await api.post(`${Candidates_API}/${candidateId}/assign-recruiter`, { recruiterId });
  return response.data;
};

// Fetch user by ID (for recruiters, admins, etc.)
export const fetchUserById = async (userId: string) => {
  const response = await api.get(`${Users_API}/${userId}`);
  return response.data;
};

// Update candidate joining date (Admin only)
export const updateCandidateJoiningDate = async (candidateId: string, joiningDate: string) => {
  const response = await api.patch(`${Candidates_API}/${candidateId}/joining-date`, {
    joiningDate: new Date(joiningDate).toISOString()
  });
  return response.data;
};

// Update candidate resign date (Admin only)
export const updateCandidateResignDate = async (candidateId: string, resignDate: string | null) => {
  const response = await api.patch(`${Candidates_API}/${candidateId}/resign-date`, {
    resignDate: resignDate ? new Date(resignDate).toISOString() : null
  });
  return response.data;
};

/**
 * Update week-off calendar for multiple candidates (Admin only)
 * @param candidateIds - Array of candidate MongoDB ObjectIds
 * @param weekOff - Array of week-off day names (e.g., ['Saturday', 'Sunday'])
 * @returns Promise with response data
 */
export const updateWeekOffCalendar = async (candidateIds: string[], weekOff: string[]): Promise<any> => {
  const response = await api.post(`${Candidates_API}/week-off`, {
    candidateIds,
    weekOff
  });
  return response.data;
};

/**
 * Get week-off calendar for a candidate
 * @param candidateId - MongoDB ObjectId of the candidate
 * @returns Promise with week-off data
 */
export const getCandidateWeekOff = async (candidateId: string): Promise<any> => {
  const response = await api.get(`${Candidates_API}/${candidateId}/week-off`);
  return response.data;
};

// ==================== Leave Request API Functions ====================

/**
 * Create a leave request for a candidate
 * @param candidateId - MongoDB ObjectId of the candidate
 * @param leaveRequestData - Leave request data (dates, leaveType, notes)
 * @returns Promise with created leave request data
 */
export const createLeaveRequest = async (
  candidateId: string,
  leaveRequestData: {
    dates: string[]; // Array of ISO 8601 date strings
    leaveType: 'casual' | 'sick' | 'unpaid';
    notes?: string; // Optional notes (max 1000 characters)
  }
): Promise<any> => {
  const response = await api.post(`${Leave_Requests_API}/candidate/${candidateId}`, leaveRequestData);
  return response.data;
};

/**
 * Get leave requests for a specific candidate
 * @param candidateId - MongoDB ObjectId of the candidate
 * @param params - Optional query parameters (status, sortBy, limit, page)
 * @returns Promise with leave requests data
 */
export const getLeaveRequestsByCandidate = async (
  candidateId: string,
  params?: {
    status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
    sortBy?: string;
    limit?: number;
    page?: number;
  }
): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  
  const queryString = queryParams.toString();
  const url = `${Leave_Requests_API}/candidate/${candidateId}${queryString ? `?${queryString}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

/**
 * Get all leave requests (candidates see only their own, admins see all)
 * @param params - Optional query parameters (candidate, status, leaveType, sortBy, limit, page)
 * @returns Promise with leave requests data
 */
export const getAllLeaveRequests = async (params?: {
  candidate?: string; // Filter by candidate ID (admin only)
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  leaveType?: 'casual' | 'sick' | 'unpaid';
  sortBy?: string;
  limit?: number;
  page?: number;
}): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (params?.candidate) queryParams.append('candidate', params.candidate);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.leaveType) queryParams.append('leaveType', params.leaveType);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  
  const queryString = queryParams.toString();
  const url = `${Leave_Requests_API}${queryString ? `?${queryString}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

/**
 * Get a specific leave request by ID
 * @param requestId - MongoDB ObjectId of the leave request
 * @returns Promise with leave request data
 */
export const getLeaveRequestById = async (requestId: string): Promise<any> => {
  const response = await api.get(`${Leave_Requests_API}/${requestId}`);
  return response.data;
};

/**
 * Approve a leave request (admin only)
 * @param requestId - MongoDB ObjectId of the leave request
 * @param adminComment - Optional admin comment (max 1000 characters)
 * @returns Promise with approved leave request and leave assignment data
 */
export const approveLeaveRequest = async (
  requestId: string,
  adminComment?: string
): Promise<any> => {
  const response = await api.patch(`${Leave_Requests_API}/${requestId}/approve`, {
    adminComment
  });
  return response.data;
};

/**
 * Reject a leave request (admin only)
 * @param requestId - MongoDB ObjectId of the leave request
 * @param adminComment - Optional admin comment explaining rejection (max 1000 characters)
 * @returns Promise with rejected leave request data
 */
export const rejectLeaveRequest = async (
  requestId: string,
  adminComment?: string
): Promise<any> => {
  const response = await api.patch(`${Leave_Requests_API}/${requestId}/reject`, {
    adminComment
  });
  return response.data;
};

/**
 * Cancel a leave request (candidate can cancel own pending requests, admin can cancel any pending)
 * @param requestId - MongoDB ObjectId of the leave request
 * @returns Promise with cancelled leave request data
 */
export const cancelLeaveRequest = async (requestId: string): Promise<any> => {
  const response = await api.post(`${Leave_Requests_API}/${requestId}/cancel`, {});
  return response.data;
};

// ==================== Backdated Attendance Request API Functions ====================

/**
 * Create a backdated attendance request for a candidate
 * @param candidateId - MongoDB ObjectId of the candidate
 * @param requestData - Backdated attendance request data (date, punchIn, punchOut, timezone, notes)
 * @returns Promise with created backdated attendance request data
 */
export const createBackdatedAttendanceRequest = async (
  candidateId: string,
  requestData: {
    attendanceEntries: Array<{
      date: string; // ISO 8601 date string (must be in the past)
      punchIn: string; // ISO 8601 date string
      punchOut?: string | null; // ISO 8601 date string (optional)
      timezone?: string; // IANA timezone (e.g., 'Asia/Kolkata', 'UTC')
    }>;
    notes?: string; // Optional notes for the entire request (max 1000 characters)
  }
): Promise<any> => {
  const response = await api.post(`${Backdated_Attendance_Requests_API}/candidate/${candidateId}`, requestData);
  return response.data;
};

/**
 * Get backdated attendance requests for a specific candidate
 * @param candidateId - MongoDB ObjectId of the candidate
 * @param params - Optional query parameters (status, sortBy, limit, page)
 * @returns Promise with backdated attendance requests data
 */
export const getBackdatedAttendanceRequestsByCandidate = async (
  candidateId: string,
  params?: {
    status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
    sortBy?: string;
    limit?: number;
    page?: number;
  }
): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  
  const queryString = queryParams.toString();
  const url = `${Backdated_Attendance_Requests_API}/candidate/${candidateId}${queryString ? `?${queryString}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

/**
 * Get all backdated attendance requests (candidates see only their own, admins see all)
 * @param params - Optional query parameters (candidate, status, sortBy, limit, page)
 * @returns Promise with backdated attendance requests data
 */
export const getAllBackdatedAttendanceRequests = async (params?: {
  candidate?: string; // Filter by candidate ID (admin only)
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  sortBy?: string;
  limit?: number;
  page?: number;
}): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (params?.candidate) queryParams.append('candidate', params.candidate);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.page) queryParams.append('page', params.page.toString());
  
  const queryString = queryParams.toString();
  const url = `${Backdated_Attendance_Requests_API}${queryString ? `?${queryString}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

/**
 * Get a specific backdated attendance request by ID
 * @param requestId - MongoDB ObjectId of the backdated attendance request
 * @returns Promise with backdated attendance request data
 */
export const getBackdatedAttendanceRequestById = async (requestId: string): Promise<any> => {
  const response = await api.get(`${Backdated_Attendance_Requests_API}/${requestId}`);
  return response.data;
};

/**
 * Update a backdated attendance request (admin only)
 * @param requestId - MongoDB ObjectId of the backdated attendance request
 * @param updates - Partial request data to update (date, punchIn, punchOut, timezone, notes)
 * @returns Promise with updated backdated attendance request data
 */
export const updateBackdatedAttendanceRequest = async (
  requestId: string,
  updates: {
    attendanceEntries?: Array<{
      date: string; // ISO 8601 date string (must be in the past)
      punchIn: string; // ISO 8601 date string
      punchOut?: string | null; // ISO 8601 date string (optional)
      timezone?: string; // IANA timezone (e.g., 'Asia/Kolkata', 'UTC')
    }>;
    notes?: string; // Optional notes for the entire request (max 1000 characters)
  }
): Promise<any> => {
  const response = await api.patch(`${Backdated_Attendance_Requests_API}/${requestId}`, updates);
  return response.data;
};

/**
 * Approve a backdated attendance request (admin only)
 * @param requestId - MongoDB ObjectId of the backdated attendance request
 * @param adminComment - Optional admin comment (max 1000 characters)
 * @returns Promise with approved request and attendance data
 */
export const approveBackdatedAttendanceRequest = async (
  requestId: string,
  adminComment?: string
): Promise<any> => {
  const response = await api.patch(`${Backdated_Attendance_Requests_API}/${requestId}/approve`, {
    adminComment
  });
  return response.data;
};

/**
 * Reject a backdated attendance request (admin only)
 * @param requestId - MongoDB ObjectId of the backdated attendance request
 * @param adminComment - Optional admin comment explaining rejection (max 1000 characters)
 * @returns Promise with rejected backdated attendance request data
 */
export const rejectBackdatedAttendanceRequest = async (
  requestId: string,
  adminComment?: string
): Promise<any> => {
  const response = await api.patch(`${Backdated_Attendance_Requests_API}/${requestId}/reject`, {
    adminComment
  });
  return response.data;
};

/**
 * Cancel a backdated attendance request (candidate can cancel own pending requests, admin can cancel any pending)
 * @param requestId - MongoDB ObjectId of the backdated attendance request
 * @returns Promise with cancelled backdated attendance request data
 */
export const cancelBackdatedAttendanceRequest = async (requestId: string): Promise<any> => {
  const response = await api.post(`${Backdated_Attendance_Requests_API}/${requestId}/cancel`, {});
  return response.data;
};