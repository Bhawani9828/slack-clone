"use client";
import { useState, useEffect, useCallback } from "react";
import { Avatar, IconButton, CircularProgress } from "@mui/material";
import { Close, Refresh } from "@mui/icons-material";
import { getApi, postApi } from "@/axios/apiService";
import API_ENDPOINTS from "@/axios/apiEndpoints";
import AddStatusModal from "../status/AddStatusModal";
import StoryProgressBar from "./ProgressBarStatus";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store";


interface StatusViewProps {
  isDark: boolean;
  onBackToChat: () => void;
  currentUserId: string;
  statusUserId?: string | null;
  onStatusClick?: (userId: string) => void;
}

interface Status {
  _id: string;
  userId: {
    _id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
  };
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  isViewed: boolean;
  viewedBy: string[];
  isExpired: boolean;
  createdAt: string;
}

export default function StatusView({ 
  isDark, 
  onBackToChat, 
  currentUserId, 
  statusUserId,
  onStatusClick 
}: StatusViewProps) {
  const chatusers = useSelector((state: RootState) => state.user.chatusers);
  const [statusUpdates, setStatusUpdates] = useState<Status[]>([]);
  const [viewedUpdates, setViewedUpdates] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentView, setCurrentView] = useState<'list' | 'story'>('list');
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentUserStories, setCurrentUserStories] = useState<Status[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);
  const [mediaLoading, setMediaLoading] = useState<{[key: string]: boolean}>({});
  const [isPaused, setIsPaused] = useState(false);

  const bgColor = isDark ? "bg-gray-900" : "bg-white";
  const borderColor = isDark ? "border-gray-700" : "border-gray-300";
  const textColor = isDark ? "text-white" : "text-gray-900";
  const secondaryTextColor = isDark ? "text-gray-400" : "text-gray-600";

  // Get current user info from localStorage
  useEffect(() => {
    const storedCurrentUserName = localStorage.getItem('currentUserName');
    const storedCurrentUserId = localStorage.getItem('currentUserId');
    const storedUserData = localStorage.getItem('currentUserData');
    
    let userInfo = {
      id: currentUserId || storedCurrentUserId,
      name: storedCurrentUserName || "My Status",
      avatar: "/placeholder.svg?height=60&width=60"
    };

    if (storedUserData) {
      try {
        const userData = JSON.parse(storedUserData);
        userInfo.avatar = userData.avatar || userInfo.avatar;
      } catch (e) {
        console.log("Error parsing user data");
      }
    }

    setCurrentUserInfo(userInfo);
  }, [currentUserId]);

  // Pause/resume handlers
  const handlePause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const fetchStatuses = async () => {
    try {
      setRefreshing(true);
      let endpoint = API_ENDPOINTS.STATUS.RECENT;

      if (statusUserId) {
        endpoint = API_ENDPOINTS.STATUS.VIEWED;
      }

      const response = await getApi(endpoint);

      if (statusUserId) {
        const statuses = response as Status[];
        setStatusUpdates(statuses);
        setViewedUpdates([]);
        
        const initialLoadingStates = statuses.reduce((acc, status) => {
          acc[status._id] = true;
          return acc;
        }, {} as {[key: string]: boolean});
        setMediaLoading(initialLoadingStates);
        
        const userStories = statuses.filter(s => s.userId._id === statusUserId);
        if (userStories.length > 0) {
          setCurrentUserStories(userStories);
          setCurrentView('story');
          setCurrentStoryIndex(0);
          markStatusAsViewed(userStories[0]._id);
        }
      } else {
        const [recentRes, viewedRes] = await Promise.all([
          getApi(API_ENDPOINTS.STATUS.RECENT),
          getApi(API_ENDPOINTS.STATUS.VIEWED),
        ]);
        const recentStatuses = recentRes as Status[];
        const viewedStatuses = viewedRes as Status[];
        
        setStatusUpdates(recentStatuses);
        setViewedUpdates(viewedStatuses);
        
        const initialLoadingStates = [...recentStatuses, ...viewedStatuses].reduce((acc, status) => {
          acc[status._id] = true;
          return acc;
        }, {} as {[key: string]: boolean});
        setMediaLoading(initialLoadingStates);
        
        setCurrentView('list');
      }
    } catch (error) {
      console.error("Error fetching statuses:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, [currentUserId, statusUserId]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const markStatusAsViewed = async (statusId: string) => {
    try {
      await fetch(API_ENDPOINTS.STATUS.MARK_VIEWED(statusId), {
        method: 'POST',
        credentials: 'include'
      });
      
      setStatusUpdates(prev => prev.filter(status => status._id !== statusId));
      setViewedUpdates(prev => {
        const viewedStatus = prev.find(status => status._id === statusId);
        if (viewedStatus) {
          return prev.map(status => 
            status._id === statusId ? { ...status, isViewed: true } : status
          );
        } else {
          const newStatus = statusUpdates.find(status => status._id === statusId);
          return newStatus ? [...prev, { ...newStatus, isViewed: true }] : prev;
        }
      });
    } catch (error) {
      console.error("Error marking status as viewed:", error);
    }
  };

  const handleStoryClick = (userId: string) => {
    if (onStatusClick) {
      onStatusClick(userId);
      return;
    }
    
    const userStories = [...statusUpdates, ...viewedUpdates].filter(s => s.userId._id === userId);
    if (userStories.length > 0) {
      setCurrentUserStories(userStories);
      setCurrentView('story');
      setCurrentStoryIndex(0);
      setIsPaused(false);
      markStatusAsViewed(userStories[0]._id);
    }
  };

  const handleNextStory = useCallback(() => {
    if (currentStoryIndex < currentUserStories.length - 1) {
      const nextIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(nextIndex);
      markStatusAsViewed(currentUserStories[nextIndex]._id);
    } else {
      setCurrentView('list');
      setCurrentStoryIndex(0);
    }
  }, [currentStoryIndex, currentUserStories]);

  const handlePrevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    }
  }, [currentStoryIndex]);

  const handleProgressComplete = useCallback(() => {
    handleNextStory();
  }, [handleNextStory]);

  const handleSegmentComplete = useCallback((index: number) => {
    // Optional: Handle individual segment completion
  }, []);

  const handleMediaLoad = (statusId: string) => {
    setMediaLoading(prev => ({
      ...prev,
      [statusId]: false
    }));
  };

  const handleMediaError = (statusId: string) => {
    setMediaLoading(prev => ({
      ...prev,
      [statusId]: false
    }));
  };

  const renderMediaPreview = (status: Status) => {
    if (status.imageUrl) {
      return (
        <div className="relative mt-2 rounded-lg overflow-hidden">
          {mediaLoading[status._id] && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <CircularProgress size={24} />
            </div>
          )}
          <img
            src={status.imageUrl}
            alt="Status"
            className={`w-full h-40 object-cover ${mediaLoading[status._id] ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => handleMediaLoad(status._id)}
            onError={() => handleMediaError(status._id)}
          />
        </div>
      );
    }
    if (status.videoUrl) {
      return (
        <div className="relative mt-2 rounded-lg overflow-hidden">
          {mediaLoading[status._id] && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <CircularProgress size={24} />
            </div>
          )}
          <video
            src={status.videoUrl}
            className={`w-full h-40 object-cover ${mediaLoading[status._id] ? 'opacity-0' : 'opacity-100'}`}
            onLoadedData={() => handleMediaLoad(status._id)}
            onError={() => handleMediaError(status._id)}
          />
        </div>
      );
    }
    return null;
  };

  const handleAddStatus = async (file: File, caption?: string) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (caption) formData.append("text", caption);

      await postApi(API_ENDPOINTS.STATUS.CREATE, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setShowAddModal(false);
      await fetchStatuses();
    } catch (error) {
      console.error("Failed to upload status:", error);
    }
  };

  // Find current user's status
  const myStatus = [...statusUpdates, ...viewedUpdates].find(status => status.userId._id === currentUserId);

  if (loading) {
    return (
      <div className={`h-screen w-80 ${bgColor} flex items-center justify-center`}>
        <CircularProgress />
      </div>
    );
  }
const DEFAULT_AVATAR = "/default-avatar.png";
 if (currentView === 'story' && currentUserStories?.length > 0) {
  const currentStory = currentUserStories[currentStoryIndex];
  const currentStoryUser = currentStory.userId;
 const currentStoryUserAvatar = chatusers.find(u => u.id === currentStoryUser?._id)?.profilePicture 
    || currentStoryUser?.avatar 
    || DEFAULT_AVATAR;
    return (
      <div className={`h-screen w-100 ${bgColor} relative`}>
        {/* Story View Header */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/50 to-transparent">
          {/* Progress Bar */}
          <StoryProgressBar
            segments={currentUserStories.length}
            currentIndex={currentStoryIndex}
            duration={5000} // 5 seconds per story
            isPaused={isPaused}
            onComplete={handleProgressComplete}
            onSegmentComplete={handleSegmentComplete}
          />
          
          {/* Header Info */}
          <div className="flex justify-between items-center px-4 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
             <Avatar
  src={currentStoryUserAvatar}
  alt={currentStoryUser?.name || "User"}
  sx={{ width: 32, height: 32 }}
/>
              </div>
              <div>
                <span className="text-white text-sm font-medium">{currentStory.userId.name}</span>
                <p className="text-white/80 text-xs">{formatTime(currentStory.createdAt)}</p>
              </div>
            </div>
            <IconButton onClick={() => setCurrentView('list')} size="small">
              <Close className="text-white text-xl" />
            </IconButton>
          </div>
        </div>

        {/* Story Content */}
        <div 
          className="h-full w-full flex items-center justify-center bg-black select-none"
          onMouseDown={handlePause}
          onMouseUp={handleResume}
          onMouseLeave={handleResume}
          onTouchStart={handlePause}
          onTouchEnd={handleResume}
          onContextMenu={(e) => e.preventDefault()}
        >
          {mediaLoading[currentStory._id] && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <CircularProgress className="text-white" />
            </div>
          )}
          
          {currentStory.imageUrl && (
            <img 
              src={currentStory.imageUrl} 
              alt="Status" 
              className={`max-h-full max-w-full object-contain ${mediaLoading[currentStory._id] ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => handleMediaLoad(currentStory._id)}
              onError={() => handleMediaError(currentStory._id)}
              draggable={false}
            />
          )}
          
          {currentStory.videoUrl && (
            <video 
              src={currentStory.videoUrl} 
              controls
              autoPlay
              muted
              className={`max-h-full max-w-full ${mediaLoading[currentStory._id] ? 'opacity-0' : 'opacity-100'}`}
              onLoadedData={() => handleMediaLoad(currentStory._id)}
              onError={() => handleMediaError(currentStory._id)}
            />
          )}
          
          {currentStory.text && !currentStory.imageUrl && !currentStory.videoUrl && (
            <div className="p-8 text-center max-w-md">
              <p className="text-white text-2xl font-medium leading-relaxed">{currentStory.text}</p>
            </div>
          )}
          
          {/* Story text overlay for images/videos */}
          {currentStory.text && (currentStory.imageUrl || currentStory.videoUrl) && (
            <div className="absolute bottom-20 left-4 right-4 z-10">
              <p className="text-white text-lg font-medium bg-black/30 p-3 rounded-lg backdrop-blur-sm">
                {currentStory.text}
              </p>
            </div>
          )}
        </div>

        {/* Navigation Areas */}
        <div className="absolute inset-0 flex z-10">
          {/* Left side - Previous story */}
          <div 
            className="w-1/3 h-full cursor-pointer"
            onClick={handlePrevStory}
          />
          
          {/* Right side - Next story */}
          <div 
            className="w-2/3 h-full cursor-pointer"
            onClick={handleNextStory}
          />
        </div>

        {/* Pause indicator */}
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-black/70 rounded-full p-4 backdrop-blur-sm">
              <div className="flex space-x-1">
                <div className="w-1 h-8 bg-white rounded-full"></div>
                <div className="w-1 h-8 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } 

  // List View (rest of your existing list view code remains the same)
  return (
    <>
      <div className={`h-screen w-100 ${bgColor} border-r ${borderColor} flex flex-col transition-all duration-300 ease-in-out`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleStoryClick(currentUserId)}>
            <div
              className={`relative p-0.5 rounded-full ${
                myStatus
                  ? "bg-gradient-to-r from-[#25d366] to-[#128c7e]"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <div className="w-14 h-14 rounded-full overflow-hidden bg-white dark:bg-gray-800 flex items-center justify-center">
                {myStatus?.imageUrl ? (
                  <img
                    src={myStatus.imageUrl}
                    alt="My status"
                    className="w-full h-full object-cover"
                  />
                ) : myStatus?.videoUrl ? (
                  <video
                    src={myStatus.videoUrl}
                    className="w-full h-full object-cover"
                    muted
                    autoPlay
                    loop
                  />
                ) : (
                  <Avatar
                    src={currentUserInfo?.avatar || "/placeholder.svg?height=60&width=60"}
                    className="w-full h-full"
                  />
                )}
              </div>
              
              <div
                className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddModal(true);
                }}
              >
                <span className="text-white text-xs font-bold">+</span>
              </div>
            </div>
            <div>
              <h3 className={`font-medium ${textColor}`}>My Status</h3>
              <p className={`text-sm ${secondaryTextColor}`}>Tap To Add Status Update</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <IconButton 
              size="small" 
              onClick={() => fetchStatuses()}
              disabled={refreshing}
            >
              <Refresh className={`${secondaryTextColor} ${refreshing ? "animate-spin" : ""}`} />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={onBackToChat} 
              className="!text-gray-400"
            >
              <Close />
            </IconButton>
          </div>
        </div>

        {/* Status Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Recent Updates */}
          <div className="p-4">
            <div className="bg-[#e0f2f1] dark:bg-[#1a3a34] text-[#00695c] dark:text-[#4db6ac] px-4 py-2 rounded-lg mb-4">
              <h4 className="font-medium">Recent Updates</h4>
            </div>
            
            {statusUpdates.length > 0 ? (
              statusUpdates.map((status) => (
                <div key={status._id} className="mb-4">
                  <div 
                    className="flex items-center space-x-3 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-2"
                    onClick={() => handleStoryClick(status.userId._id)}
                  >
                    <div className="relative">
                      <div className={`p-0.5 rounded-full ${status.isViewed ? 'bg-gray-300' : 'bg-gradient-to-r from-[#25d366] to-[#128c7e]'}`}>
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white dark:bg-gray-800">
                          {status.imageUrl ? (
                            <img
                              src={status.imageUrl}
                              alt={`${status.userId.name}'s status`}
                              className="w-full h-full object-cover"
                            />
                          ) : status.videoUrl ? (
                            <video
                              src={status.videoUrl}
                              className="w-full h-full object-cover"
                              muted
                              autoPlay
                              loop
                            />
                          ) : (
                            <img
                              src={status.userId.avatar || "/default-avatar.png"}
                              alt={status.userId.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${textColor}`}>{status.userId.name}</h4>
                      <p className={`text-sm ${secondaryTextColor}`}>
                        {status.text ? status.text.substring(0, 20) + (status.text.length > 20 ? '...' : '') : ''}
                        {status.imageUrl ? ' 📷 Photo' : ''}
                        {status.videoUrl ? ' 🎥 Video' : ''}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {formatTime(status.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className={`text-center py-4 ${secondaryTextColor}`}>
                No recent status updates
              </p>
            )}
          </div>

          {/* Viewed Updates */}  
          <div className="px-4 pb-4">
            <h4 className={`font-medium ${textColor} mb-3`}>Viewed Updates</h4>
            
            {viewedUpdates.length > 0 ? (
              viewedUpdates.map((status) => (
                <div key={status._id} className="mb-4">
                  <div 
                    className="flex items-center space-x-3 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-2"
                    onClick={() => handleStoryClick(status.userId._id)}
                  >
                    <div className="relative">
                      <div className="p-0.5 rounded-full bg-gray-300">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-white dark:bg-gray-800 opacity-60">
                          {status.imageUrl ? (
                            <img
                              src={status.imageUrl}
                              alt={`${status.userId.name}'s status`}
                              className="w-full h-full object-cover"
                            />
                          ) : status.videoUrl ? (
                            <video
                              src={status.videoUrl}
                              className="w-full h-full object-cover"
                              muted
                              autoPlay
                              loop
                            />
                          ) : (
                            <img
                              src={status.userId.avatar || "/default-avatar.png"}
                              alt={status.userId.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${status.userId._id === currentUserId ? textColor : secondaryTextColor}`}>
                        {status.userId.name}
                        {status.userId._id === currentUserId && " (You)"}
                      </h4>
                      <p className={`text-sm ${secondaryTextColor}`}>
                        {status.text ? status.text.substring(0, 20) + (status.text.length > 20 ? '...' : '') : ''}
                        {status.imageUrl ? ' 📷 Photo' : ''}
                        {status.videoUrl ? ' 🎥 Video' : ''}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {formatTime(status.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className={`text-center py-4 ${secondaryTextColor}`}>
                No viewed status updates
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Add Status Modal */}
      <AddStatusModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddStatus}
      />
    </>
  );
}