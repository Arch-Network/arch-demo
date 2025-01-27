import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  // Convert directly to local timezone
  const localDate = toZonedTime(date, Intl.DateTimeFormat().resolvedOptions().timeZone);
  return format(localDate, 'MM/dd/yyyy, hh:mm:ss a');
}; 

export const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

export function formatGMTTimestamp(timestamp: string): string {
  try {
    if (!timestamp) {
      return 'Invalid date';
    }

    // Parse the GMT timestamp and explicitly handle it as UTC
    const date = new Date(timestamp + 'Z'); // Append 'Z' to ensure UTC interpretation
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    // Format the date in the user's local timezone
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'  // This will show the timezone abbreviation (e.g., EST)
    }).format(date);

  } catch (error) {
    console.error('Error formatting timestamp:', error, 'Timestamp:', timestamp);
    return 'Invalid date';
  }
}