"use client"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Checkbox,
  Avatar,
  IconButton,
  Box,
  Typography,
  Chip,
  CircularProgress,
} from "@mui/material"
import { Close, CameraAlt } from "@mui/icons-material"
import { useAppSelector } from "@/lib/store"
import groupChatSocketService from "@/lib/group-chat-socket.service"

interface CreateGroupDialogProps {
  open: boolean
  onClose: () => void
  onCreateGroup: (groupData: {
    name: string
    description?: string
    participants: string[]
    groupImage?: string
  }) => void
  isDark: boolean
}

export default function CreateGroupDialog({ open, onClose, onCreateGroup, isDark }: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [groupImage, setGroupImage] = useState<string>("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string>("")

  const { chatusers, currentUser } = useAppSelector((state) => state.user)

 useEffect(() => {
  if (!open || !currentUser?._id) return

  setError("")
  // ✅ use the correct method
  groupChatSocketService.setCurrentUserId(currentUser._id)

  const handleGroupCreated = (group: any) => {
    console.log("✅ Group created successfully:", group)
    setIsCreating(false)

    onCreateGroup({
      name: group.name,
      description: group.description,
      participants: group.participants,
      groupImage: group.groupImage,
    })

    resetForm()
    onClose()
  }

  const handleGroupError = (errorData: any) => {
    console.error("❌ Group creation error:", errorData)
    setIsCreating(false)
    setError(errorData.error || "Failed to create group")
  }

  groupChatSocketService.onGroupCreated(handleGroupCreated)
  groupChatSocketService.onGroupError(handleGroupError)

  return () => {
    groupChatSocketService.removeListeners(["groupCreated", "groupChatError"])
  }
}, [open, currentUser?._id, onCreateGroup, onClose])


  const handleParticipantToggle = (userId: string) => {
    setSelectedParticipants((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const resetForm = () => {
    setGroupName("")
    setGroupDescription("")
    setSelectedParticipants([])
    setGroupImage("")
    setError("")
    setIsCreating(false)
  }

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError("Please enter a group name")
      return
    }

    if (selectedParticipants.length === 0) {
      setError("Please select at least one participant")
      return
    }

    if (!currentUser?._id) {
      setError("User not logged in")
      return
    }

    try {
      setIsCreating(true)
      setError("")

      const allParticipants = selectedParticipants.includes(currentUser._id)
        ? selectedParticipants
        : [...selectedParticipants, currentUser._id]

      console.log("🚀 Starting group creation process...")

      await groupChatSocketService.createGroup({
        name: groupName.trim(),
        description: groupDescription.trim(),
        participants: allParticipants,
        groupImage,
      })

      // Reset form and close dialog immediately for REST API success
      console.log("✅ Group creation completed")
      setIsCreating(false)

      // Call the parent callback with the data we sent
      onCreateGroup({
        name: groupName.trim(),
        description: groupDescription.trim(),
        participants: allParticipants,
        groupImage,
      })

      resetForm()
      onClose()
    } catch (err: any) {
      console.error("❌ Group creation failed:", err)
      setIsCreating(false)

      let errorMessage = "Failed to create group. Please try again."

      if (err.message?.includes("Authentication")) {
        errorMessage = "Authentication failed. Please log in again."
      } else if (err.message?.includes("token")) {
        errorMessage = "Session expired. Please refresh and try again."
      } else if (err.message?.includes("participants")) {
        errorMessage = "Invalid participants selected."
      } else if (err.message?.includes("name")) {
        errorMessage = "Group name is invalid."
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      resetForm()
      onClose()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: isDark ? "#1a1a1a" : "white",
          color: isDark ? "white" : "black",
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6">Create New Group</Typography>
        <IconButton onClick={handleClose} size="small" disabled={isCreating}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Error Display */}
        {error && (
          <Box
            sx={{
              bgcolor: isDark ? "#d32f2f20" : "#ffebee",
              color: isDark ? "#ff6b6b" : "#d32f2f",
              p: 2,
              borderRadius: 1,
              mb: 2,
            }}
          >
            <Typography variant="body2">{error}</Typography>
          </Box>
        )}

        {/* Group Image Upload */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <Box sx={{ position: "relative" }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: "#01aa85" }} src={groupImage}>
              {groupName.charAt(0).toUpperCase() || "G"}
            </Avatar>
            <IconButton
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                bgcolor: "#01aa85",
                color: "white",
                "&:hover": { bgcolor: "#008f6e" },
              }}
              size="small"
              disabled={isCreating}
            >
              <CameraAlt fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Group Name */}
        <TextField
          fullWidth
          label="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          margin="dense"
          required
          disabled={isCreating}
          error={!!error && !groupName.trim()}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              color: isDark ? "white" : "black",
            },
            "& .MuiInputLabel-root": {
              color: isDark ? "#ccc" : "inherit",
            },
          }}
        />

        {/* Group Description */}
        <TextField
          fullWidth
          label="Group Description (Optional)"
          value={groupDescription}
          onChange={(e) => setGroupDescription(e.target.value)}
          margin="dense"
          multiline
          rows={2}
          disabled={isCreating}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              color: isDark ? "white" : "black",
            },
            "& .MuiInputLabel-root": {
              color: isDark ? "#ccc" : "inherit",
            },
          }}
        />

        {/* Selected Participants */}
        {selectedParticipants.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, color: isDark ? "#ccc" : "#666" }}>
              Selected ({selectedParticipants.length})
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {selectedParticipants.map((userId) => {
                const user = chatusers.find((u) => u.id === userId)
                return (
                  <Chip
                    key={userId}
                    label={user?.name || userId}
                    onDelete={isCreating ? undefined : () => handleParticipantToggle(userId)}
                    color="primary"
                    size="small"
                  />
                )
              })}
            </Box>
          </Box>
        )}

        {/* Participants List */}
        <Typography variant="body2" sx={{ mb: 1, color: isDark ? "#ccc" : "#666" }}>
          Select Participants
        </Typography>
        <List sx={{ maxHeight: 300, overflow: "auto" }}>
          {chatusers
            .filter((user) => user.id !== currentUser?._id) // Exclude current user from selection
            .map((user) => (
              <ListItem key={user.id} dense>
                <Checkbox
                  checked={selectedParticipants.includes(user.id)}
                  onChange={() => handleParticipantToggle(user.id)}
                  color="primary"
                  disabled={isCreating}
                />
                <ListItemAvatar>
                  <Avatar
                    src={
                      user.profilePicture || `https://ui-avatars.com/api/?name=${user.name}&background=01aa85&color=fff`
                    }
                    sx={{ width: 40, height: 40 }}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={user.name}
                  secondary={user.status || ""}
                  sx={{
                    "& .MuiListItemText-primary": {
                      color: isDark ? "white" : "black",
                    },
                    "& .MuiListItemText-secondary": {
                      color: isDark ? "#ccc" : "#666",
                    },
                  }}
                />
              </ListItem>
            ))}
        </List>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={isCreating}>
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!groupName.trim() || selectedParticipants.length === 0 || isCreating}
          sx={{
            bgcolor: "#01aa85",
            "&:hover": { bgcolor: "#008f6e" },
            minWidth: 120,
          }}
        >
          {isCreating ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1, color: "white" }} />
              Creating...
            </>
          ) : (
            "Create Group"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
