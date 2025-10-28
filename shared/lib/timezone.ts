// Timezone utility functions for Indian Standard Time (IST)
// Server is in UTC, but we want everything to work in IST

export const convertToIST = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  
  return new Date(dateObj.getTime() + istOffset);
};

export const formatISTDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Convert UTC to IST for display
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(dateObj.getTime() + istOffset);
  
  return istDate.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }) + ' IST';
};

export const getTimeUntilIST = (scheduledTime: Date | string): number => {
  const now = new Date();
  const scheduled = new Date(scheduledTime);
  
  // Calculate difference in UTC (API sends UTC time)
  return scheduled.getTime() - now.getTime();
};

export const isMeetingInFutureIST = (scheduledTime: Date | string): boolean => {
  return getTimeUntilIST(scheduledTime) > 0;
};

// Convert Indian time to UTC for API storage
export const convertIndianTimeToUTC = (indianDateTime: string): string => {
  // Parse the Indian time string (assuming format like "2025-10-28T11:50:00")
  const indianDate = new Date(indianDateTime);
  
  // Convert IST to UTC (subtract 5:30 hours)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcDate = new Date(indianDate.getTime() - istOffset);
  
  return utcDate.toISOString();
};

// Get current IST time
export const getCurrentISTTime = (): Date => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset);
};

// Format current IST time
export const getCurrentISTTimeString = (): string => {
  return formatISTDateTime(getCurrentISTTime());
};
