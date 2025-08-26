// components/ChatInput.tsx - Responsive Mobile & Desktop Version
"use client"

import type React from "react"
import { useState, useEffect, useRef, type ChangeEvent } from "react"
import { TextField, IconButton, useMediaQuery, useTheme } from "@mui/material"
import { Send, EmojiEmotions, AttachFile, Image, VideoCameraBack, Add } from "@mui/icons-material"
import API_ENDPOINTS from "@/axios/apiEndpoints"
import axios from "axios"
import { uploadThroughBackend, uploadToCloudinary } from "@/axios/cloudinaryService"
import { postApi } from "@/axios/apiService"
import { socketService } from "@/lib/socket"
import type { ApiMessage } from "@/types/chatTypes"
import groupChatSocketService from "@/lib/group-chat-socket.service"
import EmojiPicker from "./EmojiPicker";

interface ChatInputProps {
  currentUserId: string
  senderId: string
  receiverId: string
  groupId?: string
  channelId: string
  onMessageSent: (msg: any) => void
  onTyping?: (isTyping: boolean) => void
  replyingTo?: {
    _id: string
    content: string
    senderId: string | { _id: string; name?: string }
  } | null
  forwarding?: ApiMessage | null
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
  forwarding,
}: ChatInputProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [message, setMessage] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showAttachOptions, setShowAttachOptions] = useState(false)

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastTypingSentRef = useRef<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastEnterTimestampRef = useRef<number>(0);
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
    requestAnimationFrame(() => {
      try {
        el.focus();
        const caret = start + textToInsert.length;
        el.setSelectionRange(caret, caret);
      } catch {}
    });
  };

  // Enhanced duplicate prevention
  const sentMessagesRef = useRef<Set<string>>(new Set())
  const sendingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [messages, setMessages] = useState<any[]>([])
  const isGroupChat = !!groupId

  const handleMessageChange = (value: string) => {
    setMessage(value)
    const isCurrentlyTyping = value.trim().length > 0

    if (isCurrentlyTyping !== lastTypingSentRef.current) {
      if (isGroupChat && groupId) {
        if (groupChatSocketService.isConnected()) {
          if (isCurrentlyTyping) {
            groupChatSocketService.startGroupTyping(groupId)
          } else {
            groupChatSocketService.stopGroupTyping(groupId)
          }
          lastTypingSentRef.current = isCurrentlyTyping
          onTyping?.(isCurrentlyTyping)
        }
      } else if (receiverId) {
        if (socketService.isConnected()) {
          socketService.sendTypingIndicator(receiverId, isCurrentlyTyping)
          lastTypingSentRef.current = isCurrentlyTyping
          onTyping?.(isCurrentlyTyping)
        }
      }
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (isCurrentlyTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        if (isGroupChat && groupId) {
          if (groupChatSocketService.isConnected()) {
            groupChatSocketService.stopGroupTyping(groupId)
            lastTypingSentRef.current = false
            onTyping?.(false)
          }
        } else if (receiverId) {
          if (socketService.isConnected()) {
            socketService.sendTypingIndicator(receiverId, false)
            lastTypingSentRef.current = false
            onTyping?.(false)
          }
        }
      }, 2000)
    }
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (sendingTimeoutRef.current) {
        clearTimeout(sendingTimeoutRef.current)
      }
      if (lastTypingSentRef.current) {
        if (isGroupChat && groupId && groupChatSocketService.isConnected()) {
          groupChatSocketService.stopGroupTyping(groupId)
        } else if (receiverId && socketService.isConnected()) {
          socketService.sendTypingIndicator(receiverId, false)
        }
      }
    }
  }, [receiverId, groupId, isGroupChat])

  const handleSend = async () => {
    const now = Date.now()
    const messageContent = message.trim()

    if (!messageContent || !currentUserId || (!receiverId && !groupId)) {
      return
    }

    if (isSending) {
      console.warn("❌ Already sending")
      return
    }

    console.log("[v0] Starting to send message, setting isSending to true")
    setIsSending(true)

    sendingTimeoutRef.current = setTimeout(() => {
      console.warn("[v0] Send timeout reached, resetting isSending")
      setIsSending(false)
    }, 10000)

    try {
      console.log("🚀 Sending message...")

      if (lastTypingSentRef.current) {
        if (isGroupChat && groupId) {
          groupChatSocketService.stopGroupTyping(groupId)
        } else if (receiverId) {
          socketService.sendTypingIndicator(receiverId, false)
        }
        lastTypingSentRef.current = false
        onTyping?.(false)
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

      setMessage("")

      const messageKey = `${messageContent}-${currentUserId}-${now}`
      if (sentMessagesRef.current.has(messageKey)) {
        console.warn("❌ Duplicate message detected, ignoring")
        return
      }
      sentMessagesRef.current.add(messageKey)

      const optimisticBase = {
        _id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        senderId: currentUserId,
        content: messageContent,
        type: "text" as const,
        createdAt: new Date().toISOString(),
        isSent: false,
        isDelivered: false,
        isRead: false,
        ...(replyingTo && {
          replyTo: replyingTo._id,
          replyToContent: replyingTo.content,
          replyToSender: typeof replyingTo.senderId === "string" ? replyingTo.senderId : replyingTo.senderId._id,
        }),
        ...(forwarding && { forwardingFrom: forwarding._id }),
      }

      if (isGroupChat && groupId) {
        const optimisticMessage = {
          ...optimisticBase,
          groupId,
          receiverId: groupId,
          channelId: groupId,
        }

        onMessageSent(optimisticMessage)

        if (!groupChatSocketService.isConnected()) {
          throw new Error("Socket not connected for group chat")
        }

        const sentMessageId = await groupChatSocketService.sendGroupMessage({
          groupId,
          content: messageContent,
          type: "text",
          replyTo: replyingTo?._id,
        })

        console.log("✅ Group message sent via socket:", sentMessageId)
      } else if (receiverId) {
        const optimisticMessage = {
          ...optimisticBase,
          receiverId,
          channelId,
        }

        onMessageSent(optimisticMessage)

        if (socketService.isConnected()) {
          if (replyingTo) {
            await socketService.replyToMessage({
              originalMessageId: replyingTo._id,
              receiverId,
              content: messageContent,
              type: "text",
              channelId,
            })
          } else if (forwarding) {
            await socketService.forwardMessage({
              messageId: forwarding._id,
              receiverIds: [receiverId],
            })
          } else {
            await socketService.sendMessage({
              senderId: currentUserId,
              receiverId,
              content: messageContent,
              type: "text",
              channelId,
              createdAt: new Date().toISOString(),
            })
          }
        } else {
          await postApi(API_ENDPOINTS.MESSAGES_SEND, {
            senderId: currentUserId,
            receiverId,
            content: messageContent,
            type: "text",
            channelId,
          })
        }

        console.log("✅ Direct message sent")
      }

      console.log("[v0] Message sent successfully")
    } catch (error) {
      console.error("❌ Error:", error)
      setMessage(messageContent)
      sentMessagesRef.current.delete(`${messageContent}-${currentUserId}-${now}`)
      alert(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      if (sendingTimeoutRef.current) {
        clearTimeout(sendingTimeoutRef.current)
        sendingTimeoutRef.current = null
      }
      console.log("[v0] Resetting isSending to false")
      setIsSending(false)
    }
  }

  const sendFileMessage = async (messageData: {
    content: string
    type: string
    fileUrl?: string
    fileName?: string
    fileSize?: string | number
  }) => {
    const fileKey = `file-${messageData.fileUrl}-${Date.now()}`

    if (sentMessagesRef.current.has(fileKey)) {
      console.warn("❌ Duplicate file message detected, ignoring")
      return
    }

    sentMessagesRef.current.add(fileKey)

    try {
      if (isGroupChat && groupId) {
        if (!groupChatSocketService.isConnected()) {
          throw new Error("Socket not connected for group chat")
        }

        const sentMessageId = await groupChatSocketService.sendGroupMessage({
          groupId,
          content: messageData.content,
          type: messageData.type as "text" | "image" | "video" | "file",
          fileUrl: messageData.fileUrl,
          fileName: messageData.fileName,
          fileSize: messageData.fileSize?.toString(),
        })

        console.log("✅ Group file sent via socket:", sentMessageId)
      } else if (receiverId) {
        if (socketService.isConnected()) {
          const socketPayload = {
            senderId: currentUserId,
            receiverId,
            content: messageData.content,
            type: messageData.type,
            fileUrl: messageData.fileUrl || "",
            fileName: messageData.fileName || "",
            fileSize: messageData.fileSize?.toString() || "",
            channelId,
            createdAt: new Date().toISOString(),
          }

          await socketService.sendMessage(socketPayload)
        } else {
          const payload = {
            senderId,
            receiverId,
            content: messageData.content,
            type: messageData.type,
            fileUrl: messageData.fileUrl || "",
            fileName: messageData.fileName || "",
            fileSize: messageData.fileSize?.toString() || "",
            channelId,
          }

          await postApi(API_ENDPOINTS.MESSAGES_SEND, payload)
        }
      }
    } catch (error) {
      console.error("❌ Error sending file message:", error)
      sentMessagesRef.current.delete(fileKey)
      throw error
    }
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || isUploading || isSending) return

    const file = e.target.files[0]

    try {
      setIsUploading(true)
      setUploadProgress(0)
      setShowAttachOptions(false) // Close attachment menu

      let fileCategory: "image" | "video" | "file" = "file"
      if (file.type.startsWith("image/")) {
        fileCategory = "image"
      } else if (file.type.startsWith("video/")) {
        fileCategory = "video"
      }

      const uploadMethod = file.size > 5 * 1024 * 1024 ? uploadThroughBackend : uploadToCloudinary

      const data = await uploadMethod(file, fileCategory, (percentCompleted) => {
        setUploadProgress(percentCompleted)
      })

      if (!data?.secure_url) {
        throw new Error("Upload failed - no URL returned")
      }

      const messageType = fileCategory
      const newMessage = {
        _id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        senderId: currentUserId,
        receiverId: isGroupChat ? groupId! : receiverId,
        groupId: isGroupChat ? groupId : undefined,
        content:
          messageType === "image"
            ? "Sent an image"
            : messageType === "video"
              ? "Sent a video"
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
      }

      onMessageSent(newMessage)

      setUploadProgress(100)

      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
      }, 500)

      await sendFileMessage({
        content: newMessage.content,
        type: newMessage.type,
        fileUrl: newMessage.fileUrl,
        fileName: newMessage.fileName,
        fileSize: newMessage.fileSize,
      })

      console.log("✅ File upload and send completed")
    } catch (error) {
      let errorMessage = "File upload failed"

      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      } else if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message
      }

      console.error("❌ Upload failed:", error)
      alert(errorMessage)

      setIsUploading(false)
      setUploadProgress(0)
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
        fileInputRef.current.accept = "image/*,video/*,.pdf,.doc,.docx"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isSending) {
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

  const handleAttachmentClick = (type: 'file' | 'image' | 'video') => {
    if (fileInputRef.current) {
      switch (type) {
        case 'image':
          fileInputRef.current.accept = "image/*"
          break;
        case 'video':
          fileInputRef.current.accept = "video/*"
          break;
        case 'file':
          fileInputRef.current.accept = "image/*,video/*,.pdf,.doc,.docx"
          break;
      }
      fileInputRef.current.click()
    }
    setShowAttachOptions(false)
  };

  return (
    <div className={`chat-input bg-white ${isMobile ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <div className={`flex items-end ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*,.pdf,.doc,.docx"
          className="hidden"
        />

        {/* Desktop Attachment Buttons */}
        {!isMobile && (
          <div className="flex space-x-1">
            <IconButton
              onClick={() => handleAttachmentClick('file')}
              className="!text-[#01aa85] !bg-[#01aa8526] hover:!bg-[#01aa8552] mb-1"
              title="Attach file"
              disabled={isUploading || isSending}
              size={isMobile ? "small" : "medium"}
            >
              <AttachFile fontSize="small" />
            </IconButton>

            <IconButton
              onClick={() => handleAttachmentClick('image')}
              className="!text-[#01aa85] !bg-[#01aa8526] hover:!bg-[#01aa8552] mb-1"
              title="Send image"
              disabled={isUploading || isSending}
             size={isMobile ? "small" : "medium"}
            >
              <Image fontSize="small" />
            </IconButton>

            <IconButton
              onClick={() => handleAttachmentClick('video')}
              className="!text-[#01aa85] !bg-[#01aa8526] hover:!bg-[#01aa8552] mb-1"
              title="Send video"
              disabled={isUploading || isSending}
             size={isMobile ? "small" : "medium"}
            >
              <VideoCameraBack fontSize="small" />
            </IconButton>
          </div>
        )}

        {/* Mobile Attachment Button */}
        {isMobile && (
          <div className="relative">
            <IconButton
              onClick={() => setShowAttachOptions(!showAttachOptions)}
              className={`mb-1 ${showAttachOptions ? '!bg-[#01aa85] !text-white' : '!text-[#01aa85] !bg-[#01aa8526]'}`}
              disabled={isUploading || isSending}
              size="small"
            >
              <Add fontSize="small" />
            </IconButton>
            
            {/* Mobile Attachment Options Popup */}
            {showAttachOptions && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border p-2 z-10">
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => handleAttachmentClick('image')}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-left text-sm"
                    disabled={isUploading || isSending}
                  >
                    <Image fontSize="small" className="text-[#01aa85]" />
                    <span>Photo</span>
                  </button>
                  <button
                    onClick={() => handleAttachmentClick('video')}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-left text-sm"
                    disabled={isUploading || isSending}
                  >
                    <VideoCameraBack fontSize="small" className="text-[#01aa85]" />
                    <span>Video</span>
                  </button>
                  <button
                    onClick={() => handleAttachmentClick('file')}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-left text-sm"
                    disabled={isUploading || isSending}
                  >
                    <AttachFile fontSize="small" className="text-[#01aa85]" />
                    <span>File</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Emoji Button */}
        <IconButton 
          className="!text-[#01aa85] !bg-[#01aa8526] hover:!bg-[#008f6e] mb-1"
          onClick={openEmojiPicker}
          disabled={isUploading || isSending}
          size={isMobile ? "small" : "medium"}
        >
          <EmojiEmotions fontSize={isMobile ? "small" : "medium"} />
        </IconButton>

        {/* Text Input */}
        <div className="flex-1">
          <TextField
            inputRef={inputRef as any}
            fullWidth
            multiline
            maxRows={isMobile ? 3 : 4}
            placeholder={isGroupChat ? "Message to group..." : "Write your message..."}
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="outlined"
            size={isMobile ? "small" : "medium"}
            disabled={isUploading || isSending}
            className="rounded-full"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: isMobile ? "20px" : "25px",
                backgroundColor: "white",
                fontSize: isMobile ? "14px" : "16px",
                "& fieldset": { borderColor: "transparent" },
                "&:hover fieldset": { borderColor: "transparent" },
                "&.Mui-focused fieldset": { borderColor: "transparent" },
                "& .MuiOutlinedInput-input": {
                  padding: isMobile ? "8px 12px" : "10px 14px"
                }
              },
            }}
          />
        </div>

        {/* Send Button */}
        <IconButton
          onClick={handleSend}
          className={`mb-1 !text-white transition-all ${
            isSending ? "!bg-gray-400 cursor-not-allowed" : "!bg-[#01aa85] hover:!bg-[#008f6e]"
          }`}
          disabled={isUploading || isSending}
          size={isMobile ? "small" : "medium"}
        >
          <Send fontSize={isMobile ? "small" : "medium"} />
        </IconButton>
      </div>

      {/* Emoji Picker */}
      <EmojiPicker
        anchorEl={emojiAnchorEl}
        open={isEmojiOpen}
        onClose={closeEmojiPicker}
        onSelect={(emoji) => {
          insertAtCaret(emoji);
        }}
      />

      {/* Upload Progress */}
      {isUploading && (
        <div className={`w-full bg-gray-200 rounded-full h-2 ${isMobile ? 'mt-2' : 'mt-3'}`}>
          <div
            className="bg-[#01aa85] h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          ></div>
          <p className={`text-gray-600 text-center ${isMobile ? 'text-xs mt-1' : 'text-sm mt-2'}`}>
            {uploadProgress === 100 ? "Upload complete!" : `Uploading... ${uploadProgress.toFixed(0)}%`}
          </p>
        </div>
      )}

      {/* Click outside to close attachment options */}
      {isMobile && showAttachOptions && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowAttachOptions(false)}
        />
      )}
    </div>
  )
}