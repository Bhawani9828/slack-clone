// hooks/useMessageActions.ts - Complete React hook for message actions
import { useState, useCallback } from 'react';
import { socketService } from '@/lib/socket';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';

interface UseMessageActionsReturn {
  loading: boolean;
  error: string | null;
  deleteMessage: (messageId: string) => Promise<void>;
  replyToMessage: (data: ReplyData) => Promise<any>;
  forwardMessage: (data: ForwardData) => Promise<void>;
  toggleFavorite: (messageId: string, isFavorite: boolean) => Promise<void>;
  copyMessage: (messageId: string, content: string) => Promise<void>;
  getFavorites: () => Promise<any[]>;
  clearError: () => void;
}

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



  const deleteMessage = useCallback(async (messageId: string): Promise<void> => {
    if (!messageId) {
      throw new Error('Message ID is required');
    }

    if (!currentUser?._id) {
    throw new Error('User ID is missing');
  }

    return executeWithLoading(
      () => socketService.deleteMessage(messageId, currentUser._id),
      'Failed to delete message'
    );
  },  [executeWithLoading, currentUser]);

  const replyToMessage = useCallback(async (data: ReplyData): Promise<any> => {
    if (!data.originalMessageId || !data.receiverId || !data.content?.trim()) {
      throw new Error('Reply data is incomplete');
    }

    return executeWithLoading(
      () => socketService.replyToMessage(data),
      'Failed to send reply'
    );
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
    replyToMessage,
    forwardMessage,
    toggleFavorite,
    copyMessage,
    getFavorites,
    clearError,
  };
};