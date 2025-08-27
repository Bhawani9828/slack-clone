const API_ENDPOINTS = {
  REGISTER: "auth/register",
    LOGIN: "/auth/login",
    VERIFY_OTP: "/auth/verify-otp",
    MESSAGES_SEND: "/messages",
    MESSAGES_GET_ALL: "/messages",
    MESSAGES_CHANNELID: (channelId: string) => `/messages?channelId=${channelId}`,
    TOP_TEN_USER: "/auth/top?limit=10",
      USER_SEARCH: (query: string) => `/auth/search?query=${encodeURIComponent(query)}`,
     USER_PROFILE : "/auth/profile",
     UPDATE_PROFILE : "/auth/profile-update",
     CLOUDINARY_UPLOAD: (type: 'image' | 'video') => 
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${type}/upload`,
  STATUS: {
    CREATE: '/status',
    RECENT: '/status/recent',
    VIEWED: '/status/viewed',
    BY_USER: (userId: string) => `/status/user/${userId}`,
    UNVIEWED: '/status/unviewed',
    MARK_VIEWED: (statusId: string) => `/status/view/${statusId}`
  },

  LAST_MESSAGES: '/messages/last-messages',
VERIFY_FIREBASE_TOKEN: "/auth/verify-firebase-token",
    
  };
  
  export default API_ENDPOINTS;