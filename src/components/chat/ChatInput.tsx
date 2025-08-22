// components/ChatInput.tsx - Fixed Double Messages Issue
"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { TextField, IconButton } from "@mui/material";
import EmojiPicker from "./EmojiPicker";
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
  
  // ✅ Emoji picker state
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLElement | null>(null);
  const isEmojiOpen = Boolean(emojiAnchorEl);

  const openEmojiPicker = (e: React.MouseEvent<HTMLElement>) => {
    setEmojiAnchorEl(e.currentTarget);
  };
  const closeEmojiPicker = () => setEmojiAnchorEl(null);

  const insertAtCaret = (textToInsert: string) => {
    const el = inputRef.current as unknown as HTMLTextAreaElement | null;
    if (!el) {
      setMessage((prev) => prev + textToInsert);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const newValue = (message || "").slice(0, start) + textToInsert + (message || "").slice(end);
    setMessage(newValue);
    // Restore caret after state update in next tick
    requestAnimationFrame(() => {
      try {
        el.focus();
        const caret = start + textToInsert.length;
        el.setSelectionRange(caret, caret);
      } catch {}
    });
  };

  // ✅ Track sent messages to prevent duplicates
  const sentMessagesRef = useRef<Set<string>>(new Set());
  // ✅ Reentrancy lock to prevent double-triggered sends (click + Enter, IME repeats)
  const sendLockRef = useRef<boolean>(false);
  // ✅ Remember last key to avoid repeated Enter due to key repeat
  const lastEnterTimestampRef = useRef<number>(0);

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

  // ✅ Build a stable client id for idempotency
  const buildClientMessageId = (
    content: string,
    extra?: Record<string, string | undefined>
  ) => {
    const base = `${currentUserId}|${isGroupChat ? groupId : receiverId}|${channelId}|${content}`;
    const extras = extra
      ? Object.entries(extra)
          .filter(([, v]) => !!v)
          .map(([k, v]) => `${k}:${v}`)
          .sort()
          .join("|")
      : "";
    // Do NOT include Date.now() in key; stability prevents duplicates
    return extras ? `${base}|${extras}` : base;
  };

  // ✅ Fixed send handler - prevent duplicates
  const handleSend = async () => {
    // Quick guard
    if (!message.trim() || !currentUserId || (!receiverId && !groupId)) {
      return;
    }

    // Reentrancy lock
    if (sendLockRef.current || isSending) {
      return;
    }
    sendLockRef.current = true;

    try {
      setIsSending(true);

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

      // ✅ Stable idempotency key (no Date.now())
      const messageKey = buildClientMessageId(messageToSend, {
        replyTo: replyingTo?._id,
        forwardingFrom: forwarding?._id,
        type: "text",
      });

      if (sentMessagesRef.current.has(messageKey)) {
        console.warn("❌ Duplicate message detected, ignoring");
        return;
      }
      sentMessagesRef.current.add(messageKey);
      // Keep only recent 50 keys
      if (sentMessagesRef.current.size > 50) {
        const entries = Array.from(sentMessagesRef.current);
        entries.slice(0, entries.length - 50).forEach((entry) => {
          sentMessagesRef.current.delete(entry);
        });
      }

      // Optimistic message
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
        clientMessageId: messageKey,
        ...(replyingTo && {
          replyTo: replyingTo._id,
          replyToContent: replyingTo.content,
          replyToSender:
            typeof replyingTo.senderId === "string"
              ? replyingTo.senderId
              : replyingTo.senderId._id,
        }),
        ...(forwarding && { forwardingFrom: forwarding._id }),
      };

      onMessageSent(optimisticMessage);
      setMessage("");

      if (isGroupChat && groupId) {
        await groupChatSocketService.sendGroupMessage({
          groupId,
          content: messageToSend,
          type: "text",
          replyTo: replyingTo?._id,
          // clientMessageId is not in type, but server may ignore unknown fields
          // @ts-ignore
          clientMessageId: messageKey,
        });
      } else if (receiverId) {
        if (socketService.isConnected()) {
          if (replyingTo) {
            const replyData = {
              originalMessageId: replyingTo._id,
              receiverId,
              content: messageToSend,
              type: "text",
              channelId,
              replyToContent: replyingTo.content,
              replyToSender:
                typeof replyingTo.senderId === "string"
                  ? replyingTo.senderId
                  : replyingTo.senderId._id,
              // @ts-ignore
              clientMessageId: messageKey,
            };
            await socketService.replyToMessage(replyData);
          } else if (forwarding) {
            await socketService.forwardMessage({
              messageId: forwarding._id,
              receiverIds: [receiverId],
              // @ts-ignore
              clientMessageId: messageKey,
            });
          } else {
            await socketService.sendMessage({
              senderId: currentUserId,
              receiverId,
              content: messageToSend,
              type: "text",
              channelId,
              createdAt: new Date().toISOString(),
              // @ts-ignore
              clientMessageId: messageKey,
            });
          }
        } else {
          await postApi(API_ENDPOINTS.MESSAGES_SEND, {
            senderId: currentUserId,
            receiverId,
            content: messageToSend,
            type: "text",
            fileUrl: "",
            fileName: "",
            fileSize: "",
            channelId,
            clientMessageId: messageKey,
          });
        }
      }
    } catch (error) {
      console.error("❌ Error sending message:", error);
      // On error, allow retry by removing key
      try {
        const messageToSend = message.trim();
        const messageKey = buildClientMessageId(messageToSend, {
          replyTo: replyingTo?._id,
          forwardingFrom: forwarding?._id,
          type: "text",
        });
        sentMessagesRef.current.delete(messageKey);
      } catch {}
    } finally {
      setIsSending(false);
      sendLockRef.current = false;
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
    // Stable key by url+name+size+type
    const messageKey = buildClientMessageId(messageData.content || messageData.fileUrl || "", {
      type: messageData.type,
      fileUrl: messageData.fileUrl,
      fileName: messageData.fileName,
      fileSize: messageData.fileSize?.toString(),
    });
    
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
            // @ts-ignore
            clientMessageId: messageKey,
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
            // @ts-ignore
            clientMessageId: messageKey,
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
            clientMessageId: messageKey,
          };

          await postApi(API_ENDPOINTS.MESSAGES_SEND, payload);
        }
      }
    } catch (error) {
      console.error('Error sending file message:', error);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isSending) { // ✅ Prevent send during sending
      // Prevent key-repeat double send
      const now = Date.now();
      if (now - lastEnterTimestampRef.current < 300) {
        e.preventDefault();
        return;
      }
      lastEnterTimestampRef.current = now;
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input px-4 py-3">
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

        <IconButton 
          className="!text-[#01aa85] !bg-[#01aa8526] hover:!bg-[#008f6e] mb-1"
          onClick={openEmojiPicker}
          disabled={isUploading || isSending}
        >
          <EmojiEmotions />
        </IconButton>

        <div className="flex-1">
          <TextField
            inputRef={inputRef as any}
            fullWidth
            multiline
            maxRows={4}
            placeholder={isGroupChat ? "Message to group..." : "Write your message..."}
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="outlined"
            size="small"
            disabled={isUploading || isSending}
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
            {uploadProgress === 100 ? "Upload complete!" : `Uploading... ${uploadProgress.toFixed(0)}%`}
          </p>
        </div>
      )}

      {/* Emoji Picker */}
      <EmojiPicker
        anchorEl={emojiAnchorEl}
        open={isEmojiOpen}
        onClose={closeEmojiPicker}
        onSelect={(emoji) => {
          insertAtCaret(emoji);
        }}
      />

      {/* ✅ Sending indicator */}
      {isSending && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Sending message...
        </div>
      )}
    </div>
  );
}