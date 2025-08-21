"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import {
  Avatar,
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
} from "@mui/material"
import {
  InsertDriveFile,
  GetApp,
  ReportProblemOutlined,
  PictureAsPdf,
  Image as ImageIcon,
  Schedule,
  Archive,
  Description,
  GridOn,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
} from "@mui/icons-material"
import Cookies from "js-cookie"
import { useSelector } from "react-redux"
import type { RootState } from "@/lib/store"
import MessageDropdown from "./MessageDropdown"

interface Message {
  _id: string
  senderId: string | { _id: string; name?: string; username?: string; avatar?: string }
  receiverId: string
  content: string
  type: "text" | "image" | "video" | "file"
  createdAt: string
  isSent?: boolean
  fileUrl?: string
  fileName?: string
  fileSize?: string
  reaction?: string
  avatar?: string
  isRead?: boolean
  isDelivered?: boolean
  isError?: boolean
  channelId: string
  isFavorite?: boolean
}

// ✅ Add GroupInfo interface
interface GroupInfo {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  participants: Array<{
    userId: string;
    role: "admin" | "member";
    joinedAt: string;
  }>;
  admins: string[];
  groupImage?: string;
  avatar?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: { 
    content: string; 
    senderId: string; 
    createdAt: string; 
  };
  unreadCount?: number;
}

// ✅ Fixed MessageListProps interface
interface MessageListProps {
  messages: Message[]
  currentUserId: string
  formatTime: (dateString: string) => string
  onReplyMessage?: (messageId: string) => void
  onForwardMessage?: (messageId: string) => void
  onDeleteMessage?: (messageId: string) => void 
  onReply: (msg: Message) => void
  // ✅ Add missing group chat props
  isGroupChat?: boolean
  groupInfo?: GroupInfo | null;
  isCurrentUserAdmin?: boolean
}

