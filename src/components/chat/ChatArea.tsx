// components/ChatArea.tsx
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
import { ApiMessage, ChatAreaProps, Message } from "@/types/chatTypes";
import { addMessage, setCurrentChat, setLoading, setMessages } from "@/lib/store/chatSlice";
import { socketService } from "@/lib/socket";
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText } from "@mui/material";

export default function ChatArea({
  contact,
  channelId,
  receiverId,
  currentUserId,
  senderId,
  currentUserName,
  onVideoCall,
  onVoiceCall,
}: ChatAreaProps) {
  const dispatch = useAppDispatch();
  const {
    messages,
    onlineUsers,
    typingStatus,
    isLoading,
    isConnected,
    currentChat,
  } = useAppSelector((state) => state.chat);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showStatusView, setShowStatusView] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [statusUserId, setStatusUserId] = useState<string | null>(null);
 const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null)
  const [forwardingMessageId, setForwardingMessageId] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<ApiMessage | null>(null);
const [forwarding, setForwarding] = useState<ApiMessage | null>(null);
const [forwardRecipients, setForwardRecipients] = useState<string[]>([]);
  const { handleTyping } = useChatSocket(channelId, currentUserId, receiverId);

  // Set current chat when props change
  useEffect(() => {
    dispatch(setCurrentChat({ channelId, receiverId, contact }));
  }, [channelId, receiverId, contact, dispatch]);

  // Fetch initial messages
  useEffect(() => {
   const fetchMessages = async () => {
  dispatch(setLoading(true));
  try {
    // Add proper typing to the API response
    const data = await getApi<ApiMessage[]>(API_ENDPOINTS.MESSAGES_CHANNELID(channelId));
    
    const formattedMessages = data.map((msg) => ({
      _id: msg._id,
      senderId: msg.senderId || (msg.receiverId === currentUserId ? receiverId : currentUserId),
      receiverId: msg.receiverId,
      content: msg.content,
      type: msg.type,
      createdAt: msg.createdAt,
      isSent: msg.senderId === currentUserId,
      isDelivered: msg.isDelivered || msg.receiverId === currentUserId,
      isRead: msg.isRead || false,
      fileUrl: msg.fileUrl || "",
      fileName: msg.fileName || "",
      fileSize: msg.fileSize || "",
      channelId: msg.channelId || channelId
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
  }, [channelId, currentUserId, receiverId, dispatch]);

  

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleMessageSend = async (msg: any) => {
    if (!msg?.content) return;

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
        ...(replyingTo && { replyTo: replyingTo._id }),
    ...(forwarding && { 
      isForwarded: true,
      forwardedFrom: forwarding._id,
    })
    };

    dispatch(addMessage(newMessage));

       try {
    if (isConnected) {
      if (replyingTo) {
        await socketService.replyToMessage({
          originalMessageId: replyingTo._id,
          receiverId,
          content: msg.content,
          type: msg.type || 'text'
        });
      } else if (forwarding) {
        await socketService.forwardMessage({
          messageId: forwarding._id,
          receiverIds: [receiverId]
        });
      } else {
        await socketService.sendMessage(newMessage);
      }
      
      setReplyingTo(null);
      setForwarding(null);
    }
  } catch (error) {
    console.error("Send failed:", error);
    // Mark message as failed in your state
    dispatch(updateMessageStatus({ 
      id: newMessage._id, 
      status: 'error' 
    }));
  }
};

  const isReceiverOnline = onlineUsers.includes(receiverId);

  const chatHeaderContact = {
    ...contact,
    isOnline: isReceiverOnline,
    userId: receiverId,
    status: typingStatus[receiverId] 
      ? "typing..." 
      : isReceiverOnline
      ? "Online"
      : "Offline",
    isTyping: typingStatus[receiverId],
  };

   const clearReply = useCallback(() => {
    setReplyingToMessageId(null)
  }, [])

    const clearForward = useCallback(() => {
    setForwardingMessageId(null)
  }, [])


const handleReplyMessage = useCallback((messageId: string) => {
  const originalMessage = messages.find(msg => msg._id === messageId);
  if (!originalMessage) return;
  
  setReplyingTo(originalMessage);
  setForwarding(null);
}, [messages]);

const handleForwardMessage = useCallback((messageId: string) => {
  const message = messages.find(msg => msg._id === messageId);
  if (!message) return;
  
  setForwarding(message);
  setReplyingTo(null);
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

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Forward Message</DialogTitle>
      <DialogContent>
        {message && (
          <div style={{ padding: '10px', marginBottom: '15px', background: '#f5f5f5' }}>
            {message.content}
          </div>
        )}
        <List>
          {contacts.map(contact => (
            <ListItem key={contact.id}>
              <Checkbox
                checked={selectedRecipients.includes(contact.id)}
                onChange={() => setSelectedRecipients(prev => 
                  prev.includes(contact.id) 
                    ? prev.filter(id => id !== contact.id) 
                    : [...prev, contact.id]
                )}
              />
              <ListItemText primary={contact.name} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={() => {
            onForward(selectedRecipients);
            onClose();
          }}
          disabled={!selectedRecipients.length}
        >
          Forward
        </Button>
      </DialogActions>
    </Dialog>
  );
};


  if (!currentUserId || !receiverId || !contact) {
    return <div>Loading chat data...</div>;
  }

  return (
    <div className="h-full flex flex-col bg-[#01aa851c]">
      <ChatHeader
        contact={chatHeaderContact}
        onVideoCall={onVideoCall}
        onVoiceCall={onVoiceCall}
        isTyping={typingStatus[receiverId]}
      />

      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        formatTime={(timestamp: string) =>
          new Date(timestamp).toLocaleTimeString()
        }
        onReplyMessage={handleReplyMessage}
        onForwardMessage={handleForwardMessage}
      />

      <div ref={messagesEndRef} />

      <ChatInput
        currentUserId={currentUserId}
        senderId={senderId}
        receiverId={receiverId}
        channelId={channelId}
        onMessageSent={handleMessageSend}
        onTyping={handleTyping}
      />

       {replyingToMessageId && (
          <div style={{ 
            padding: '0.5rem', 
            backgroundColor: '#f5f5f5', 
            borderRadius: '4px',
            marginBottom: '0.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Replying to message...</span>
            <button onClick={clearReply}>×</button>
          </div>
        )}

        {/* Forward Context */}
        {forwardingMessageId && (
          <div style={{ 
            padding: '0.5rem', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '4px',
            marginBottom: '0.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Select users to forward to...</span>
            <button onClick={clearForward}>×</button>
          </div>
        )}

      {showStatusView && (
        <StatusView
          isDark={false}
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