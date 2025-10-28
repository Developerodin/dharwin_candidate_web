// Timezone utility functions for region-aware timezone handling
// Server is in UTC; we store UTC but display in user's region

// Detect user's IANA timezone, fallback to UTC
export const getUserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

// True if user region is India
export const isUserInIndia = (): boolean => getUserTimeZone() === 'Asia/Kolkata';

// IST local input (e.g., from <input type="datetime-local">) -> UTC ISO
// Formula: UTC = IST - 5.5 hours
export const convertIndianTimeToUTC = (indianLocalDateTime: string): string => {
  const istMs = new Date(indianLocalDateTime).getTime();
  const utcMs = istMs - 5.5 * 60 * 60 * 1000; // UTC = IST - 5.5h
  return new Date(utcMs).toISOString();
};

// Any local input -> UTC ISO (for non-India regions)
export const convertLocalTimeToUTC = (localDateTime: string): string => {
  return new Date(localDateTime).toISOString(); // browser interprets local tz, .toISOString() gives UTC
};

// Format UTC for IST display
export const formatISTDateTime = (utcISO: string): string => {
  return new Date(utcISO).toLocaleString('en-IN', {
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

// Format UTC for user region
export const formatUTCForUserRegion = (utcISO: string): string => {
  return new Date(utcISO).toLocaleString('en-IN', {
    timeZone: getUserTimeZone(),
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// Countdown calculation (always compute diff in UTC)
export const msUntil = (utcISO: string): number => Date.parse(utcISO) - Date.now();

// Legacy functions for backward compatibility
export const convertToIST = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(dateObj.getTime() + istOffset);
};

export const getTimeUntilIST = (scheduledTime: Date | string): number => {
  const utcISO = typeof scheduledTime === 'string' ? scheduledTime : scheduledTime.toISOString();
  return msUntil(utcISO);
};

export const isMeetingInFutureIST = (scheduledTime: Date | string): boolean => {
  const utcISO = typeof scheduledTime === 'string' ? scheduledTime : scheduledTime.toISOString();
  return msUntil(utcISO) > 0;
};
