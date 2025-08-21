"use client";

import { useState, useCallback } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import {
  MoreHoriz as MoreHorizIcon,
  Reply as ReplyIcon,
  ContentCopy as CopyIcon,
  Forward as ForwardIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Delete as DeleteIcon,
  DeleteForever as DeleteForeverIcon,
  Info as InfoIcon,
  PersonRemove as PersonRemoveIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { useMessageActions } from "@/hooks/useMessageActions";

interface MessageDropdownProps {
  messageId: string;
  messageContent: string;
  isSentByCurrentUser: boolean;
  senderId: string;
  receiverId: string;
  isFavorite?: boolean;
  messageType?: "text" | "image" | "video" | "file";
  onReply: (messageId: string) => void;
  onForward: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onInfo?: (messageId: string) => void;
  isGroupChat: boolean; 
  isCurrentUserAdmin?: boolean; 
}

export default function MessageDropdown({
  messageId,
  messageContent,
  isSentByCurrentUser,
  senderId,
  receiverId,
  isFavorite = false,
  messageType = "text",
  onReply,
  onForward,
  onDelete,
  onInfo,
  isGroupChat,
  isCurrentUserAdmin = false,
}: MessageDropdownProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [currentFavoriteState, setCurrentFavoriteState] = useState(isFavorite);
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'soft' | 'hard' | null>(null);

  const {
    loading,
    error,
    deleteMessage,
    hardDeleteMessage,
    toggleFavorite,
    copyMessage,
    clearError,
  } = useMessageActions();

  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    clearError();
  }, [clearError]);

  const showSuccessMessage = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
  }, []);

  const handleReply = useCallback(() => {
    onReply(messageId);
    handleClose();
  }, [messageId, onReply, handleClose]);

  const handleCopy = useCallback(async () => {
    if (!messageContent?.trim()) {
      showSuccessMessage("No content to copy!");
      handleClose();
      return;
    }

    try {
      await copyMessage(messageId, messageContent);
      showSuccessMessage("Message copied to clipboard!");
    } catch (err) {
      console.error("Copy failed:", err);
    }
    handleClose();
  }, [
    messageId,
    messageContent,
    copyMessage,
    showSuccessMessage,
    handleClose,
  ]);

  const handleForward = useCallback(() => {
    onForward(messageId);
    handleClose();
  }, [messageId, onForward, handleClose]);

  const handleFavorite = useCallback(async () => {
    const newFavoriteState = !currentFavoriteState;

    try {
      await toggleFavorite(messageId, newFavoriteState);
      setCurrentFavoriteState(newFavoriteState);
      showSuccessMessage(
        newFavoriteState
          ? "Message added to favorites!"
          : "Message removed from favorites!"
      );
    } catch (err) {
      console.error("Favorite toggle failed:", err);
    }
    handleClose();
  }, [
    messageId,
    currentFavoriteState,
    toggleFavorite,
    showSuccessMessage,
    handleClose,
  ]);

  const handleInfo = useCallback(() => {
    if (onInfo) {
      onInfo(messageId);
    }
    handleClose();
  }, [messageId, onInfo, handleClose]);

  // Delete confirmation handlers
  const handleDeleteClick = useCallback((type: 'soft' | 'hard') => {
    setDeleteType(type);
    setDeleteDialogOpen(true);
    handleClose();
  }, [handleClose]);

