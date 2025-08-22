"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import groupChatSocketService from "@/lib/group-chat-socket.service"
import Cookies from "js-cookie"

export interface GroupMessage {
  _id: string
  senderId: string
  groupId: string
  content: string
  type: "text" | "image" | "video" | "file"
  createdAt: string
  isSent: boolean
  isDelivered: boolean
  isRead: boolean
  fileUrl?: string
  fileName?: string
  fileSize?: string
  replyTo?: string
  isForwarded?: boolean
  forwardedFrom?: string
}

export interface GroupInfo {
  _id: string
  name: string
  description?: string
  participants: Array<{
    userId: string
    role: "admin" | "member"
    joinedAt: string
  }>
  admins: string[]
  groupImage?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  lastMessage?: { content: string; senderId: string; createdAt: string }
  unreadCount?: number  
}

export interface CreateGroupData {
  name: string
  description?: string
  participants: string[]
  groupImage?: string
}

export interface UpdateGroupData {
  name?: string
  description?: string
  groupImage?: string
}

export interface GroupStats {
  totalMessages: number
  totalParticipants: number
  totalFiles: number
  totalImages: number
  messagesByType: Record<string, number>
  participantStats: Array<{
    userId: string
    messageCount: number
    lastActivity: string
  }>
}

export const useGroupChat = (groupId: string, currentUserId: string) => {
  // === STATES ===
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [groupStats, setGroupStats] = useState<GroupStats | null>(null)
  const [searchResults, setSearchResults] = useState<GroupInfo[]>([])
  
  // Connection states
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string>("")
  
  // Pagination states
  const [messagesPage, setMessagesPage] = useState(1)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  
  // UI states
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false)
  
  // Refs
  const connectionAttemptRef = useRef<number>(0)
  const maxConnectionAttempts = 3
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // === INITIALIZATION ===
  
  // Set current user ID when hook initializes
  useEffect(() => {
    if (currentUserId) {
      groupChatSocketService.setCurrentUserId(currentUserId)
    }
  }, [currentUserId])
  
  

  // Fetch user groups
  // Fetch user groups
  useEffect(() => {
    const fetchGroups = async () => {
      setIsLoading(true)
      try {
        const token = Cookies.get("auth_token") 
        console.log("🔑 token from cookie:", token)
        if (!token) throw new Error("No auth token found")

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        })

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

        const data = await res.json()
        setGroups(data.data || [])
        
        // Automatically select first group if none selected
        if (!selectedGroupId && data.data.length > 0) {
          setSelectedGroupId(data.data[0]._id)
          setGroupInfo(data.data[0])
        }

        setConnectionError("")
      } catch (err: any) {
        console.error("Failed to fetch groups:", err)
        setConnectionError(err.message || "Failed to fetch groups")
      } finally {
        setIsLoading(false)
      }
    } // Added missing closing brace for fetchGroups function

    fetchGroups()
  }, [selectedGroupId]) // Added missing closing brace for useEffect

  // Main group chat initialization
  useEffect(() => {
    if (!groupId || !currentUserId) {
      console.warn("Missing groupId or currentUserId")
      return
    }

    connectionAttemptRef.current = 0
    
    const initializeGroupChat = async () => {
      try {
        setIsLoading(true)
        setConnectionError("")
        connectionAttemptRef.current++

        console.log(`🔄 Initializing group chat (attempt ${connectionAttemptRef.current})...`)
        
        // Set user ID first
        groupChatSocketService.setCurrentUserId(currentUserId)

        // Test existing connection first
        if (groupChatSocketService.isConnected()) {
          console.log("✅ Using existing connection")
          setIsConnected(true)
          await groupChatSocketService.joinGroup(groupId)
          await loadGroupData()
          return
        }

        // Create new connection with timeout
        console.log("🔄 Creating new connection...")
        const connectPromise = groupChatSocketService.connect(currentUserId)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout after 15 seconds")), 15000)
        )

        await Promise.race([connectPromise, timeoutPromise])

        console.log("✅ Socket connected, joining group room...")
        setIsConnected(true)
        
        // Join the specific group room
        await groupChatSocketService.joinGroup(groupId)
        
        // Load group data
        await loadGroupData()
        
        // Setup all event listeners
        setupEventListeners()

      } catch (error: any) {
        console.error(`❌ Failed to initialize group chat (attempt ${connectionAttemptRef.current}):`, error)
        
        const errorMessage = error.message || "Failed to connect to group chat"
        setConnectionError(errorMessage)
        setIsConnected(false)

        // Retry logic
        if (connectionAttemptRef.current < maxConnectionAttempts) {
          console.log(`🔄 Retrying connection in 3 seconds... (${connectionAttemptRef.current}/${maxConnectionAttempts})`)
          setTimeout(() => {
            initializeGroupChat()
          }, 3000)
        } else {
          console.error("❌ Max connection attempts reached")
          setConnectionError("Failed to connect after multiple attempts. Please refresh the page.")
        }
      } finally {
        setIsLoading(false)
      }
    }

    const loadGroupData = async () => {
      try {
        // Load group info from API
        const token = Cookies.get("auth_token")
        if (token) {
          const cleanToken = token.replace(/^Bearer\s+/i, "").trim()
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${groupId}`, {
            headers: {
              Authorization: `Bearer ${cleanToken}`,
            }
          })

          if (response.ok) {
            const result = await response.json()
            setGroupInfo(result.data)
            console.log("✅ Group info loaded:", result.data)
          }
        }

        // Load recent messages
        await loadMessages()
      } catch (error) {
        console.error("❌ Failed to load group data:", error)
      }
    }

    const loadMessages = async () => {
      try {
        const token = Cookies.get("auth_token")
        if (token) {
          const cleanToken = token.replace(/^Bearer\s+/i, "").trim()
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${groupId}/messages?limit=50`, {
            headers: {
              Authorization: `Bearer ${cleanToken}`,
            }
          })

          if (response.ok) {
            const result = await response.json()
            setMessages(result.data || [])
            console.log(`✅ Loaded ${result.data?.length || 0} messages`)
          }
        }
      } catch (error) {
        console.error("❌ Failed to load messages:", error)
      }
    }

    const setupEventListeners = () => {
      // Message events
      const unsubscribeMessage = groupChatSocketService.onMessageReceived(handleMessageReceived)
      const unsubscribeMessageSent = groupChatSocketService.onMessageSentConfirmation(handleMessageSent)
      const unsubscribeMessageRead = groupChatSocketService.onMessagesRead(handleMessageRead)
      const unsubscribeMessageDeleted = groupChatSocketService.onGroupMessageDeleted(handleMessageDeleted)
      
      // Group management events
      const unsubscribeGroupCreated = groupChatSocketService.onGroupCreated(handleGroupCreated)
      const unsubscribeGroupUpdated = groupChatSocketService.onGroupUpdated(handleGroupUpdated)
      const unsubscribeGroupDeleted = groupChatSocketService.onGroupDeleted(handleGroupDeleted)
      
      // Participant events
      const unsubscribeParticipantsAdded = groupChatSocketService.onParticipantsAdded(handleParticipantsAdded)
      const unsubscribeParticipantRemoved = groupChatSocketService.onParticipantRemoved(handleParticipantRemoved)
      const unsubscribeRemovedFromGroup = groupChatSocketService.onRemovedFromGroup(handleRemovedFromGroup)
      const unsubscribeParticipantLeft = groupChatSocketService.onParticipantLeft(handleParticipantLeft)
      
      // Admin events
      const unsubscribeAdminStatusChanged = groupChatSocketService.onAdminStatusChanged(handleAdminStatusChanged)
      
      // Typing events
      const unsubscribeUserTyping = groupChatSocketService.onUserTyping(handleUserTyping)
      const unsubscribeUserStoppedTyping = groupChatSocketService.onUserStoppedTyping(handleUserStoppedTyping)
      
      // Online status events
      const unsubscribeOnlineUsers = groupChatSocketService.onGroupOnlineUsers(handleGroupOnlineUsers)
      
      // Search and stats events
      const unsubscribeSearchResults = groupChatSocketService.onGroupSearchResults(handleGroupSearchResults)
      const unsubscribeGroupStats = groupChatSocketService.onGroupStats(handleGroupStats)
      
      // Error events
      const unsubscribeGroupError = groupChatSocketService.onGroupError(handleGroupError)
      
      // Connection events
      const handleConnectionEvents = () => {
        const socket = groupChatSocketService.getSocket()
        if (socket) {
          socket.on("connect", () => {
            console.log("🔗 Group chat reconnected")
            setIsConnected(true)
            setConnectionError("")
            groupChatSocketService.joinGroup(groupId)
          })

          socket.on("disconnect", (reason) => {
            console.log("❌ Group chat disconnected:", reason)
            setIsConnected(false)
            if (reason !== 'io client disconnect') {
              setConnectionError("Connection lost. Attempting to reconnect...")
            }
          })
        }
      }
      
      handleConnectionEvents()

      // Return cleanup function
      return () => {
        console.log("🧹 Cleaning up all event listeners...")
        unsubscribeMessage()
        unsubscribeMessageSent()
        unsubscribeMessageRead()
        unsubscribeMessageDeleted()
        unsubscribeGroupCreated()
        unsubscribeGroupUpdated()
        unsubscribeGroupDeleted()
        unsubscribeParticipantsAdded()
        unsubscribeParticipantRemoved()
        unsubscribeRemovedFromGroup()
        unsubscribeParticipantLeft()
        unsubscribeAdminStatusChanged()
        unsubscribeUserTyping()
        unsubscribeUserStoppedTyping()
        unsubscribeOnlineUsers()
        unsubscribeSearchResults()
        unsubscribeGroupStats()
        unsubscribeGroupError()
        
        groupChatSocketService.leaveGroup(groupId)
      }
    }

    initializeGroupChat()

    // Cleanup when component unmounts or dependencies change
    return () => {
      console.log("🧹 Cleaning up group chat hook...")
      groupChatSocketService.leaveGroup(groupId)
      setIsConnected(false)
      setMessages([])
      setTypingUsers([])
      setOnlineUsers([])
    }
  }, [groupId, currentUserId])

  // === EVENT HANDLERS ===
  
  const handleMessageReceived = (msg: GroupMessage) => {
    console.log("📥 Received group message:", msg)
    setMessages((prev) => {
      const exists = prev.some(m => m._id === msg._id)
      if (exists) return prev
      return [...prev, msg]
    })
  }

  const handleMessageSent = (data: { messageId: string; groupId: string; success?: boolean }) => {
    console.log("✅ Message sent confirmation:", data)
    if (data.success && data.groupId === groupId) {
      setMessages((prev) => 
        prev.map((m) => 
          m._id === data.messageId 
            ? { ...m, isDelivered: true, isSent: true } 
            : m
        )
      )
    }
  }

  const handleMessageRead = (data: { messageIds: string[]; groupId: string; readBy: string }) => {
    if (data.groupId === groupId) {
      setMessages((prev) => 
        prev.map((m) => 
          data.messageIds.includes(m._id) 
            ? { ...m, isRead: true } 
            : m
        )
      )
    }
  }

  const handleMessageDeleted = (data: { groupId: string; messageId: string; deletedBy: string; timestamp: string }) => {
    if (data.groupId === groupId) {
      setMessages((prev) => prev.filter(m => m._id !== data.messageId))
    }
  }

  const handleGroupCreated = (group: GroupInfo) => {
    setGroups((prev) => [group, ...prev])
  }

  const handleGroupUpdated = (data: { groupId: string; updates: any; updatedBy: string; timestamp: string }) => {
    if (data.groupId === groupId) {
      setGroupInfo((prev) => prev ? { ...prev, ...data.updates } : null)
    }
    setGroups((prev) => 
      prev.map(g => g._id === data.groupId ? { ...g, ...data.updates } : g)
    )
  }

  const handleGroupDeleted = (data: { groupId: string; deletedBy: string; timestamp: string }) => {
    setGroups((prev) => prev.filter(g => g._id !== data.groupId))
    if (data.groupId === selectedGroupId) {
      setSelectedGroupId(null)
      setGroupInfo(null)
      setMessages([])
    }
  }

  const handleParticipantsAdded = (data: { groupId: string; newParticipants: string[]; addedBy: string; timestamp: string }) => {
    if (data.groupId === groupId) {
      // Reload group info to get updated participants
      loadGroupInfo()
    }
  }

  const handleParticipantRemoved = (data: { groupId: string; removedParticipant: string; removedBy: string; timestamp: string }) => {
    if (data.groupId === groupId) {
      loadGroupInfo()
    }
  }

  const handleRemovedFromGroup = (data: { groupId: string; removedBy: string; timestamp: string }) => {
    if (data.groupId === selectedGroupId) {
      setSelectedGroupId(null)
      setGroupInfo(null)
      setMessages([])
    }
    setGroups((prev) => prev.filter(g => g._id !== data.groupId))
  }

  const handleParticipantLeft = (data: { groupId: string; leftParticipant: string; timestamp: string }) => {
    if (data.groupId === groupId) {
      loadGroupInfo()
    }
  }

  const handleAdminStatusChanged = (data: { groupId: string; userId: string; isAdmin: boolean; changedBy: string; timestamp: string }) => {
    if (data.groupId === groupId) {
      loadGroupInfo()
    }
  }

  const handleUserTyping = (data: { groupId: string; userId: string; userName: string; timestamp: string }) => {
    if (data.groupId === groupId && data.userId !== currentUserId) {
      setTypingUsers((prev) => [...new Set([...prev, data.userId])])
      
      // Clear typing after 3 seconds
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        setTypingUsers((prev) => prev.filter(u => u !== data.userId))
      }, 3000)
    }
  }

  const handleUserStoppedTyping = (data: { groupId: string; userId: string; timestamp: string }) => {
    if (data.groupId === groupId) {
      setTypingUsers((prev) => prev.filter(u => u !== data.userId))
    }
  }

  const handleGroupOnlineUsers = (data: { groupId: string; onlineUsers: string[]; timestamp: string }) => {
    if (data.groupId === groupId) {
      setOnlineUsers(data.onlineUsers)
    }
  }

  const handleGroupSearchResults = (data: { success: boolean; data: GroupInfo[] }) => {
    if (data.success) {
      setSearchResults(data.data)
    }
  }

  const handleGroupStats = (data: { success: boolean; data: GroupStats }) => {
    if (data.success) {
      setGroupStats(data.data)
    }
  }

  const handleGroupError = (error: { error: string }) => {
    setConnectionError(error.error)
  }

  // === HELPER FUNCTIONS ===
  
  const loadGroupInfo = async () => {
    try {
      const token = Cookies.get("auth_token")
      if (token && groupId) {
        const cleanToken = token.replace(/^Bearer\s+/i, "").trim()
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${groupId}`, {
          headers: {
            Authorization: `Bearer ${cleanToken}`,
          }
        })

        if (response.ok) {
          const result = await response.json()
          setGroupInfo(result.data)
        }
      }
    } catch (error) {
      console.error("❌ Failed to load group info:", error)
    }
  }

  // === GROUP MANAGEMENT FUNCTIONS ===

  const createGroup = useCallback(async (data: CreateGroupData): Promise<boolean> => {
    if (!groupChatSocketService.isConnected()) {
      setConnectionError("Not connected to chat server")
      return false
    }

    setIsCreatingGroup(true)
    try {
      await groupChatSocketService.createGroup(data)
      return true
    } catch (error: any) {
      console.error("❌ Failed to create group:", error)
      setConnectionError(error.message || "Failed to create group")
      return false
    } finally {
      setIsCreatingGroup(false)
    }
  }, [])

  const updateGroup = useCallback(async (updates: UpdateGroupData): Promise<boolean> => {
    if (!groupChatSocketService.isConnected() || !groupId) {
      setConnectionError("Not connected to chat server")
      return false
    }

    setIsUpdatingGroup(true)
    try {
      groupChatSocketService.updateGroup(groupId, updates)
      return true
    } catch (error: any) {
      console.error("❌ Failed to update group:", error)
      setConnectionError(error.message || "Failed to update group")
      return false
    } finally {
      setIsUpdatingGroup(false)
    }
  }, [groupId])

  const deleteGroup = useCallback(async (): Promise<boolean> => {
    if (!groupChatSocketService.isConnected() || !groupId) {
      setConnectionError("Not connected to chat server")
      return false
    }

    try {
      groupChatSocketService.deleteGroup(groupId)
      return true
    } catch (error: any) {
      console.error("❌ Failed to delete group:", error)
      setConnectionError(error.message || "Failed to delete group")
      return false
    }
  }, [groupId])

  const leaveGroup = useCallback(async (): Promise<boolean> => {
    if (!groupChatSocketService.isConnected() || !groupId) {
      setConnectionError("Not connected to chat server")
      return false
    }

    try {
      groupChatSocketService.leaveGroupPermanently(groupId)
      return true
    } catch (error: any) {
      console.error("❌ Failed to leave group:", error)
      setConnectionError(error.message || "Failed to leave group")
      return false
    }
  }, [groupId])

  // === PARTICIPANT MANAGEMENT ===

  const addParticipants = useCallback(async (participantIds: string[]): Promise<boolean> => {
    if (!groupChatSocketService.isConnected() || !groupId) {
      setConnectionError("Not connected to chat server")
      return false
    }

    try {
      groupChatSocketService.addParticipants(groupId, participantIds)
      return true
    } catch (error: any) {
      console.error("❌ Failed to add participants:", error)
      setConnectionError(error.message || "Failed to add participants")
      return false
    }
  }, [groupId])

  const removeParticipant = useCallback(async (participantId: string): Promise<boolean> => {
    if (!groupChatSocketService.isConnected() || !groupId) {
      setConnectionError("Not connected to chat server")
      return false
    }

    try {
      groupChatSocketService.removeParticipant(groupId, participantId)
      return true
    } catch (error: any) {
      console.error("❌ Failed to remove participant:", error)
      setConnectionError(error.message || "Failed to remove participant")
      return false
    }
  }, [groupId])

  const changeAdminStatus = useCallback(async (userId: string, makeAdmin: boolean): Promise<boolean> => {
    if (!groupChatSocketService.isConnected() || !groupId) {
      setConnectionError("Not connected to chat server")
      return false
    }

    try {
      groupChatSocketService.changeAdminStatus(groupId, userId, makeAdmin)
      return true
    } catch (error: any) {
      console.error("❌ Failed to change admin status:", error)
      setConnectionError(error.message || "Failed to change admin status")
      return false
    }
  }, [groupId])

  // === MESSAGE FUNCTIONS ===

  const sendGroupMessage = useCallback(
    async (data: {
      content?: string
      type: "text" | "image" | "video" | "file"
      fileUrl?: string
      fileName?: string
      fileSize?: string
      replyTo?: string
    }) => {
      if (!groupId || !currentUserId) {
        console.error("❌ Cannot send message: missing groupId or currentUserId")
        return
      }

      if (!groupChatSocketService.isConnected()) {
        console.error("❌ Cannot send message: socket not connected")
        setConnectionError("Not connected to chat server")
        return
      }

      if (!data.content && !data.fileUrl) {
        console.error("❌ Cannot send message: either content or fileUrl must be provided")
        setConnectionError("Either content or fileUrl must be provided")
        return
      }

      // Create optimistic message
      const tempMessage: GroupMessage = {
        _id: `temp-${Date.now()}-${Math.random()}`,
        senderId: currentUserId,
        groupId,
        content: data.content || data.fileName || "File shared",
        type: data.type,
        createdAt: new Date().toISOString(),
        isSent: false,
        isDelivered: false,
        isRead: false,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        replyTo: data.replyTo,
      }

      setMessages((prev) => [...prev, tempMessage])

      try {
        await groupChatSocketService.sendGroupMessage({
          groupId,
          content: data.content ?? "",
          type: data.type,
          replyTo: data.replyTo,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
        })

        setMessages((prev) => 
          prev.map((m) => 
            m._id === tempMessage._id 
              ? { ...m, isSent: true } 
              : m
          )
        )

        console.log("✅ Group message sent successfully")
      } catch (error: any) {
        console.error("❌ Failed to send group message:", error)
        
        setMessages((prev) => 
          prev.map((m) => 
            m._id === tempMessage._id 
              ? { ...m, content: `❌ Failed to send: ${m.content}` } 
              : m
          )
        )
        
        setConnectionError(error.message || "Failed to send message")
      }
    },
    [groupId, currentUserId]
  )

  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (!groupId || isLoadingMessages || !hasMoreMessages) return

    setIsLoadingMessages(true)
    try {
      groupChatSocketService.getGroupMessages(groupId, messagesPage + 1, 50)
      setMessagesPage(prev => prev + 1)
    } catch (error) {
      console.error("❌ Failed to load more messages:", error)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [groupId, messagesPage, isLoadingMessages, hasMoreMessages])

  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    if (!groupChatSocketService.isConnected() || !groupId) {
      setConnectionError("Not connected to chat server")
      return false
    }

    try {
      groupChatSocketService.deleteGroupMessage(groupId, messageId)
      return true
    } catch (error: any) {
      console.error("❌ Failed to delete message:", error)
      setConnectionError(error.message || "Failed to delete message")
      return false
    }
  }, [groupId])

  // === UTILITY FUNCTIONS ===

  const startTyping = useCallback(() => {
    if (groupChatSocketService.isConnected() && groupId) {
      groupChatSocketService.startGroupTyping(groupId)
    }
  }, [groupId])

  const stopTyping = useCallback(() => {
    if (groupChatSocketService.isConnected() && groupId) {
      groupChatSocketService.stopGroupTyping(groupId)
    }
  }, [groupId])

  const markMessagesAsRead = useCallback((messageIds?: string[]) => {
    if (groupChatSocketService.isConnected() && groupId) {
      groupChatSocketService.markGroupMessagesAsRead(groupId, messageIds)
    }
  }, [groupId])

  const searchGroups = useCallback((query: string) => {
    if (groupChatSocketService.isConnected()) {
      groupChatSocketService.searchGroups(query)
    }
  }, [])

  const getGroupStats = useCallback(() => {
    if (groupChatSocketService.isConnected() && groupId) {
      groupChatSocketService.getGroupStats(groupId)
    }
  }, [groupId])

  const getOnlineUsers = useCallback(() => {
    if (groupChatSocketService.isConnected() && groupId) {
      groupChatSocketService.getGroupOnlineUsers(groupId)
    }
  }, [groupId])

  const refreshGroups = useCallback(() => {
    if (groupChatSocketService.isConnected()) {
      groupChatSocketService.getUserGroups()
    }
  }, [])

  // === COMPUTED VALUES ===
  
  const isCurrentUserAdmin = groupInfo?.admins.includes(currentUserId) || false
  const isCurrentUserCreator = groupInfo?.createdBy === currentUserId
  const canManageGroup = isCurrentUserAdmin || isCurrentUserCreator
  
  const participantCount = groupInfo?.participants.length || 0
  const onlineParticipantCount = onlineUsers.length
  
  const unreadCount = groupInfo?.unreadCount || 0
  const hasUnreadMessages = unreadCount > 0

 
return {
    // === STATE ===
    messages,
    
    groupInfo,
    groups,
    selectedGroupId,
    typingUsers,
    onlineUsers,
    groupStats,
    searchResults,
    
    // Connection state
    isLoading,
    isConnected,
    connectionError,
    
    // UI state
    showGroupInfo,
    showParticipants,
    isCreatingGroup,
    isUpdatingGroup,
    isLoadingMessages,
    hasMoreMessages,
    
    // === ACTIONS ===
    
    // Group management
    createGroup,
    updateGroup,
    deleteGroup,
    leaveGroup,
    
    // Participant management
    addParticipants,
    removeParticipant,
    changeAdminStatus,
    
    // Message functions
    sendGroupMessage,
    loadMoreMessages,
    deleteMessage,
    markMessagesAsRead,
    
    // Utility functions
    startTyping,
    stopTyping,
    searchGroups,
    getGroupStats,
    getOnlineUsers,
    refreshGroups,
    
    // UI functions
    setSelectedGroupId,
    setShowGroupInfo,
    setShowParticipants,
    
    // === COMPUTED VALUES ===
    isCurrentUserAdmin,
    isCurrentUserCreator,
    canManageGroup,
    participantCount,
    onlineParticipantCount,
    unreadCount,
    hasUnreadMessages,
    hasGroups: groups.length > 0, 
  }
}