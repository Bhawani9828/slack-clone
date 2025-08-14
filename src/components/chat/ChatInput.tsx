// components/ChatInput.tsx - FIXED VERSION
"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { TextField, IconButton } from "@mui/material";
import {
  Send,
  EmojiEmotions,
  Mic,
  AttachFile,
  Image,
  VideoCameraBack,
} from "@mui/icons-material";
import API_ENDPOINTS from "@/axios/apiEndpoints";
import axios from "axios";
import { uploadThroughBackend, uploadToCloudinary } from "@/axios/cloudinaryService";
import { postApi } from "@/axios/apiService";
import { socketService } from "@/lib/socket";
import { ApiMessage } from "@/types/chatTypes";

interface ChatInputProps {
  currentUserId: string;
  senderId: string;
  receiverId: string;
  channelId: string;
  onMessageSent: (msg: any) => void;
  onTyping?: (isTyping: boolean) => void;
   replyingTo?: ApiMessage | null;    
  forwarding?: ApiMessage | null;
}

export default function ChatInput({
  currentUserId,
  senderId,
  receiverId,
  channelId,
  onMessageSent,
  onTyping,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSentRef = useRef<boolean>(false);

  // FIXED: Enhanced typing handler
  const handleMessageChange = (value: string) => {
    setMessage(value);
    const isCurrentlyTyping = value.trim().length > 0;
    
    // Only emit if state changed
    if (isCurrentlyTyping !== lastTypingSentRef.current) {
      if (socketService.isConnected()) {
        socketService.sendTypingIndicator(receiverId, isCurrentlyTyping);
        lastTypingSentRef.current = isCurrentlyTyping;
        onTyping?.(isCurrentlyTyping);
      }
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    if (isCurrentlyTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        if (socketService.isConnected()) {
          socketService.sendTypingIndicator(receiverId, false);
          lastTypingSentRef.current = false;
          onTyping?.(false);
        }
      }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (lastTypingSentRef.current && socketService.isConnected()) {
        socketService.sendTypingIndicator(receiverId, false);
      }
    };
  }, [receiverId]);

  // FIXED: Enhanced send handler with better socket integration
  const handleSend = async () => {
    if (!message.trim() || !currentUserId || !receiverId) {
      console.warn('❌ Invalid send attempt:', { message: message.length, currentUserId, receiverId });
      return;
    }

    console.log("=== SENDING MESSAGE VIA SOCKET ===");
    
    // Clear typing status immediately
    if (lastTypingSentRef.current && socketService.isConnected()) {
      socketService.sendTypingIndicator(receiverId, false);
      lastTypingSentRef.current = false;
      onTyping?.(false);
    }

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const messageToSend = message.trim();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create optimistic message for immediate UI update
    const optimisticMessage = {
      _id: tempId,
      senderId: currentUserId,
      receiverId: receiverId,
      content: messageToSend,
      type: "text" as const,
      createdAt: new Date().toISOString(),
      isSent: true,
      isDelivered: false,
      isRead: false,
      fileUrl: "",
      fileName: "",
      fileSize: "",
      channelId: channelId,
    };

    console.log("📤 Optimistic message:", optimisticMessage);

    // Update UI immediately
    onMessageSent(optimisticMessage);
    setMessage("");

    try {
      // CRITICAL: Send via Socket.IO for instant delivery
      if (socketService.isConnected()) {
        const socketPayload = {
          senderId: currentUserId, // Use currentUserId for socket
          receiverId: receiverId,
          content: messageToSend,
          type: "text",
          channelId: channelId,
          createdAt: new Date().toISOString(),
        };

        console.log("🚀 Sending via Socket.IO:", socketPayload);
        await socketService.sendMessage(socketPayload);
        console.log("✅ Message sent via Socket.IO successfully");

      } else {
        console.warn("⚠️ Socket not connected, falling back to API");
        
        // Fallback: Send via HTTP API
        const apiPayload = {
          senderId: senderId, // Use senderId for API
          receiverId: receiverId,
          content: messageToSend,
          type: "text",
          fileUrl: "",
          fileName: "",
          fileSize: "",
          channelId: channelId,
        };

        console.log("🌐 Sending via API:", apiPayload);
        const response: any = await postApi(API_ENDPOINTS.MESSAGES_SEND, apiPayload);
        console.log("✅ API Response:", response);
      }

    } catch (error) {
      console.error("❌ Error sending message:", error);
      
      // Show error to user or retry logic could go here
      // You might want to update the optimistic message to show error state
    }
  };

  // Enhanced file upload with socket integration
  const sendMessageToSocket = async (messageData: {
    content: string;
    type: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: string | number;
  }) => {
    try {
      if (socketService.isConnected()) {
        const socketPayload = {
          senderId: currentUserId,
          receiverId,
          content: messageData.content,
          type: messageData.type,
          fileUrl: messageData.fileUrl || '',
          fileName: messageData.fileName || '',
          fileSize: messageData.fileSize?.toString() || '',
          channelId,
          createdAt: new Date().toISOString(),
        };

        console.log("📤 Sending file message via socket:", socketPayload);
        await socketService.sendMessage(socketPayload);
      } else {
        // Fallback to API
        const payload = {
          senderId,
          receiverId,
          content: messageData.content,
          type: messageData.type,
          fileUrl: messageData.fileUrl || '',
          fileName: messageData.fileName || '',
          fileSize: messageData.fileSize?.toString() || '',
          channelId,
        };

        await postApi(API_ENDPOINTS.MESSAGES_SEND, payload);
      }
    } catch (error) {
      console.error('Error sending file message:', error);
      throw error;
    }
  };

  // Enhanced file change handler
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Determine file category
      let fileCategory: 'image' | 'video' | 'file' = 'file';
      if (file.type.startsWith('image/')) {
        fileCategory = 'image';
      } else if (file.type.startsWith('video/')) {
        fileCategory = 'video';
      }

      // Upload file
      const uploadMethod = file.size > 5 * 1024 * 1024 ? uploadThroughBackend : uploadToCloudinary;
      
      const data = await uploadMethod(file, fileCategory, (percentCompleted) => {
        setUploadProgress(percentCompleted);
      });

      if (!data?.secure_url) {
        throw new Error('Upload failed - no URL returned');
      }

      const messageType = fileCategory;
      const newMessage = {
        _id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        senderId: currentUserId,
        receiverId: receiverId,
        content: messageType === 'image' ? 'Sent an image' 
                : messageType === 'video' ? 'Sent a video' 
                : `Sent a file: ${file.name}`,
        type: messageType,
        createdAt: new Date().toISOString(),
        isSent: true,
        isDelivered: false,
        isRead: false,
        fileUrl: data.secure_url,
        fileName: file.name,
        fileSize: file.size.toString(),
        channelId: channelId,
      };

      // Update UI immediately
      onMessageSent(newMessage);

      // Send via socket
      await sendMessageToSocket({
        content: newMessage.content,
        type: newMessage.type,
        fileUrl: newMessage.fileUrl,
        fileName: newMessage.fileName,
        fileSize: newMessage.fileSize,
      });

    } catch (error) {
      let errorMessage = 'File upload failed';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      }
      
      console.error('Upload failed:', error);
      alert(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-[#fff] px-4 py-3">
      <div className="flex items-end space-x-2">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*,.pdf,.doc,.docx"
          className="hidden"
        />

        {/* Attachment buttons */}
        <div className="flex space-x-1">
          <IconButton 
            onClick={() => fileInputRef.current?.click()}
            className="!text-[#01aa85] !bg-[#01aa8526] hover:!bg-[#01aa8552] mb-1"
            title="Attach file"
            disabled={isUploading}
          >
            <AttachFile />
          </IconButton>
          
          <IconButton 
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = "image/*";
                fileInputRef.current.click();
              }
            }}
            className="!text-[#01aa85] !bg-[#01aa8526] hover:!bg-[#01aa8552] mb-1"
            title="Send image"
            disabled={isUploading}
          >
            <Image />
          </IconButton>
          
          <IconButton 
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = "video/*";
                fileInputRef.current.click();
              }
            }}
            className="!text-[#01aa85] !bg-[#01aa8526] hover:!bg-[#01aa8552] mb-1"
            title="Send video"
            disabled={isUploading}
          >
            <VideoCameraBack />
          </IconButton>
        </div>

        <IconButton className="!text-[#01aa85] !bg-[#01aa8526] hover:!bg-[#01aa8552] mb-1">
          <EmojiEmotions />
        </IconButton>

        <div className="flex-1">
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Write your message..."
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            variant="outlined"
            size="small"
            disabled={isUploading}
            className="bg-white rounded-full"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "25px",
                backgroundColor: "white",
                "& fieldset": { borderColor: "transparent" },
                "&:hover fieldset": { borderColor: "transparent" },
                "&.Mui-focused fieldset": { borderColor: "transparent" },
              },
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>

        {message.trim() ? (
          <IconButton
            onClick={handleSend}
            className="mb-1 !text-white !bg-[#01aa85] hover:!bg-[#008f6e]"
            disabled={isUploading}
          >
            <Send />
          </IconButton>
        ) : (
          <IconButton className="mb-1 !text-[#01aa85] !bg-[#01aa8526] hover:!bg-[#01aa8552]">
            <Mic />
          </IconButton>
        )}
      </div>

      {/* Upload progress indicator */}
      {isUploading && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div 
            className="bg-[#01aa85] h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${uploadProgress}%` }}
          ></div>
          <p className="text-sm text-gray-600 mt-1 text-center">
            Uploading... {uploadProgress.toFixed(0)}%
          </p>
        </div>
      )}
    </div>
  );
}