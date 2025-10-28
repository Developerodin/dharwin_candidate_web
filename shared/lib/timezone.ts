// Timezone utility functions for IST handling

export const convertToIST = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcTime = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60 * 1000);
  
  return new Date(utcTime + istOffset);
};

export const formatISTDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
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
  const scheduled = convertToIST(scheduledTime);
  
  return scheduled.getTime() - now.getTime();
};

export const isMeetingInFutureIST = (scheduledTime: Date | string): boolean => {
  return getTimeUntilIST(scheduledTime) > 0;
};

// Format a date/time explicitly in UTC for display
export const formatUTCDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-GB', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }) + ' UTC';
};