// ✅ Fixed function signature with proper destructuring
export default function MessageList({ 
  messages, 
  currentUserId, 
  formatTime, 
  onReplyMessage, 
  onForwardMessage, 
  onDeleteMessage, // ✅ Added missing comma
  onReply,
  isGroupChat = false,
  groupInfo,
  isCurrentUserAdmin = false 
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [localMessages, setLocalMessages] = useState<Message[]>(messages)
const [deletedIds, setDeletedIds] = useState<string[]>([])
  const chatUsers = useSelector((state: RootState) => state.user.chatusers)

  const avatarMap = useMemo(() => {
    const map = chatUsers.reduce(
      (acc, user) => {
        acc[user.id] = user.avatar
        return acc
      },
      {} as Record<string, string>,
    )

    // ✅ Add group participants to avatar map if it's a group chat
    if (isGroupChat && groupInfo?.participants) {
      groupInfo.participants.forEach(participant => {
        if (!map[participant.userId]) {
          // You might want to fetch participant details or use default
          map[participant.userId] = '' // Default empty, will use fallback
        }
      })
    }

    return map
  }, [chatUsers, isGroupChat, groupInfo])

  // ✅ Helper function to get sender name for group chats
  const getSenderName = useCallback((senderId: string | { _id: string; name?: string; username?: string }) => {
    if (typeof senderId === 'string') {
      if (isGroupChat && groupInfo?.participants) {
        const participant = groupInfo.participants.find(p => p.userId === senderId)
        // You might want to get the actual name from your user data
        return senderId // For now, return the ID, but you could enhance this
      }
      return senderId
    }
    return senderId.name || senderId.username || senderId._id
  }, [isGroupChat, groupInfo])

  const handleDeleteMessage = useCallback((messageId: string) => {
    console.log(`Deleting message: ${messageId}`)

    // Only allow admins to delete messages in group chats, or let users delete their own messages
    if (isGroupChat) {
      const message = localMessages.find(msg => msg._id === messageId)
      const isSenderCurrentUser = typeof message?.senderId === 'string' 
        ? message.senderId === currentUserId
        : message?.senderId._id === currentUserId

      if (!isCurrentUserAdmin && !isSenderCurrentUser) {
        console.log('User not authorized to delete this message')
        return
      }
    }

    // Call the parent delete handler if provided
    onDeleteMessage?.(messageId)

    // Update local state
    setLocalMessages(prev =>
      prev.filter(msg => msg._id !== messageId)
    )
  }, [isGroupChat, isCurrentUserAdmin, currentUserId, localMessages, onDeleteMessage])
  const handleDelete = (id: string) => {
  setDeletedIds(prev => [...prev, id])
}

 useEffect(() => {
  const enriched = messages.map((msg) => ({
    ...msg,
    avatar: avatarMap[
      typeof msg.senderId === "string" ? msg.senderId : msg.senderId._id
    ] || "",
  }))

  const uniqueMessages = Array.from(
    new Map(enriched.map((msg) => [msg._id, msg])).values()
  )

  // Exclude deleted messages
  const filteredMessages = uniqueMessages.filter(
    msg => !deletedIds.includes(msg._id)
  )

  setLocalMessages(filteredMessages)
}, [messages, avatarMap, deletedIds])


  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [localMessages, scrollToBottom])

  const handleDownload = async (fileUrl: string, fileName: string) => {
    setDownloading(fileUrl)
    try {
      const token = Cookies.get("auth_token")
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/messages/download?url=${encodeURIComponent(
        fileUrl,
      )}&filename=${encodeURIComponent(fileName)}`

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Download failed")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName || "download"
      document.body.appendChild(link)
      link.click()

      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      console.error("Download error:", error)
      alert(`Download failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setDownloading(null)
    }
  }

  const renderFileIcon = (fileName: string) => {
    const extension = fileName?.split(".").pop()?.toLowerCase()

    switch (extension) {
      case "pdf":
        return <PictureAsPdf sx={{ color: "#d32f2f" }} />
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <ImageIcon sx={{ color: "#1976d2" }} />
      case "zip":
      case "rar":
      case "7z":
        return <Archive sx={{ color: "#ff9800" }} />
      case "doc":
      case "docx":
        return <Description sx={{ color: "#2196f3" }} />
      case "xls":
      case "xlsx":
        return <GridOn sx={{ color: "#4caf50" }} />
      default:
        return <InsertDriveFile sx={{ color: "#757575" }} />
    }
  }

  const renderMessageStatus = (msg: Message) => {
    if (!msg.isSent) return null
    if (msg.isError) return <ReportProblemOutlined sx={{ fontSize: 16, color: "#d32f2f", ml: 0.5 }} />
    if (msg.isRead) return <DoneAllIcon sx={{ fontSize: 16, color: "#4caf50", ml: 0.5 }} />
    if (msg.isDelivered) return <CheckIcon sx={{ fontSize: 16, color: "#9e9e9e", ml: 0.5 }} />
    return <Schedule sx={{ fontSize: 16, color: "#9e9e9e", ml: 0.5 }} />
  }

  const renderMediaContent = (msg: Message, isSentByCurrentUser: boolean) => {
    if (!msg.fileUrl) return null

    const isCloudinaryUrl = msg.fileUrl.includes("res.cloudinary.com")
    const mediaUrl = isCloudinaryUrl ? msg.fileUrl : `${process.env.NEXT_PUBLIC_API_URL}${msg.fileUrl}`
    const fileExtension = msg.fileName?.split(".").pop()?.toLowerCase() || ""
    const isImage = ["jpg", "jpeg", "png", "gif"].includes(fileExtension)
    const isVideo = ["mp4", "webm", "ogg", "mov"].includes(fileExtension)

    return (
      <Box sx={{ position: "relative", mt: 1 }}>
        {isImage && (
          <Box sx={{ position: "relative" }}>
            <img
              src={mediaUrl || "/placeholder.svg?height=300&width=300&query=chat image"}
              alt={msg.fileName || "Sent image"}
              style={{
                maxWidth: "100%",
                maxHeight: "300px",
                borderRadius: "8px",
                objectFit: "cover",
                cursor: "pointer",
              }}
              onClick={() => handleDownload(msg.fileUrl!, msg.fileName!)}
            />
            <IconButton
              size="small"
              sx={{
                position: "absolute",
                bottom: 8,
                right: 8,
                backgroundColor: "rgba(0,0,0,0.5)",
                color: "white",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.7)" },
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleDownload(msg.fileUrl!, msg.fileName!)
              }}
            >
              <GetApp fontSize="small" />
            </IconButton>
          </Box>
        )}

        {isVideo && (
          <Box sx={{ position: "relative" }}>
            <video
              controls
              style={{
                maxWidth: "100%",
                maxHeight: "300px",
                borderRadius: "8px",
              }}
            >
              <source src={mediaUrl} type={`video/${fileExtension}`} />
              {"Your browser does not support the video tag."}
            </video>
            <IconButton
              size="small"
              sx={{
                position: "absolute",
                bottom: 8,
                right: 8,
                backgroundColor: "rgba(0,0,0,0.5)",
                color: "white",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.7)" },
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleDownload(msg.fileUrl!, msg.fileName || `video.${fileExtension}`)
              }}
            >
              <GetApp fontSize="small" />
            </IconButton>
          </Box>
        )}

        {!isImage && !isVideo && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              p: 1,
              bgcolor: isSentByCurrentUser ? "#b8e6b8" : "#f0f0f0",
              borderRadius: 1,
              gap: 1,
            }}
          >
            {renderFileIcon(msg.fileName || "")}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {msg.fileName}
              </Typography>
              {msg.fileSize && (
                <Typography variant="caption" color="text.secondary">
                  {msg.fileSize}
                </Typography>
              )}
            </Box>
            <IconButton
              size="small"
              onClick={() => handleDownload(msg.fileUrl!, msg.fileName!)}
              disabled={downloading === msg.fileUrl}
            >
              {downloading === msg.fileUrl ? <CircularProgress size={24} /> : <GetApp fontSize="small" />}
            </IconButton>
          </Box>
        )}
      </Box>
    )
  }

  const getAvatarFallback = (senderId: string | { _id: string; name?: string; username?: string }) => {
    if (typeof senderId === "string") {
      return senderId.charAt(0).toUpperCase()
    } else if (senderId.name) {
      return senderId.name.charAt(0).toUpperCase()
    } else if (senderId.username) {
      return senderId.username.charAt(0).toUpperCase()
    }
    return "U"
  }

  const handleReplyMessage = useCallback((messageId: string) => {
    console.log(`Replying to message: ${messageId}`)
    onReplyMessage?.(messageId)
  }, [onReplyMessage])

  const handleForwardMessage = useCallback((messageId: string) => {
    console.log(`Forwarding message: ${messageId}`)
    onForwardMessage?.(messageId)
  }, [onForwardMessage])

  return (
    <Box
      sx={{
        flex: 1,
        overflowY: "auto",
        px: 2,
        py: 1,
        "&::-webkit-scrollbar": { width: "6px" },
        "&::-webkit-scrollbar-track": { background: "#f1f1f1" },
        "&::-webkit-scrollbar-thumb": {
          background: "#c1c1c1",
          borderRadius: "3px",
        },
        "&::-webkit-scrollbar-thumb:hover": { background: "#a8a8a8" },
        backgroundImage: `url(/2.jpg)`, 
        backgroundRepeat: "repeat",
        backgroundPosition: "top",
        backgroundAttachment: "fixed", 
        backgroundColor: "#e0f2f1",
        margin: 0,
        paddingTop: 0,
      }}
    >
      {localMessages
        ?.filter((msg) => !!msg && !!msg.senderId)
        .map((msg) => {
          const isSentByCurrentUser =
            (typeof msg.senderId === "string" ? msg.senderId : msg.senderId._id) === currentUserId
          const avatarSrc = msg.avatar || ""
          const avatarFallback = getAvatarFallback(msg.senderId)
          const senderName = getSenderName(msg.senderId) // ✅ Get sender name

          return (
            <Box
              key={msg._id}
              sx={{
                display: "flex",
                width: "100%",
                justifyContent: isSentByCurrentUser ? "flex-end" : "flex-start",
                alignItems: "flex-start",
                mb: 1,
                "&:hover .message-options-button": {
                  opacity: 1,
                },
              }}
            >
              {!isSentByCurrentUser && (
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: "14px",
                    bgcolor: "#00bfa5",
                    mr: 1,
                    flexShrink: 0,
                  }}
                  src={avatarSrc}
                >
                  {avatarFallback}
                </Avatar>
              )}

              {isSentByCurrentUser && (
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: "14px",
                    bgcolor: "#01aa85",
                    mr: 1,
                    flexShrink: 0,
                  }}
                  src={avatarSrc}
                >
                  {avatarFallback}
                </Avatar>
              )}

              <Box sx={{ 
                position: "relative", 
                maxWidth: "70%",
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexDirection: "row"
              }}>
                <Card
                  sx={{
                    bgcolor: isSentByCurrentUser ? "#01aa85" : "#ffffff",
                    color: isSentByCurrentUser ? "#ffffff" : "#000",
                    boxShadow: "0 1px 0.5px rgba(0,0,0,.13)",
                    borderRadius: isSentByCurrentUser ? "10px 10px 0 10px" : "10px 10px 10px 0",
                    p: msg.type === "image" || msg.type === "video" || msg.type === "file" ? 0.5 : 1.5,
                  }}
                >
                  <CardContent
                    sx={{
                      p: msg.type === "image" || msg.type === "video" || msg.type === "file" ? 0.5 : 1.5,
                      "&:last-child": {
                        pb: msg.type === "image" || msg.type === "video" || msg.type === "file" ? 0.5 : 1.5,
                      },
                    }}
                  >
                    {/* ✅ Show sender name in group chats for messages from others */}
                    {isGroupChat && !isSentByCurrentUser && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#01aa85",
                          fontWeight: "bold",
                          fontSize: "0.75rem",
                          mb: 0.5,
                          display: "block"
                        }}
                      >
                        {senderName}
                      </Typography>
                    )}

                    {msg.type === "text" && (
                      <Typography
                        variant="body2"
                        sx={{
                          wordBreak: "break-word",
                          whiteSpace: "pre-wrap",
                          color: isSentByCurrentUser ? "#ffffff" : "#000",
                        }}
                      >
                        {msg.content}
                      </Typography>
                    )}

                    {(msg.type === "image" || msg.type === "file" || msg.type === "video") &&
                      renderMediaContent(msg, isSentByCurrentUser)}

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        mt: 0.5,
                        gap: 0.5,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: isSentByCurrentUser ? "#ffffffb3" : "#667781",
                          fontSize: "0.7rem",
                          lineHeight: 1,
                        }}
                      >
                        {formatTime(msg.createdAt)}
                      </Typography>
                      {isSentByCurrentUser && renderMessageStatus(msg)}
                    </Box>
                  </CardContent>
                </Card>

                {/* ✅ Enhanced MessageDropdown with group chat context */}
                <MessageDropdown
                  messageId={msg._id}
                  messageContent={msg.content}
                  isSentByCurrentUser={isSentByCurrentUser}
                  senderId={typeof msg.senderId === "string" ? msg.senderId : msg.senderId._id}
                  receiverId={msg.receiverId}
                  isFavorite={msg.isFavorite || false}
                  messageType={msg.type}
                  onReply={handleReplyMessage}
                  onForward={handleForwardMessage}
                  onDelete={handleDeleteMessage}
                  // ✅ Pass group chat context to dropdown
                  isGroupChat={isGroupChat}
                  isCurrentUserAdmin={isCurrentUserAdmin}
                  
                />
              </Box>
            </Box>
          )
        })}

      <div ref={messagesEndRef} />
    </Box>
  )
}