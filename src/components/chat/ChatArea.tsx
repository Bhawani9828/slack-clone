// components/ChatArea.tsx - Updated with Group Chat Support
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getApi } from "@/axios/apiService";
import API_ENDPOINTS from "@/axios/apiEndpoints";
import { useChatSocket } from "@/hooks/useChatSocket";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import StatusView from "../sidebarComponets/StatusView";
import { 
  ApiMessage, 
  ChatAreaProps, 
  Message, 
  GroupMessage 
} from "@/types/chatTypes";
import { 
  addMessage, 
  setCurrentChat, 
  setLoading, 
  setMessages,
  updateMessageStatus
} from "@/lib/store/chatSlice";
import { socketService } from "@/lib/socket";
import { 
  Button, 
  Checkbox, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  TextField
} from "@mui/material";
import { Send } from "@mui/icons-material";

export default function ChatArea({
  contact,
  channelId,
  receiverId,
  currentUserId,
  senderId,
  currentUserName,
  onVideoCall,
  onVoiceCall,
   isDark = false,
  // ✅ Group chat props
  isGroupChat = false,
  groupMessages = [],
  typingUsers = [],
  onlineUsers = [],
  onSendGroupMessage,
  onGroupTyping,
  onGroupStopTyping,
  onDeleteGroupMessage,
  onLoadMoreMessages,
  isLoadingMessages = false,
  hasMoreMessages = false,
  isCurrentUserAdmin = false,
  canManageGroup = false,
  participantCount = 0,
  groupInfo,
  onLeaveGroup,
  onAddParticipants,
  onRemoveParticipant,
  onChangeAdminStatus,
}: ChatAreaProps) {
  const dispatch = useAppDispatch();
  const {
    messages: directMessages,
    onlineUsers: directOnlineUsers,
    typingStatus,
    isLoading,
    isConnected,
    currentChat,
  } = useAppSelector((state) => state.chat);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showStatusView, setShowStatusView] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [statusUserId, setStatusUserId] = useState<string | null>(null);
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null);
  const [forwardingMessageId, setForwardingMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ApiMessage | null>(null);
  const [forwarding, setForwarding] = useState<ApiMessage | null>(null);
  const [forwardRecipients, setForwardRecipients] = useState<string[]>([]);
  const [quickReplyMessage, setQuickReplyMessage] = useState("");
  
  // ✅ Determine which hook to use based on chat type
  const { handleTyping } = useChatSocket(
    isGroupChat ? "" : channelId, 
    currentUserId, 
    isGroupChat ? "" : receiverId
  );

  const getSenderId = (senderId: string | { _id: string; name?: string; username?: string }): string => {
  if (typeof senderId === 'string') {
    return senderId;
  }
  return senderId._id;
};

  // ✅ Get appropriate messages based on chat type
  const messages = isGroupChat ? 
    groupMessages.map(msg => ({
      _id: msg._id,
      senderId: msg.senderId,
      receiverId: msg.groupId, // Use groupId as receiverId for groups
      content: msg.content,
      type: msg.type,
      createdAt: msg.createdAt,
      isSent: msg.isSent,
      isDelivered: msg.isDelivered,
      isRead: msg.isRead,
      isError: false,
      fileUrl: msg.fileUrl || "",
      fileName: msg.fileName || "",
      fileSize: msg.fileSize || "",
      channelId: msg.groupId,
      replyTo: msg.replyTo,
      isForwarded: msg.isForwarded,
      forwardedFrom: msg.forwardedFrom,
    })) : directMessages;

  // ✅ Get appropriate online users and typing status
  const currentOnlineUsers = isGroupChat ? onlineUsers : directOnlineUsers;
  const currentTypingUsers = isGroupChat ? typingUsers : [];

  // Set current chat when props change (only for direct chats)
  useEffect(() => {
    if (!isGroupChat) {
      dispatch(setCurrentChat({ channelId, receiverId, contact }));
    }
  }, [channelId, receiverId, contact, dispatch, isGroupChat]);

  // Fetch initial messages (only for direct chats)




  useEffect(() => {
    if (isGroupChat) return; // Skip for group chats, handled by useGroupChat

    const fetchMessages = async () => {
      dispatch(setLoading(true));
      try {
        const data = await getApi<ApiMessage[]>(API_ENDPOINTS.MESSAGES_CHANNELID(channelId));
        
        const formattedMessages: Message[] = data.map((msg) => ({
          _id: msg._id,
          senderId: typeof msg.senderId === 'string' 
            ? msg.senderId 
            : msg.senderId?._id || (msg.receiverId === currentUserId ? receiverId : currentUserId),
          receiverId: msg.receiverId,
          content: msg.content,
          type: msg.type,
          createdAt: msg.createdAt,
          isSent: (typeof msg.senderId === 'string' ? msg.senderId : msg.senderId?._id) === currentUserId,
          isDelivered: msg.isDelivered || msg.receiverId === currentUserId,
          isRead: msg.isRead || false,
          fileUrl: msg.fileUrl || "",
          fileName: msg.fileName || "",
          fileSize: msg.fileSize || "",
          channelId: msg.channelId || channelId,
          isError: false,
          replyTo: msg.replyTo,
          isForwarded: msg.isForwarded,
          forwardedFrom: msg.forwardedFrom
        }));

        dispatch(setMessages(formattedMessages));
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        dispatch(setLoading(false));
      }
    };

    if (channelId && currentUserId && receiverId) {
      fetchMessages();
    }
  }, [channelId, currentUserId, receiverId, dispatch, isGroupChat]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Enhanced message send handler for both direct and group chats
 const handleMessageSend = async (msg: any) => {
  if (!msg?.content) return;

  if (isGroupChat && onSendGroupMessage) {
    // Handle group message
    try {
       await onSendGroupMessage({
        content: msg.content,
        type: msg.type || "text",
        fileUrl: msg.fileUrl,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
       });
      
      // Clear reply/forward state after successful send
      if (replyingTo) {
        setReplyingTo(null);
        setReplyingToMessageId(null);
      }
      if (forwarding) {
        setForwarding(null);
        setForwardingMessageId(null);
      }
    } catch (error) {
      console.error("Failed to send group message:", error);
    }
    return;
  }

  // Handle direct message (existing logic with fix)
  const newMessage: Message = {
    _id: `temp-${Date.now()}`,
    senderId: currentUserId,
    receiverId,
    content: msg.content,
    type: msg.type || "text",
    createdAt: new Date().toISOString(),
    isSent: true,
    isDelivered: false,
    isRead: false,
    isError: false,
    fileUrl: msg.fileUrl || "",
    fileName: msg.fileName || "",
    fileSize: msg.fileSize || "",
    channelId: msg.channelId || channelId,
    ...(replyingTo && { 
      replyTo: replyingTo._id,
      replyToContent: replyingTo.content,
      // ✅ Fixed: Use helper function to get sender ID as string
      replyToSender: getSenderId(replyingTo.senderId)
    }),
    ...(forwarding && { 
      isForwarded: true,
      forwardedFrom: forwarding._id,
    })
  };

  dispatch(addMessage(newMessage));

  try {
    if (isConnected) {
      if (replyingTo) {
        const replyData = {
          originalMessageId: replyingTo._id,
          receiverId,
          content: msg.content,
          type: msg.type || 'text',
          channelId,
          replyToContent: replyingTo.content,
          // ✅ Fixed: Use helper function to get sender ID as string
          replyToSender: getSenderId(replyingTo.senderId)
        };
        
        await socketService.replyToMessage(replyData);
      } else if (forwarding) {
        await socketService.forwardMessage({
          messageId: forwarding._id,
          receiverIds: [receiverId]
        });
      } else {
        await socketService.sendMessage(newMessage);
      }
      
      if (replyingTo) {
        setReplyingTo(null);
        setReplyingToMessageId(null);
      }
      if (forwarding) {
        setForwarding(null);
        setForwardingMessageId(null);
      }
    }
  } catch (error) {
    console.error("Send failed:", error);
    dispatch(updateMessageStatus({ 
      messageId: newMessage._id,
      status: 'error' 
    }));
  }
};

  // ✅ Enhanced typing handlers for both chat types
  const handleTypingStart = () => {
  if (isGroupChat && onGroupTyping) {
    onGroupTyping();
  } else {
    handleTyping(true); // ✅ Pass boolean parameter
  }
};

const handleTypingStop = () => {
  if (isGroupChat && onGroupStopTyping) {
    onGroupStopTyping();
  } else {
    handleTyping(false); // ✅ Pass boolean parameter for stop typing
  }
  // Direct chat typing stop is handled automatically
};

// Fix 2: Helper function to safely get sender display name
const getSenderDisplayName = (senderId: string | { _id: string; name?: string; username?: string }): string => {
  if (typeof senderId === 'string') {
    return senderId;
  }
  return senderId.name || senderId.username || senderId._id || 'Unknown';
};

  // ✅ Enhanced delete message handler
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (isGroupChat && onDeleteGroupMessage) {
      try {
        await onDeleteGroupMessage(messageId);
        console.log("Group message deleted successfully");
      } catch (error) {
        console.error("Failed to delete group message:", error);
      }
    } else {
      // Implement direct message delete logic
      console.log("Deleting direct message:", messageId);
    }
  }, [isGroupChat, onDeleteGroupMessage]);

  // Determine if receiver is online
  const isReceiverOnline = isGroupChat ? 
    false : // For groups, we don't track single user online status
    directOnlineUsers.includes(receiverId);

  // ✅ Enhanced chat header contact info
  const chatHeaderContact = {
    ...contact,
    isOnline: isGroupChat ? true : isReceiverOnline, // Groups are always "online"
    userId: isGroupChat ? contact.id || contact._id : receiverId,
    status: isGroupChat ? 
      (currentTypingUsers.length > 0 ? 
        `${currentTypingUsers.length} typing...` : 
        `${participantCount} participants`) :
      (typingStatus[receiverId] ? 
        "typing..." : 
        isReceiverOnline ? "Online" : "Offline"),
    isTyping: isGroupChat ? currentTypingUsers.length > 0 : typingStatus[receiverId],
  };

  const clearReply = useCallback(() => {
    setReplyingToMessageId(null);
    setReplyingTo(null);
  }, []);

  const clearForward = useCallback(() => {
    setForwardingMessageId(null);
    setForwarding(null);
  }, []);

  const handleReplyMessage = useCallback((messageId: string) => {
    const originalMessage = messages.find(msg => msg._id === messageId);
    if (!originalMessage) return;
    
    const apiMessage: ApiMessage = {
      ...originalMessage,
      senderId: originalMessage.senderId
    };
    
    setReplyingTo(apiMessage);
    setReplyingToMessageId(messageId);
    setForwarding(null);
    setForwardingMessageId(null);
  }, [messages]);

  const handleForwardMessage = useCallback((messageId: string) => {
    const message = messages.find(msg => msg._id === messageId);
    if (!message) return;
    
    const apiMessage: ApiMessage = {
      ...message,
      senderId: message.senderId
    };
    
    setForwarding(apiMessage);
    setForwardingMessageId(messageId);
    setReplyingTo(null);
    setReplyingToMessageId(null);
    setShowForwardDialog(true);
  }, [messages]);

  const ForwardDialog = ({ 
    open, 
    onClose, 
    onForward,
    message
  }: {
    open: boolean;
    onClose: () => void;
    onForward: (recipients: string[]) => void;
    message: ApiMessage | null;
  }) => {
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
    const contacts = useAppSelector(state => state.user.chatusers);

    const handleForwardClick = () => {
      onForward(selectedRecipients);
      setSelectedRecipients([]);
      onClose();
    };

    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Forward Message</DialogTitle>
        <DialogContent>
          {message && (
            <div style={{ 
              padding: '10px', 
              marginBottom: '15px', 
              background: '#f5f5f5',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <strong>Message:</strong> {message.content}
            </div>
          )}
          <List>
            {contacts?.map(contact => (
              <ListItem key={contact.id}>
                <Checkbox
                  checked={selectedRecipients.includes(contact.id)}
                  onChange={() => setSelectedRecipients(prev => 
                    prev.includes(contact.id) 
                      ? prev.filter(id => id !== contact.id) 
                      : [...prev, contact.id]
                  )}
                />
                <ListItemText 
                  primary={contact.name} 
                  secondary={contact.name || contact.id}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleForwardClick}
            disabled={!selectedRecipients.length}
            variant="contained"
            color="primary"
          >
            Forward to {selectedRecipients.length} contact{selectedRecipients.length !== 1 ? 's' : ''}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const handleQuickReply = async () => {
    if (!quickReplyMessage.trim() || !replyingTo) return;
    
    await handleMessageSend({
      content: quickReplyMessage.trim(),
      type: 'text',
      channelId: channelId
    });
    
    setQuickReplyMessage(""); 
  };

  // ✅ Group-specific handlers
  const handleLoadMoreGroupMessages = async () => {
    if (onLoadMoreMessages && hasMoreMessages && !isLoadingMessages) {
      await onLoadMoreMessages();
    }
  };

  if (!currentUserId || (!receiverId && !isGroupChat) || !contact) {
    return <div>Loading chat data...</div>;
  }

  return (
    <div className="h-full flex flex-col bg-[#01aa851c]">
      {/* ✅ Enhanced ChatHeader for groups */}
      <ChatHeader
        contact={chatHeaderContact}
        onVideoCall={onVideoCall}
        onVoiceCall={onVoiceCall}
         currentUserId={currentUserId}
        isTyping={isGroupChat ? currentTypingUsers.length > 0 : typingStatus[receiverId]}
        isGroupChat={isGroupChat}
        participantCount={participantCount}
        onlineCount={currentOnlineUsers.length}
        canManageGroup={canManageGroup}
        onLeaveGroup={onLeaveGroup}
      />

      {/* ✅ Load more messages button for groups */}
      {/* {isGroupChat && hasMoreMessages && (
        <div className="px-4 py-2 bg-white border-b">
          <button 
            onClick={handleLoadMoreGroupMessages}
            disabled={isLoadingMessages}
            className="w-full p-2 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
          >
            {isLoadingMessages ? "Loading..." : "Load More Messages"}
          </button>
        </div>
      )} */}

      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        formatTime={(timestamp: string) =>
          new Date(timestamp).toLocaleTimeString()
        }
        onReplyMessage={handleReplyMessage}
        onForwardMessage={handleForwardMessage}
        onDeleteMessage={handleDeleteMessage}
        onReply={(msg) => setReplyingTo(msg)} 
        isGroupChat={isGroupChat}
        groupInfo={groupInfo}
        isCurrentUserAdmin={isCurrentUserAdmin}
      />

      <div ref={messagesEndRef} />

      {/* ✅ Enhanced typing indicator for groups */}
      {isGroupChat && currentTypingUsers.length > 0 && (
        <div className="px-4 py-2 bg-white border-t">
          <p className="text-sm text-gray-500">
            {currentTypingUsers.length === 1 
              ? `${currentTypingUsers[0]} is typing...`
              : `${currentTypingUsers.length} people are typing...`
            }
          </p>
        </div>
      )}

      {/* Reply Context - Enhanced for groups */}
 {replyingTo && (
  <div style={{ 
    padding: '0.75rem', 
    backgroundColor: '#e8f5e8', 
    borderRadius: '8px',
    margin: '0.5rem',
    border: '1px solid #4caf50'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#666', 
          marginBottom: '2px',
          fontWeight: 'bold'
        }}>
          {/* ✅ Fixed sender display - compare IDs properly */}
          Replying to {getSenderId(replyingTo.senderId) === currentUserId ? 'yourself' : 
            isGroupChat ? getSenderDisplayName(replyingTo.senderId) : 'contact'}
        </div>
        <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: '1.3' }}>
          {replyingTo.content.length > 80 
            ? `${replyingTo.content.substring(0, 80)}...` 
            : replyingTo.content
          }
        </div>
      </div>
      
      <IconButton 
        onClick={clearReply}
        size="small"
        sx={{ 
          color: '#666',
          '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.1)'
          }
        }}
        title="Cancel Reply"
      >
        ×
      </IconButton>
    </div>
    
    <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'flex-end'
    }}>
      <TextField
        fullWidth
        size="small"
        value={quickReplyMessage}
        onChange={(e) => setQuickReplyMessage(e.target.value)}
        placeholder="Type your reply..."
        variant="outlined"
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: '20px',
            backgroundColor: 'white',
            fontSize: '14px',
            '& fieldset': {
              borderColor: '#ddd',
            },
            '&:hover fieldset': {
              borderColor: '#4caf50',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#4caf50',
            },
          },
          '& .MuiInputBase-input': {
            padding: '8px 14px',
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleQuickReply();
          }
        }}
        // ✅ Add typing handlers to the quick reply input
        onFocus={handleTypingStart}
        onBlur={handleTypingStop}
      />
      
      <IconButton 
        onClick={handleQuickReply}
        disabled={!quickReplyMessage.trim()}
        sx={{ 
          backgroundColor: quickReplyMessage.trim() ? '#4caf50' : '#ccc',
          color: 'white',
          width: '36px',
          height: '36px',
          '&:hover': {
            backgroundColor: quickReplyMessage.trim() ? '#45a049' : '#ccc',
          },
          '&:disabled': {
            backgroundColor: '#ccc',
            color: 'white',
          },
          transition: 'background-color 0.2s'
        }}
        title="Send Reply"
      >
        <Send fontSize="small" />
      </IconButton>
    </div>
  </div>
)}

      {/* Forward Context */}
      {forwarding && (
        <div style={{ 
          padding: '0.75rem', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '8px',
          margin: '0.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid #2196f3'
        }}>
          <div>
            <strong>Forwarding:</strong>
            <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '2px' }}>
              {forwarding.content.substring(0, 50)}
              {forwarding.content.length > 50 ? '...' : ''}
            </div>
          </div>
          <button 
            onClick={clearForward}
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.2rem', 
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ✅ Enhanced ChatInput with group support */}
      <ChatInput
        currentUserId={currentUserId}
        senderId={senderId}
        receiverId={receiverId}
        groupId={isGroupChat ? (contact.id || contact._id) : undefined}
        channelId={channelId}
        onMessageSent={handleMessageSend}
        onTyping={handleTypingStart}
        replyingTo={replyingTo}
        forwarding={forwarding}
      />

      {/* Forward Dialog */}
      <ForwardDialog
        open={showForwardDialog}
        onClose={() => {
          setShowForwardDialog(false);
          clearForward();
        }}
        onForward={(recipients) => {
          console.log("Forwarding to:", recipients);
          // Implement actual forward logic here
          setShowForwardDialog(false);
          clearForward();
        }}
        message={forwarding}
      />

      {/* Status View */}
      {showStatusView && (
        <StatusView
          isDark={isDark}
          onBackToChat={() => {
            setShowStatusView(false);
            setStatusUserId(null);
          }}
          currentUserId={currentUserId}
          statusUserId={statusUserId}
        />
      )}
    </div>
  );
}