const handleConfirmDelete = useCallback(async () => {
  if (!deleteType) return;

  try {
    if (deleteType === "soft") {
      // Pass messageId as first arg, options as second arg
     await deleteMessage(messageId, { isGroupChat, groupId: receiverId });
      showSuccessMessage("Message deleted for you!");
    } else {
      if (isGroupChat && !isCurrentUserAdmin) {
        showSuccessMessage("Only admins can delete for everyone in group chats!");
        return;
      }
     await hardDeleteMessage(messageId, { isGroupChat, groupId: receiverId });
      showSuccessMessage("Message permanently deleted for everyone!");
    }

    onDelete(messageId);
  } catch (err) {
    console.error("Delete failed:", err);
  }

  setDeleteDialogOpen(false);
  setDeleteType(null);
}, [
  deleteType,
  messageId,
  deleteMessage,
  hardDeleteMessage,
  onDelete,
  showSuccessMessage,
  isGroupChat,
  isCurrentUserAdmin,
  receiverId,
]);


  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeleteType(null);
  }, []);

  if (!messageId) {
    return null;
  }

  const menuItems = [
    <MenuItem key="reply" onClick={handleReply}>
      <ListItemIcon>
        <ReplyIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary="Reply" />
    </MenuItem>,

    (messageContent?.trim() || messageType === "text") && (
      <MenuItem key="copy" onClick={handleCopy}>
        <ListItemIcon>
          <CopyIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Copy" />
      </MenuItem>
    ),

    <MenuItem key="forward" onClick={handleForward}>
      <ListItemIcon>
        <ForwardIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText primary="Forward" />
    </MenuItem>,

    <MenuItem key="favorite" onClick={handleFavorite}>
      <ListItemIcon>
        {currentFavoriteState ? (
          <FavoriteIcon fontSize="small" sx={{ color: "#e91e63" }} />
        ) : (
          <FavoriteBorderIcon fontSize="small" />
        )}
      </ListItemIcon>
      <ListItemText
        primary={
          currentFavoriteState
            ? "Remove from Favorites"
            : "Add to Favorites"
        }
      />
    </MenuItem>,

    onInfo && (
      <MenuItem key="info" onClick={handleInfo}>
        <ListItemIcon>
          <InfoIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Message Info" />
      </MenuItem>
    ),

    isSentByCurrentUser && <Divider key="divider" sx={{ my: 0.5 }} />,

    // Improved Delete Options
    isSentByCurrentUser && (
      <MenuItem
        key="delete-for-me"
        onClick={() => handleDeleteClick('soft')}
        sx={{
          color: "#f57c00",
          "&:hover": {
            backgroundColor: "rgba(245, 124, 0, 0.04)",
          },
        }}
      >
        <ListItemIcon>
          <PersonRemoveIcon fontSize="small" sx={{ color: "#f57c00" }} />
        </ListItemIcon>
        <ListItemText 
          primary="Delete for Me"
          secondary="Others can still see this message"
          secondaryTypographyProps={{
            fontSize: "0.75rem",
            color: "#666"
          }}
        />
      </MenuItem>
    ),

    isSentByCurrentUser && (
      <MenuItem
        key="delete-for-everyone"
        onClick={() => handleDeleteClick('hard')}
        sx={{
          color: "#d32f2f",
          "&:hover": {
            backgroundColor: "rgba(211, 47, 47, 0.04)",
          },
        }}
      >
        <ListItemIcon>
          <DeleteForeverIcon fontSize="small" sx={{ color: "#d32f2f" }} />
        </ListItemIcon>
        <ListItemText 
          primary="Delete for Everyone"
          secondary="Permanently removed for all"
          secondaryTypographyProps={{
            fontSize: "0.75rem",
            color: "#666"
          }}
        />
      </MenuItem>
    ),
  ].filter(Boolean);

  return (
    <div>
      <IconButton
        className="message-options-button"
        sx={{
          opacity: 0,
          transition: "all 0.2s ease-in-out",
          width: 32,
          height: 32,
          p: 0,
          color: "#667781",
          backgroundColor: "rgba(255,255,255,0.9)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          "&:hover": {
            backgroundColor: "rgba(255,255,255,1)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
            transform: "scale(1.05)",
          },
          "&.Mui-disabled": {
            opacity: 0.6,
          },
        }}
        onClick={handleClick}
        disabled={loading}
        aria-controls={open ? "message-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        title="Message options"
      >
        {loading ? (
          <CircularProgress size={16} sx={{ color: "#667781" }} />
        ) : (
          <MoreHorizIcon fontSize="small" />
        )}
      </IconButton>

      <Menu
        id="message-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "message-options-button",
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: isSentByCurrentUser ? "right" : "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: isSentByCurrentUser ? "right" : "left",
        }}
        sx={{
          "& .MuiPaper-root": {
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            borderRadius: "8px",
            minWidth: "200px", // Increased width for secondary text
            py: 0.5,
          },
          "& .MuiMenuItem-root": {
            fontSize: "14px",
            py: 1,
            px: 2,
            "&:hover": {
              backgroundColor: "rgba(0,0,0,0.04)",
            },
          },
        }}
        disableAutoFocusItem
      >
        {menuItems}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="delete-dialog-title" sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color={deleteType === 'hard' ? 'error' : 'warning'} />
            <Typography variant="h6">
              {deleteType === 'hard' ? 'Delete for Everyone?' : 'Delete Message?'}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" color="text.secondary">
            {deleteType === 'hard' 
              ? 'This message will be permanently deleted for all participants in this conversation. This action cannot be undone.'
              : 'This message will be deleted from your view, but other participants will still be able to see it.'
            }
          </Typography>
          
          {deleteType === 'hard' && (
            <Box 
              sx={{ 
                mt: 2, 
                p: 2, 
                bgcolor: 'error.light', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'error.main'
              }}
            >
              <Typography variant="body2" color="black" fontWeight="medium">
                ⚠️ Warning: This will permanently delete the message for everyone!
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleCancelDelete}
            color="inherit"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color={deleteType === 'hard' ? 'error' : 'warning'}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {deleteType === 'hard' ? 'Delete for Everyone' : 'Delete for Me'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          onClose={() => setShowSuccess(false)}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={clearError}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="error"
          onClose={clearError}
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {error}
        </Alert>
      </Snackbar>
    </div>
  );
}