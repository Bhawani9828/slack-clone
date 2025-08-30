// @/lib/utils.ts - Fixed WhatsApp style formatting
export const formatLastSeen = (lastSeen?: string, isOnline?: boolean): { time: string; isOnline: boolean } => {
  // If user is online, show "Online"
  if (isOnline) {
    return { time: "Online", isOnline: true };
  }

  if (!lastSeen) {
    return { time: "Offline", isOnline: false };
  }

  const lastSeenDate = new Date(lastSeen);
  if (isNaN(lastSeenDate.getTime())) {
    return { time: "Offline", isOnline: false };
  }

  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Check if it's today (same calendar day)
  const isToday = 
    lastSeenDate.getDate() === now.getDate() &&
    lastSeenDate.getMonth() === now.getMonth() &&
    lastSeenDate.getFullYear() === now.getFullYear();

  // Check if it's yesterday (exactly 1 day ago)
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    lastSeenDate.getDate() === yesterday.getDate() &&
    lastSeenDate.getMonth() === yesterday.getMonth() &&
    lastSeenDate.getFullYear() === yesterday.getFullYear();

  let timeString = "";

  if (diffMinutes < 1) {
    timeString = "last seen just now";
  } else if (diffMinutes < 60) {
    timeString = `last seen ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (isToday) {
    const timeOnly = lastSeenDate.toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit",
      hour12: true 
    });
    timeString = `last seen today at ${timeOnly}`;
  } else if (isYesterday) {
    const timeOnly = lastSeenDate.toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit",
      hour12: true 
    });
    timeString = `last seen yesterday at ${timeOnly}`;
  } else if (diffDays <= 7) {
    // For this week (2-7 days ago), show day name
    const dayName = lastSeenDate.toLocaleDateString('en-US', { weekday: 'long' });
    const timeOnly = lastSeenDate.toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit",
      hour12: true 
    });
    timeString = `last seen ${dayName} at ${timeOnly}`;
  } else {
    // For older dates (more than a week ago), show full date
    const dateOnly = lastSeenDate.toLocaleDateString('en-GB', { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric" 
    });
    const timeOnly = lastSeenDate.toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit",
      hour12: true 
    });
    timeString = `last seen ${dateOnly} at ${timeOnly}`;
  }

  return { time: timeString, isOnline: false };
};

// Enhanced chat time formatting (for message timestamps)
export function formatChatTime(dateString?: string) {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  const isToday = 
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  } else if (isYesterday) {
    return "Yesterday";
  } else if (diffDays <= 7) {
    // This week - show day name
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    // Older than a week - show date
    return date.toLocaleDateString('en-GB', { day: "2-digit", month: "short", year: "numeric" });
  }
}

// Enhanced message time formatting (detailed for message bubbles)
export function formatMessageTime(dateString?: string) {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  const isToday = 
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeOnly = date.toLocaleTimeString([], { 
    hour: "2-digit", 
    minute: "2-digit", 
    hour12: true 
  });

  if (isToday) {
    return timeOnly;
  } else if (isYesterday) {
    return `Yesterday ${timeOnly}`;
  } else if (diffDays <= 7) {
    // This week - show day name with time
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    return `${dayName} ${timeOnly}`;
  } else {
    // Older than a week - show date with time
    const dateOnly = date.toLocaleDateString('en-GB', { 
      day: "2-digit", 
      month: "short" 
    });
    return `${dateOnly} ${timeOnly}`;
  }
}

// Additional utility: Check if date is within a specific range
export function isDateWithinDays(dateString: string, days: number): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  return diffDays <= days;
}

// Additional utility: Get relative day name
export function getRelativeDayName(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const isToday = 
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return "Today";
  } else if (isYesterday) {
    return "Yesterday";
  } else if (diffDays <= 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-GB', { 
      day: "2-digit", 
      month: "short", 
      year: "numeric" 
    });
  }
}