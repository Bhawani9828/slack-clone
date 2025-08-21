// hooks/useMessageActions.ts - Complete React hook for message actions
import { useState, useCallback, useEffect } from 'react';
import { socketService } from '@/lib/socket';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { removeMessage } from '@/lib/store/chatSlice';
import { groupChatSocketService } from '@/lib/group-chat-socket.service';

interface UseMessageActionsReturn {
  loading: boolean;
  error: string | null;
  deleteMessage: (messageId: string, options?: DeleteOptions) => Promise<void>;
  hardDeleteMessage: (messageId: string, options?: DeleteOptions) => Promise<void>;
  replyToMessage: (data: ReplyData) => Promise<any>;
  forwardMessage: (data: ForwardData) => Promise<void>;
  toggleFavorite: (messageId: string, isFavorite: boolean) => Promise<void>;
  copyMessage: (messageId: string, content: string) => Promise<void>;
  getFavorites: () => Promise<any[]>;
  clearError: () => void;
}

type DeleteOptions = {
  isGroupChat: boolean;
  groupId?: string;
};
interface ReplyData {
  originalMessageId: string;
  receiverId: string;
  content: string;
  type?: 'text' | 'image' | 'video' | 'file';
}

interface ForwardData {
  messageId: string;
  receiverIds: string[];
}

export const useMessageActions = (): UseMessageActionsReturn => {
   const dispatch = useDispatch();
   const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  
  const handleError = useCallback((err: any, fallbackMessage: string) => {
    const errorMessage = err?.message || err || fallbackMessage;
    setError(errorMessage);
    console.error(fallbackMessage, err);
    throw new Error(errorMessage);
  }, []);

  const executeWithLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      return result;
    } catch (err: any) {
      handleError(err, errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleError]);


const deleteMessage = useCallback(
  async (messageId: string, options?: DeleteOptions) => {
    setLoading(true);
    setError(null);
    try {
      if (options?.isGroupChat && options.groupId) {
        await groupChatSocketService.deleteGroupMessage(options.groupId, messageId);
      } else {
        await socketService.deleteMessage(messageId);
      }

      dispatch(removeMessage({ messageId }));
    } catch (err: any) {
      setError(err?.message || "Failed to delete message");
    } finally {
      setLoading(false);
    }
  },
  [dispatch]
);

const hardDeleteMessage = useCallback(
  async (messageId: string, options?: DeleteOptions) => {
    setLoading(true);
    setError(null);
    try {
      if (options?.isGroupChat && options.groupId) {
        await groupChatSocketService.deleteGroupMessage(options.groupId, messageId);
      } else {
        await socketService.hardDeleteMessage(messageId);
      }

      dispatch(removeMessage({ messageId }));
    } catch (err: any) {
      setError(err?.message || "Failed to hard delete message");
    } finally {
      setLoading(false);
    }
  },
  [dispatch]
);

const replyToMessage = useCallback(async (data: ReplyData): Promise<any> => {
  if (!data.originalMessageId || !data.receiverId || !data.content?.trim()) {
    throw new Error("Reply data is incomplete");
  }

  return executeWithLoading(async () => {
    // API call -> save in DB
    const savedReply = await socketService.replyToMessage(data);

    // ✅ Send via socket so that receiver gets it instantly
    socketService.getSocket()?.emit("sendMessage", {
      ...savedReply,
      type: "reply",
    });

    return savedReply;
  }, "Failed to send reply");
}, [executeWithLoading]);


  const forwardMessage = useCallback(async (data: ForwardData): Promise<void> => {
    if (!data.messageId || !data.receiverIds?.length) {
      throw new Error('Forward data is incomplete');
    }

    return executeWithLoading(
      () => socketService.forwardMessage(data),
      'Failed to forward message'
    );
  }, [executeWithLoading]);

  const toggleFavorite = useCallback(async (messageId: string, isFavorite: boolean): Promise<void> => {
    if (!messageId) {
      throw new Error('Message ID is required');
    }

    return executeWithLoading(
      () => socketService.toggleFavorite({ messageId, isFavorite }),
      'Failed to update favorite status'
    );
  }, [executeWithLoading]);

  const copyMessage = useCallback(async (messageId: string, content: string): Promise<void> => {
    if (!messageId || !content) {
      throw new Error('Message ID and content are required');
    }

    return executeWithLoading(
      async () => {
        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(content);
        } else {
          // Fallback for older browsers or non-secure contexts
          const textArea = document.createElement('textarea');
          textArea.value = content;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (!successful) {
            throw new Error('Copy command failed');
          }
        }

        // Log the copy action
        await socketService.logCopyAction(messageId);
      },
      'Failed to copy message'
    );
  }, [executeWithLoading]);

  const getFavorites = useCallback(async (): Promise<any[]> => {
    return executeWithLoading(
      () => socketService.getFavoriteMessages(),
      'Failed to get favorite messages'
    );
  }, [executeWithLoading]);

  return {
    loading,
    error,
      deleteMessage,
    hardDeleteMessage,
    replyToMessage,
    forwardMessage,
    toggleFavorite,
    copyMessage,
    getFavorites,
    clearError,
  };
};