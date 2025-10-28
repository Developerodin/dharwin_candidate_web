// Timezone utility functions for Indian Standard Time (IST)

export const convertToIST = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  
  return new Date(dateObj.getTime() + istOffset);
};

export const formatISTDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Convert UTC to IST for display (since API sends UTC)
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

// Convert Indian time to UTC for API
export const convertIndianTimeToUTC = (indianDateTime: string): string => {
  // Parse the Indian time string (assuming format like "2025-10-28T11:50:00")
  const indianDate = new Date(indianDateTime);
  
  // Convert IST to UTC (subtract 5:30 hours)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcDate = new Date(indianDate.getTime() - istOffset);
  
  return utcDate.toISOString();
};

// Convert UTC to Indian time for display
export const convertUTCToIndianTime = (utcDateTime: string): string => {
  const utcDate = new Date(utcDateTime);
  
  // Convert UTC to IST (add 5:30 hours)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(utcDate.getTime() + istOffset);
  
  return istDate.toISOString();
};
