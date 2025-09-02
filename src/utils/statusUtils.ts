// utils/statusUtils.ts - Updated with Rate Limiting
import { Socket } from 'socket.io-client';
import { UserStatusData } from '@/types/socketServiceTypes';

export class StatusUtils {
  private statusUpdateListeners: Map<string, (status: UserStatusData) => void> = new Map();
  
  // Rate limiting properties
  private statusCache = new Map<string, { status: UserStatusData; timestamp: number }>();
  private statusRequests = new Map<string, number>(); // Track last request time
  private readonly CACHE_DURATION = 30000; // 30 seconds cache
  private readonly MIN_REQUEST_INTERVAL = 5000; // 5 seconds between requests
  private readonly BULK_REQUEST_INTERVAL = 10000; // 10 seconds for bulk requests

  constructor(private socket: Socket | null) {}

  updateSocket(socket: Socket | null) {
    this.socket = socket;
  }

  // Enhanced requestUserStatus with caching and throttling
  requestUserStatus(userId: string) {
    if (!this.socket?.connected || !userId) {
      console.warn('Cannot request user status: socket not connected or no userId');
      return;
    }

    const now = Date.now();
    const lastRequest = this.statusRequests.get(userId);
    
    // Check if we requested too recently
    if (lastRequest && (now - lastRequest) < this.MIN_REQUEST_INTERVAL) {
      console.log(`⏳ Status request throttled for ${userId}, last request was ${now - lastRequest}ms ago`);
      return;
    }

    // Check cache first
    const cached = this.statusCache.get(userId);
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`📋 Using cached status for ${userId}`);
      this.notifyStatusListeners(userId, cached.status);
      return;
    }

    // Make the request
    console.log(`🔍 Requesting status for user: ${userId}`);
    this.statusRequests.set(userId, now);
    this.socket.emit('getUserStatus', { userId });
  }

  // Cache status updates
  private cacheStatus(userId: string, status: UserStatusData) {
    this.statusCache.set(userId, {
      status,
      timestamp: Date.now()
    });
  }

  getCurrentUserStatus(currentUserId: string | null): { isOnline: boolean; userId: string | null } {
    if (!currentUserId) return { isOnline: false, userId: null };
    
    const cached = this.statusCache.get(currentUserId);
    return {
      isOnline: cached?.status.isOnline ?? (this.socket?.connected || false),
      userId: currentUserId,
    };
  }

  // Enhanced requestOnlineUsers with throttling
  requestOnlineUsers(currentUserId: string | null) {
    if (!this.socket?.connected || !currentUserId) {
      console.warn('Cannot request online users: socket not connected or no userId');
      return;
    }

    const now = Date.now();
    const lastRequest = this.statusRequests.get('onlineUsers');
    
    // Throttle online users requests
    if (lastRequest && (now - lastRequest) < this.BULK_REQUEST_INTERVAL) {
      console.log(`⏳ Online users request throttled, last request was ${now - lastRequest}ms ago`);
      return;
    }

    console.log('📡 Requesting online users from server...');
    this.statusRequests.set('onlineUsers', now);
    this.socket.emit('getOnlineUsers', { userId: currentUserId });
  }

  // Status listener management
  addStatusListener(userId: string, callback: (status: UserStatusData) => void) {
    this.statusUpdateListeners.set(userId, callback);
    
    // Check cache and notify immediately if available
    const cached = this.statusCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`📋 Notifying listener with cached status for ${userId}`);
      callback(cached.status);
    }
  }

  removeStatusListener(userId: string) {
    this.statusUpdateListeners.delete(userId);
  }

  getStatusListener(userId: string) {
    return this.statusUpdateListeners.get(userId);
  }

  clearAllStatusListeners() {
    this.statusUpdateListeners.clear();
    this.statusCache.clear();
    this.statusRequests.clear();
  }

  // Enhanced emit status updates to registered listeners with caching
  notifyStatusListeners(userId: string, status: UserStatusData) {
    // Cache the status first
    this.cacheStatus(userId, status);
    
    const listener = this.statusUpdateListeners.get(userId);
    if (listener) {
      console.log(`📢 Notifying status listener for ${userId}:`, status.type);
      listener(status);
    }
  }

  // Enhanced batch status request with throttling
  requestMultipleUserStatuses(userIds: string[]) {
    if (!this.socket?.connected || userIds.length === 0) {
      console.warn('Cannot request multiple user statuses: socket not connected or empty user list');
      return;
    }

    const now = Date.now();
    const lastBulkRequest = this.statusRequests.get('bulkStatus');
    
    // Throttle bulk requests
    if (lastBulkRequest && (now - lastBulkRequest) < this.BULK_REQUEST_INTERVAL) {
      console.log(`⏳ Bulk status request throttled, last request was ${now - lastBulkRequest}ms ago`);
      return;
    }

    // Filter out users we have recent cache for
    const uncachedUsers = userIds.filter(userId => {
      const cached = this.statusCache.get(userId);
      return !cached || (now - cached.timestamp) >= this.CACHE_DURATION;
    });

    if (uncachedUsers.length === 0) {
      console.log('📋 All user statuses available in cache');
      return;
    }

    console.log(`🔍 Requesting statuses for ${uncachedUsers.length} users:`, uncachedUsers);
    this.statusRequests.set('bulkStatus', now);
    this.socket.emit('getBulkUserStatus', { userIds: uncachedUsers });
  }

  // Set user's own status
  setUserStatus(status: 'online' | 'offline' | 'away' | 'busy', customMessage?: string) {
    if (!this.socket?.connected) {
      console.warn('Cannot set user status: socket not connected');
      return;
    }

    console.log(`📡 Setting user status: ${status}`, customMessage ? `with message: ${customMessage}` : '');
    this.socket.emit('setUserStatus', {
      status,
      customMessage,
      timestamp: Date.now(),
    });
  }

  // Enhanced broadcast activity with throttling
  private lastActivityBroadcast = new Map<string, number>();
  private readonly ACTIVITY_THROTTLE = 1000; // 1 second between same activity types

  broadcastActivity(activity: {
    type: 'typing' | 'last_seen' | 'in_chat';
    chatId?: string;
    data?: any;
  }) {
    if (!this.socket?.connected) {
      console.warn('Cannot broadcast activity: socket not connected');
      return;
    }

    const now = Date.now();
    const activityKey = `${activity.type}-${activity.chatId || 'global'}`;
    const lastBroadcast = this.lastActivityBroadcast.get(activityKey);

    // Throttle activity broadcasts
    if (lastBroadcast && (now - lastBroadcast) < this.ACTIVITY_THROTTLE) {
      console.log(`⏳ Activity broadcast throttled: ${activityKey}`);
      return;
    }

    console.log('📡 Broadcasting activity:', activity.type);
    this.lastActivityBroadcast.set(activityKey, now);
    this.socket.emit('userActivity', {
      ...activity,
      timestamp: now,
    });
  }

  // Get connection health for status monitoring
  getConnectionHealth(): {
    connected: boolean;
    canRequestStatus: boolean;
    activeListeners: number;
    cachedStatuses: number;
    recentRequests: number;
  } {
    return {
      connected: this.socket?.connected ?? false,
      canRequestStatus: (this.socket?.connected ?? false),
      activeListeners: this.statusUpdateListeners.size,
      cachedStatuses: this.statusCache.size,
      recentRequests: this.statusRequests.size,
    };
  }

  // Get cache stats for debugging
  getCacheStats() {
    const now = Date.now();
    const validCache = Array.from(this.statusCache.entries()).filter(
      ([_, data]) => (now - data.timestamp) < this.CACHE_DURATION
    );

    return {
      totalCached: this.statusCache.size,
      validCached: validCache.length,
      activeListeners: this.statusUpdateListeners.size,
      recentRequests: this.statusRequests.size,
      cacheHitRate: this.statusCache.size > 0 ? (validCache.length / this.statusCache.size * 100).toFixed(1) + '%' : '0%'
    };
  }

  // Clear old cache entries
  private cleanupCache() {
    const now = Date.now();
    
    for (const [userId, data] of this.statusCache.entries()) {
      if (now - data.timestamp > this.CACHE_DURATION * 2) {
        this.statusCache.delete(userId);
      }
    }

    for (const [key, timestamp] of this.statusRequests.entries()) {
      if (now - timestamp > this.BULK_REQUEST_INTERVAL * 2) {
        this.statusRequests.delete(key);
      }
    }
  }

  // Auto cleanup method (call this periodically)
  startAutoCleanup() {
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // Cleanup every minute
  }

  // Force refresh a user's status (bypasses cache)
  forceRefreshUserStatus(userId: string) {
    if (!this.socket?.connected || !userId) {
      console.warn('Cannot force refresh user status: socket not connected or no userId');
      return;
    }

    // Clear cache for this user
    this.statusCache.delete(userId);
    this.statusRequests.delete(userId);
    
    // Make fresh request
    console.log(`🔄 Force refreshing status for user: ${userId}`);
    this.statusRequests.set(userId, Date.now());
    this.socket.emit('getUserStatus', { userId });
  }
}