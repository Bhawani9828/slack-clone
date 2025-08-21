// components/ChatInput.tsx - Fixed Double Messages Issue
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
import groupChatSocketService from "@/lib/group-chat-socket.service";

interface ChatInputProps {
  currentUserId: string;
  senderId: string;
  receiverId: string;
  groupId?: string;
  channelId: string;
  onMessageSent: (msg: any) => void;
  onTyping?: (isTyping: boolean) => void;
  replyingTo?: {
    _id: string;
    content: string;
    senderId: string | { _id: string; name?: string };
  } | null;   
  forwarding?: ApiMessage | null;
}

export default function ChatInput({
  currentUserId,
  senderId,
  receiverId,
  groupId,
  channelId,
  onMessageSent,
  onTyping,
  replyingTo,
  forwarding
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false); // ✅ Add sending state
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSentRef = useRef<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // ✅ Track sent messages to prevent duplicates
  const sentMessagesRef = useRef<Set<string>>(new Set());

  const isGroupChat = !!groupId;

  const handleMessageChange = (value: string) => {
    setMessage(value);
    const isCurrentlyTyping = value.trim().length > 0;
    
    if (isCurrentlyTyping !== lastTypingSentRef.current) {
      if (isGroupChat && groupId) {
        if (groupChatSocketService.isConnected()) {
          if (isCurrentlyTyping) {
            groupChatSocketService.startGroupTyping(groupId);
          } else {
            groupChatSocketService.stopGroupTyping(groupId);
          }
          lastTypingSentRef.current = isCurrentlyTyping;
          onTyping?.(isCurrentlyTyping);
        }
      } else if (receiverId) {
        if (socketService.isConnected()) {
          socketService.sendTypingIndicator(receiverId, isCurrentlyTyping);
          lastTypingSentRef.current = isCurrentlyTyping;
          onTyping?.(isCurrentlyTyping);
        }
      }
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isCurrentlyTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        if (isGroupChat && groupId) {
          if (groupChatSocketService.isConnected()) {
            groupChatSocketService.stopGroupTyping(groupId);
            lastTypingSentRef.current = false;
            onTyping?.(false);
          }
        } else if (receiverId) {
          if (socketService.isConnected()) {
            socketService.sendTypingIndicator(receiverId, false);
            lastTypingSentRef.current = false;
            onTyping?.(false);
          }
        }
      }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (lastTypingSentRef.current) {
        if (isGroupChat && groupId && groupChatSocketService.isConnected()) {
          groupChatSocketService.stopGroupTyping(groupId);
        } else if (receiverId && socketService.isConnected()) {
          socketService.sendTypingIndicator(receiverId, false);
        }
      }
    };
  }, [receiverId, groupId, isGroupChat]);

  // ✅ Fixed send handler - prevent duplicates
  const handleSend = async () => {
    // ✅ Prevent multiple sends
    if (isSending || !message.trim() || !currentUserId || (!receiverId && !groupId)) {
      console.warn('❌ Invalid send attempt:', { 
        isSending,
        message: message.length, 
        currentUserId, 
        receiverId, 
        groupId 
      });
      return;
    }

    try {
      // ✅ Set sending state to prevent double sends
      setIsSending(true);
      console.log("🚀 Starting to send message...");

      // Clear typing indicator
      if (lastTypingSentRef.current) {
        if (isGroupChat && groupId) {
          groupChatSocketService.stopGroupTyping(groupId);
        } else if (receiverId) {
          socketService.sendTypingIndicator(receiverId, false);
        }
        lastTypingSentRef.current = false;
        onTyping?.(false);
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      const messageToSend = message.trim();
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // ✅ Check if we've already sent this exact message recently
      const messageKey = `${messageToSend}-${Date.now()}`;
      if (sentMessagesRef.current.has(messageKey)) {
        console.warn('❌ Duplicate message detected, ignoring');
        return;
      }
      
      // ✅ Add to sent messages tracker
      sentMessagesRef.current.add(messageKey);
      
      // ✅ Clean up old entries (keep only last 10 messages)
      if (sentMessagesRef.current.size > 10) {
        const entries = Array.from(sentMessagesRef.current);
        entries.slice(0, entries.length - 10).forEach(entry => {
          sentMessagesRef.current.delete(entry);
        });
      }

      // ✅ Create optimistic message
      const optimisticMessage = {
        _id: tempId,
        senderId: currentUserId,
        receiverId: isGroupChat ? groupId! : receiverId,
        groupId: isGroupChat ? groupId : undefined,
        content: messageToSend,
        type: "text" as const,
        createdAt: new Date().toISOString(),
        isSent: true,
        isDelivered: false,
        isRead: false,
        fileUrl: "",
        fileName: "",
        fileSize: "",
        channelId: isGroupChat ? groupId! : channelId,
        ...(replyingTo && {
          replyTo: replyingTo._id,
          replyToContent: replyingTo.content,
          replyToSender: typeof replyingTo.senderId === 'string'
            ? replyingTo.senderId
            : replyingTo.senderId._id
        }),
        ...(forwarding && { forwardingFrom: forwarding._id })
      };

      // ✅ Show optimistic message immediately for better UX
      onMessageSent(optimisticMessage);
      
      // ✅ Clear input after showing optimistic message
      setMessage("");

      if (isGroupChat && groupId) {
        await groupChatSocketService.sendGroupMessage({
          groupId,
          content: messageToSend,
          type: "text",
          replyTo: replyingTo?._id,
        });
        console.log("✅ Group message sent successfully");
      } else if (receiverId) {
        if (socketService.isConnected()) {
          if (replyingTo) {
            const replyData = {
              originalMessageId: replyingTo._id,
              receiverId,
              content: messageToSend,
              type: 'text',
              channelId,
              replyToContent: replyingTo.content,
              replyToSender: typeof replyingTo.senderId === 'string' 
                ? replyingTo.senderId 
                : replyingTo.senderId._id
            };
            await socketService.replyToMessage(replyData);
          } else if (forwarding) {
            await socketService.forwardMessage({
              messageId: forwarding._id,
              receiverIds: [receiverId]
            });
          } else {
            await socketService.sendMessage({
              senderId: currentUserId,
              receiverId,
              content: messageToSend,
              type: "text",
              channelId,
              createdAt: new Date().toISOString(),
            });
          }
        } else {
          // ✅ API fallback
          await postApi(API_ENDPOINTS.MESSAGES_SEND, {
            senderId: currentUserId,
            receiverId,
            content: messageToSend,
            type: "text",
            fileUrl: "",
            fileName: "",
            fileSize: "",
            channelId,
          });
        }
        console.log("✅ Direct message sent successfully");
      }

      console.log("✅ Message send completed successfully");
      
    } catch (error) {
      console.error("❌ Error sending message:", error);
      // ✅ Remove from sent tracker on error
      const messageKey = `${message.trim()}-${Date.now()}`;
      sentMessagesRef.current.delete(messageKey);
    } finally {
      // ✅ Always reset sending state
      console.log("🔄 Resetting sending state...");
      setIsSending(false);
    }
  };

  // ✅ Enhanced file upload with duplicate prevention
  const sendMessageToSocket = async (messageData: {
    content: string;
    type: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: string | number;
  }) => {
    const messageKey = `file-${messageData.fileUrl}-${Date.now()}`;
    
    // ✅ Prevent duplicate file sends
    if (sentMessagesRef.current.has(messageKey)) {
      console.warn('❌ Duplicate file message detected, ignoring');
      return;
    }
    
    sentMessagesRef.current.add(messageKey);

    try {
      if (isGroupChat && groupId) {
        if (groupChatSocketService.isConnected()) {
          await groupChatSocketService.sendGroupMessage({
            groupId,
            content: messageData.content,
            type: messageData.type as "text" | "image" | "video" | "file",
            fileUrl: messageData.fileUrl,
            fileName: messageData.fileName,
            fileSize: messageData.fileSize?.toString(),
          });
        }
      } else if (receiverId) {
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
      }
    } catch (error) {
      console.error('Error sending file message:', error);
      // ✅ Remove from tracker on error
      sentMessagesRef.current.delete(messageKey);
      throw error;
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || isUploading) return; // ✅ Prevent upload during ongoing upload

    const file = e.target.files[0];
    
    try {
      setIsUploading(true);
      setUploadProgress(0);

      let fileCategory: 'image' | 'video' | 'file' = 'file';
      if (file.type.startsWith('image/')) {
        fileCategory = 'image';
      } else if (file.type.startsWith('video/')) {
        fileCategory = 'video';
      }

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
        receiverId: isGroupChat ? groupId! : receiverId,
        groupId: isGroupChat ? groupId : undefined,
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
        channelId: isGroupChat ? groupId! : channelId,
      };

      // ✅ Update UI immediately with optimistic message
      onMessageSent(newMessage);

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
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*,.pdf,.doc,.docx"
          className="hidden"
        />

        <div className="flex space-x-1">
          <IconButton 
            onClick={() => fileInputRef.current?.click()}
            className="!text-[#01aa85] !bg-[#01aa8526] hover:!bg-[#01aa8552] mb-1"
            title="Attach file"
            disabled={isUploading || isSending} // ✅ Disable during send/upload
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
            disabled={isUploading || isSending}
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
            disabled={isUploading || isSending}
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
            placeholder={isGroupChat ? "Message to group..." : "Write your message..."}
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            variant="outlined"
            size="small"
            disabled={isUploading || isSending} // ✅ Disable during send/upload
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
              if (e.key === "Enter" && !e.shiftKey && !isSending) { // ✅ Prevent send during sending
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>

        {message.trim() ? (
          <IconButton
            onClick={handleSend}
            className={`mb-1 !text-white ${isSending ? '!bg-gray-400' : '!bg-[#01aa85] hover:!bg-[#008f6e]'}`}
            disabled={isUploading || isSending} // ✅ Disable during send/upload
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

      {/* ✅ Sending indicator */}
      {isSending && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Sending message...
        </div>
      )}
    </div>
  );
}