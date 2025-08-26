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
  Fade,
  Slide,
  Paper,
} from "@mui/material"
import { Close, CameraAlt, GroupAdd, Person, PhotoCamera } from "@mui/icons-material"
import { useAppSelector } from "@/lib/store"
import groupChatSocketService from "@/lib/group-chat-socket.service"
import { useSnackbar } from "@/hooks/use-snackbar"
import { CustomSnackbar } from "../custom-snackbar"
import useMediaQuery from "@mui/material/useMediaQuery"
import { useTheme } from "@mui/material/styles"
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
 const { snackbarState, showSnackbar, handleClose: handleSnackbarClose } = useSnackbar();
  const { chatusers, currentUser } = useAppSelector((state) => state.user)
const theme = useTheme()
const fullScreen = useMediaQuery(theme.breakpoints.down("sm"))
  useEffect(() => {
    if (!open || !currentUser?._id) return

    setError("")
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

      console.log("✅ Group creation completed")
      setIsCreating(false)

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

  showSnackbar(errorMessage, "error")
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
       fullScreen={fullScreen}
      TransitionComponent={Slide}
      
      PaperProps={{
        sx: {
          backgroundColor: isDark ? "#1e1e2e" : "#ffffff",
          color: isDark ? "#cdd6f4" : "#1e1e2e",
          borderRadius: 4,
          boxShadow: isDark 
            ? "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)"
            : "0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #01aa85, #00d4aa, #01aa85)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2s ease-in-out infinite",
          },
          "@keyframes shimmer": {
            "0%": { backgroundPosition: "-200% 0" },
            "100%": { backgroundPosition: "200% 0" },
          },
        },
      }}
    >
      <DialogTitle sx={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        pb: 2,
        pt: 3,
        px: 3,
        background: isDark 
          ? "linear-gradient(135deg, rgba(1, 170, 133, 0.1) 0%, rgba(30, 30, 46, 0.8) 100%)"
          : "linear-gradient(135deg, rgba(1, 170, 133, 0.05) 0%, rgba(255, 255, 255, 0.8) 100%)",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{
            p: 1.5,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #01aa85, #00d4aa)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <GroupAdd sx={{ color: "white", fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ 
              fontWeight: 700,
              background: isDark 
                ? "linear-gradient(135deg, #cdd6f4, #a6adc8)"
                : "linear-gradient(135deg, #1e1e2e, #45475a)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Create New Group
            </Typography>
            <Typography variant="body2" sx={{ 
              color: isDark ? "#a6adc8" : "#6c6f85",
              mt: 0.5 
            }}>
              Connect with your friends and colleagues
            </Typography>
          </Box>
        </Box>
        <IconButton 
          onClick={handleClose} 
          size="large" 
          disabled={isCreating}
          sx={{
            color: isDark ? "#f38ba8" : "#d20f39",
            "&:hover": {
              backgroundColor: isDark ? "rgba(243, 139, 168, 0.1)" : "rgba(210, 15, 57, 0.1)",
              transform: "scale(1.1)",
            },
            transition: "all 0.2s ease-in-out",
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 2 }}>
        {/* Error Display */}
        {error && (
          <Fade in={!!error}>
            <Paper
              elevation={0}
              sx={{
                background: isDark 
                  ? "linear-gradient(135deg, rgba(243, 139, 168, 0.15), rgba(210, 15, 57, 0.1))"
                  : "linear-gradient(135deg, rgba(210, 15, 57, 0.1), rgba(243, 139, 168, 0.05))",
                color: isDark ? "#f38ba8" : "#d20f39",
                p: 2.5,
                borderRadius: 3,
                mb: 3,
                border: `1px solid ${isDark ? "rgba(243, 139, 168, 0.3)" : "rgba(210, 15, 57, 0.2)"}`,
                backdropFilter: "blur(10px)",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{error}</Typography>
            </Paper>
          </Fade>
        )}

        {/* Group Image Upload */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
          <Box sx={{ position: "relative" }}>
            <Paper
              elevation={0}
              sx={{
                p: 1,
                borderRadius: "50%",
                background: isDark 
                  ? "linear-gradient(135deg, rgba(1, 170, 133, 0.2), rgba(0, 212, 170, 0.1))"
                  : "linear-gradient(135deg, rgba(1, 170, 133, 0.1), rgba(0, 212, 170, 0.05))",
                backdropFilter: "blur(10px)",
                border: `2px solid ${isDark ? "rgba(1, 170, 133, 0.3)" : "rgba(1, 170, 133, 0.2)"}`,
              }}
            >
              <Avatar 
                sx={{ 
                  width: 100, 
                  height: 100, 
                  background: "linear-gradient(135deg, #01aa85, #00d4aa)",
                  fontSize: 36,
                  fontWeight: 700,
                  boxShadow: "0 8px 32px rgba(1, 170, 133, 0.3)",
                }} 
                src={groupImage}
              >
                {groupName.charAt(0).toUpperCase() || "G"}
              </Avatar>
            </Paper>
            <IconButton
              sx={{
                position: "absolute",
                bottom: 8,
                right: 8,
                background: "linear-gradient(135deg, #01aa85, #00d4aa)",
                color: "white",
                width: 40,
                height: 40,
                boxShadow: "0 4px 20px rgba(1, 170, 133, 0.4)",
                "&:hover": { 
                  background: "linear-gradient(135deg, #008f6e, #01aa85)",
                  transform: "scale(1.1)",
                },
                transition: "all 0.2s ease-in-out",
              }}
              size="small"
              disabled={isCreating}
            >
              <PhotoCamera fontSize="small" />
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
            mb: 3,
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              background: isDark 
                ? "rgba(49, 50, 68, 0.5)" 
                : "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(10px)",
              "& fieldset": {
                borderColor: isDark ? "rgba(166, 173, 200, 0.3)" : "rgba(108, 111, 133, 0.3)",
              },
              "&:hover fieldset": {
                borderColor: "#01aa85",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#01aa85",
                boxShadow: "0 0 0 3px rgba(1, 170, 133, 0.1)",
              },
            },
            "& .MuiInputLabel-root": {
              color: isDark ? "#a6adc8" : "#6c6f85",
              "&.Mui-focused": {
                color: "#01aa85",
              },
            },
            "& .MuiOutlinedInput-input": {
              color: isDark ? "#cdd6f4" : "#1e1e2e",
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
            mb: 3,
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              background: isDark 
                ? "rgba(49, 50, 68, 0.5)" 
                : "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(10px)",
              "& fieldset": {
                borderColor: isDark ? "rgba(166, 173, 200, 0.3)" : "rgba(108, 111, 133, 0.3)",
              },
              "&:hover fieldset": {
                borderColor: "#01aa85",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#01aa85",
                boxShadow: "0 0 0 3px rgba(1, 170, 133, 0.1)",
              },
            },
            "& .MuiInputLabel-root": {
              color: isDark ? "#a6adc8" : "#6c6f85",
              "&.Mui-focused": {
                color: "#01aa85",
              },
            },
            "& .MuiOutlinedInput-input": {
              color: isDark ? "#cdd6f4" : "#1e1e2e",
            },
          }}
        />

        {/* Selected Participants */}
        {selectedParticipants.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ 
              mb: 2, 
              color: isDark ? "#a6adc8" : "#6c6f85",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}>
              <Person fontSize="small" />
              Selected Members ({selectedParticipants.length})
            </Typography>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                background: isDark 
                  ? "rgba(49, 50, 68, 0.3)" 
                  : "rgba(1, 170, 133, 0.05)",
                border: `1px solid ${isDark ? "rgba(1, 170, 133, 0.2)" : "rgba(1, 170, 133, 0.1)"}`,
              }}
            >
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                {selectedParticipants.map((userId) => {
                  const user = chatusers.find((u) => u.id === userId)
                  return (
                    <Chip
                      key={userId}
                      label={user?.name || userId}
                      onDelete={isCreating ? undefined : () => handleParticipantToggle(userId)}
                      sx={{
                        background: "linear-gradient(135deg, #01aa85, #00d4aa)",
                        color: "white",
                        fontWeight: 500,
                        "& .MuiChip-deleteIcon": {
                          color: "rgba(255, 255, 255, 0.8)",
                          "&:hover": {
                            color: "white",
                          },
                        },
                      }}
                      size="small"
                    />
                  )
                })}
              </Box>
            </Paper>
          </Box>
        )}

        {/* Participants List */}
        <Typography variant="subtitle2" sx={{ 
          mb: 2, 
          color: isDark ? "#a6adc8" : "#6c6f85",
          fontWeight: 600,
        }}>
          Select Participants
        </Typography>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            background: isDark 
              ? "rgba(49, 50, 68, 0.3)" 
              : "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(10px)",
            border: `1px solid ${isDark ? "rgba(166, 173, 200, 0.1)" : "rgba(108, 111, 133, 0.1)"}`,
            overflow: "hidden",
          }}
        >
          <List sx={{ maxHeight: 280, overflow: "auto", p: 0 }}>
            {chatusers
              .filter((user) => user.id !== currentUser?._id)
              .map((user, index) => (
                <ListItem 
                  key={user.id} 
                  sx={{
                    py: 1.5,
                    px: 2,
                    borderBottom: index < chatusers.length - 2 
                      ? `1px solid ${isDark ? "rgba(166, 173, 200, 0.1)" : "rgba(108, 111, 133, 0.1)"}` 
                      : "none",
                    "&:hover": {
                      background: isDark 
                        ? "rgba(1, 170, 133, 0.1)" 
                        : "rgba(1, 170, 133, 0.05)",
                    },
                    transition: "background-color 0.2s ease-in-out",
                  }}
                >
                  <Checkbox
                    checked={selectedParticipants.includes(user.id)}
                    onChange={() => handleParticipantToggle(user.id)}
                    disabled={isCreating}
                    sx={{
                      color: isDark ? "#a6adc8" : "#6c6f85",
                      "&.Mui-checked": {
                        color: "#01aa85",
                      },
                    }}
                  />
                  <ListItemAvatar sx={{ ml: 1 }}>
                    <Avatar
                      src={user.profilePicture || `https://ui-avatars.com/api/?name=${user.name}&background=01aa85&color=fff`}
                      sx={{ 
                        width: 48, 
                        height: 48,
                        border: `2px solid ${selectedParticipants.includes(user.id) ? "#01aa85" : "transparent"}`,
                        transition: "border-color 0.2s ease-in-out",
                      }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name}
                    secondary={user.status || "Available"}
                    sx={{
                      "& .MuiListItemText-primary": {
                        color: isDark ? "#cdd6f4" : "#1e1e2e",
                        fontWeight: 500,
                      },
                      "& .MuiListItemText-secondary": {
                        color: isDark ? "#a6adc8" : "#6c6f85",
                      },
                    }}
                  />
                </ListItem>
              ))}
          </List>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ 
        p: 3, 
        pt: 2,
        gap: 2,
        background: isDark 
          ? "linear-gradient(135deg, rgba(30, 30, 46, 0.8), rgba(49, 50, 68, 0.5))"
          : "linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(249, 249, 249, 0.5))",
        backdropFilter: "blur(10px)",
      }}>
        <Button 
          onClick={handleClose} 
          disabled={isCreating}
          sx={{
            color: isDark ? "#a6adc8" : "#6c6f85",
            borderColor: isDark ? "rgba(166, 173, 200, 0.3)" : "rgba(108, 111, 133, 0.3)",
            px: 3,
            py: 1.5,
            borderRadius: 3,
            fontWeight: 600,
            "&:hover": {
              borderColor: isDark ? "#a6adc8" : "#6c6f85",
              background: isDark ? "rgba(166, 173, 200, 0.1)" : "rgba(108, 111, 133, 0.1)",
            },
          }}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!groupName.trim() || selectedParticipants.length === 0 || isCreating}
          sx={{
            background: "linear-gradient(135deg, #01aa85, #00d4aa)",
            color: "white",
            px: 4,
            py: 1.5,
            borderRadius: 3,
            fontWeight: 600,
            minWidth: 140,
            boxShadow: "0 8px 32px rgba(1, 170, 133, 0.3)",
            "&:hover": {
              background: "linear-gradient(135deg, #008f6e, #01aa85)",
              boxShadow: "0 12px 40px rgba(1, 170, 133, 0.4)",
              transform: "translateY(-2px)",
            },
            "&:disabled": {
              background: isDark ? "rgba(166, 173, 200, 0.2)" : "rgba(108, 111, 133, 0.2)",
              color: isDark ? "rgba(166, 173, 200, 0.5)" : "rgba(108, 111, 133, 0.5)",
            },
            transition: "all 0.2s ease-in-out",
          }}
        >
          {isCreating ? (
            <>
              <CircularProgress size={18} sx={{ mr: 1.5, color: "white" }} />
              Creating...
            </>
          ) : (
            "Create Group"
          )}
        </Button>
      </DialogActions>

        <CustomSnackbar
              open={snackbarState.open}
              message={snackbarState.message}
              severity={snackbarState.severity}
              onClose={handleSnackbarClose}
            />
    </Dialog>
  )
}