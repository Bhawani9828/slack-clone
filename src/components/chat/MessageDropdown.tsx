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
} from "@mui/material";
import {
  MoreHoriz as MoreHorizIcon,
  Reply as ReplyIcon,
  ContentCopy as CopyIcon,
  Forward as ForwardIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
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
}: MessageDropdownProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [currentFavoriteState, setCurrentFavoriteState] =
    useState(isFavorite);

  const {
    loading,
    error,
    deleteMessage,
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

  const handleDelete = useCallback(async () => {
    try {
      await deleteMessage(messageId);
      onDelete(messageId);
      showSuccessMessage("Message deleted successfully!");
    } catch (err) {
      console.error("Delete failed:", err);
    }
    handleClose();
  }, [messageId, deleteMessage, onDelete, showSuccessMessage, handleClose]);

  const handleInfo = useCallback(() => {
    if (onInfo) {
      onInfo(messageId);
    }
    handleClose();
  }, [messageId, onInfo, handleClose]);

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

    isSentByCurrentUser && (
      <MenuItem
        key="delete"
        onClick={handleDelete}
        sx={{
          color: "#d32f2f",
          "&:hover": {
            backgroundColor: "rgba(211, 47, 47, 0.04)",
          },
        }}
      >
        <ListItemIcon>
          <DeleteIcon fontSize="small" sx={{ color: "#d32f2f" }} />
        </ListItemIcon>
        <ListItemText primary="Delete" />
      </MenuItem>
    ),
  ].filter(Boolean); // false/null/undefined remove

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
            minWidth: "160px",
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
