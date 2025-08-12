"use client";

import { useRef, useState, useEffect } from "react";
import { Avatar } from "@mui/material";
import { getApi, postApi } from "@/axios/apiService";
import API_ENDPOINTS from "@/axios/apiEndpoints";
import AddStatusModal from "./AddStatusModal";

interface StatusCarouselProps {
  onViewAll: () => void;
  onStatusClick: (userId: string) => void;
  currentUserId: string;
}

interface StatusUser {
  _id: string;
  userId: {
    _id: string;
    name: string;
    avatar?: string;
  };
  lastStatus?: {
    type: "image" | "video";
    url: string;
    createdAt: string;
    isViewed: boolean;
  };
}

export default function StatusCarousel({
  onViewAll,
  onStatusClick,
  currentUserId,
}: StatusCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [statusUsers, setStatusUsers] = useState<StatusUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);

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
    console.log("Current User Info Set:", userInfo);
  }, [currentUserId]);

  const fetchStatuses = async () => {
    try {
      const response = await getApi<any[]>(API_ENDPOINTS.STATUS.RECENT);
      const uniqueUsersMap = new Map();

      response.forEach((status) => {
        const userId = status.userId._id;

        if (!uniqueUsersMap.has(userId)) {
          uniqueUsersMap.set(userId, {
            _id: status._id,
            userId: {
              _id: userId,
              name: status.userId.name,
              avatar: status.userId.avatar || "/default-avatar.png",
            },
            lastStatus: {
              type: status.imageUrl ? "image" : "video",
              url: status.imageUrl || status.videoUrl || "",
              createdAt: status.createdAt,
              isViewed: status.isViewed,
            },
          });
        }
      });

      const transformedData = Array.from(uniqueUsersMap.values());
      
      // Debug logs
      console.log("Current User ID:", currentUserId);
      console.log("All Status Users:", transformedData);
      console.log("Looking for user with ID:", currentUserId);
      
      setStatusUsers(transformedData);
    } catch (error) {
      console.error("Error fetching statuses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const handleAddStatus = async (file: File, caption?: string) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (caption) formData.append("text", caption);

      await postApi(API_ENDPOINTS.STATUS.CREATE, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setShowAddModal(false);
      await fetchStatuses(); // Refresh status list
    } catch (error) {
      console.error("Failed to upload status:", error);
    }
  };

  // Find current user's status and separate others
  const myStatus = statusUsers.find(user => user.userId._id === currentUserId);
  const otherStatuses = statusUsers.filter(user => user.userId._id !== currentUserId);

  console.log("My Status Found:", myStatus);
  console.log("Other Statuses Count:", otherStatuses.length);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    return diffInHours < 24
      ? date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (loading) return <div className="p-4">Loading statuses...</div>;

  return (
    <>
      <div className="relative px-4 py-2">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">Status</h4>
          <button
            onClick={onViewAll}
            className="text-sm text-[#25d366] hover:underline cursor-pointer"
          >
            View All
          </button>
        </div>

        <div className="relative flex items-center">
          <div
            ref={carouselRef}
            className="flex space-x-4 overflow-x-auto scroll-smooth pb-2"
            style={{ scrollbarWidth: "none" }}
          >
            {/* My Status - Always shown first */}
            <div
              onClick={() => onStatusClick(currentUserId)}
              className="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer w-16"
            >
              <div
                className={`relative p-0.5 rounded-full ${
                  myStatus?.lastStatus
                    ? "bg-gradient-to-r from-[#25d366] to-[#128c7e]"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <div className="w-14 h-14 rounded-full overflow-hidden bg-white dark:bg-gray-800 flex items-center justify-center">
                  {myStatus?.lastStatus ? (
                    myStatus.lastStatus.type === "image" ? (
                      <img
                        src={myStatus.lastStatus.url}
                        alt="My status"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={myStatus.lastStatus.url}
                        className="w-full h-full object-cover"
                        muted
                        autoPlay
                        loop
                      />
                    )
                  ) : (
                    <Avatar
                      src={currentUserInfo?.avatar || "/placeholder.svg?height=60&width=60"}
                      className="w-full h-full"
                    />
                  )}
                </div>
                
                {/* "+" badge to add new status - always visible for current user */}
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
              <span className="text-xs text-gray-600 dark:text-gray-300 truncate w-full text-center">
                My Status
              </span>
              {myStatus?.lastStatus && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {formatTime(myStatus.lastStatus.createdAt)}
                </span>
              )}
            </div>

            {/* Other users' statuses - exclude current user */}
            {otherStatuses.map((user) => (
              <div
                key={user._id}
                onClick={() => onStatusClick(user.userId._id)}
                className="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer w-16"
              >
                <div
                  className={`p-0.5 rounded-full ${
                    user.lastStatus && !user.lastStatus.isViewed
                      ? "bg-gradient-to-r from-[#25d366] to-[#128c7e]"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-black">
                    {user.lastStatus?.type === "image" ? (
                      <img
                        src={user.lastStatus.url}
                        alt={`${user.userId.name}'s status`}
                        className="w-full h-full object-cover"
                      />
                    ) : user.lastStatus?.type === "video" ? (
                      <video
                        src={user.lastStatus.url}
                        className="w-full h-full object-cover"
                        muted
                        autoPlay
                        loop
                      />
                    ) : (
                      <Avatar
                        src={user.userId.avatar || "/placeholder.svg?height=60&width=60"}
                        className="w-full h-full"
                      />
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-300 truncate w-full text-center">
                  {user.userId.name}
                </span>
                {user.lastStatus && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {formatTime(user.lastStatus.createdAt)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      <AddStatusModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddStatus}
      />
    </>
  );
}