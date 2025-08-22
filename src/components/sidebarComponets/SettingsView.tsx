"use client"
import { useState, useEffect } from "react"
import { Avatar, IconButton, Switch, TextField, Button, CircularProgress, Fade, Slide, Paper, Box, Typography, Divider } from "@mui/material"
import { ArrowBack, Edit, Notifications, Lock, Help, Info, Brightness4, Save, Person, Chat, IntegrationInstructions, CameraAlt, CheckCircle, RadioButtonUnchecked, LocationOn } from "@mui/icons-material"
import { getApi, postApi, putApi } from "@/axios/apiService"
import API_ENDPOINTS from "@/axios/apiEndpoints"

interface SettingsViewProps {
  isDark: boolean
  onBackToChat: () => void
}

interface UserProfile {
  _id: string
  mobileNumber: string
  name: string
  isVerified: boolean
  lastSeen: string
  createdAt: string
  updatedAt: string
  __v: number
  profilePicture?: string
  profilePicturePublicId?: string
  status?: string
}

interface ApiResponse {
  success: boolean
  data: UserProfile
  message: string
  timestamp: string
}

interface ApiUpdateResponse {
  success: boolean
  data: {
    success: boolean
    data: UserProfile
    message: string
    timestamp: string
  }
  message: string
  timestamp: string
}

export default function SettingsView({ isDark, onBackToChat }: SettingsViewProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState("")
  const [notificationEnabled, setNotificationEnabled] = useState(true)
  const [darkModeEnabled, setDarkModeEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState("")

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        const response = await getApi<ApiResponse>(API_ENDPOINTS.USER_PROFILE)
        setProfile(response.data)
        setEditedName(response.data.name)
      } catch (err) {
        setError("Failed to load profile")
        console.error("Profile fetch error:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [])

  // Update profile
  const handleSaveProfile = async () => {
    try {
      setIsUpdating(true)
      const response = await putApi<ApiUpdateResponse>(API_ENDPOINTS.UPDATE_PROFILE, {
        name: editedName
      })
      setProfile(response.data.data) 
      setIsEditing(false)
    } catch (err) {
      setError("Failed to update profile")
      console.error("Profile update error:", err)
    } finally {
      setIsUpdating(false)
    }
  }

  // Update profile picture
  const handleProfilePictureUpdate = async (file: File) => {
    try {
      setIsUpdating(true);
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await putApi<ApiUpdateResponse>(
        API_ENDPOINTS.UPDATE_PROFILE, 
        formData,
        { isFormData: true } 
      );

      setProfile(prev => ({
        ...prev!,
        profilePicture: response.data.data.profilePicture,
        profilePicturePublicId: response.data.data.profilePicturePublicId
      }));

    } catch (err) {
      setError("Failed to update profile picture");
      console.error("Profile picture update error:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatLastSeen = (lastSeen: string) => {
    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffMinutes = Math.round((now.getTime() - lastSeenDate.getTime()) / (1000 * 60))

    if (diffMinutes < 5) return "Online now"
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`
    if (lastSeenDate.toDateString() === now.toDateString()) {
      return `Today at ${lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    return lastSeenDate.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <Box sx={{
        height: "100vh",
        width: "320px",
        backgroundColor: isDark ? "#1e1e2e" : "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isDark 
          ? "linear-gradient(135deg, #1e1e2e 0%, #181825 100%)"
          : "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)",
      }}>
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress 
            size={48}
            sx={{ 
              color: "#01aa85",
              mb: 2,
            }} 
          />
          <Typography sx={{ color: isDark ? "#cdd6f4" : "#1e1e2e" }}>
            Loading settings...
          </Typography>
        </Box>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{
        height: "100vh",
        width: "320px",
        backgroundColor: isDark ? "#1e1e2e" : "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Typography sx={{ color: isDark ? "#f38ba8" : "#d20f39" }}>
          {error}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{
      height: "100vh",
      width: "420px",
      backgroundColor: isDark ? "#1e1e2e" : "#ffffff",
      background: isDark 
        ? "linear-gradient(135deg, #1e1e2e 0%, #181825 100%)"
        : "linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%)",
      borderRight: `1px solid ${isDark ? "rgba(166, 173, 200, 0.1)" : "rgba(108, 111, 133, 0.1)"}`,
      display: "flex",
      flexDirection: "column",
      boxShadow: isDark 
        ? "4px 0 20px rgba(0, 0, 0, 0.3)"
        : "4px 0 20px rgba(0, 0, 0, 0.1)",
      position: "relative",
      "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        width: "3px",
        background: "linear-gradient(180deg, #01aa85, #00d4aa, #01aa85)",
        backgroundSize: "100% 200%",
        animation: "shimmer 3s ease-in-out infinite",
      },
      "@keyframes shimmer": {
        "0%": { backgroundPosition: "0% -200%" },
        "100%": { backgroundPosition: "0% 200%" },
      },
    }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          px: 2,
          py: 2.5,
          background: isDark 
            ? "linear-gradient(135deg, rgba(1, 170, 133, 0.1) 0%, rgba(30, 30, 46, 0.8) 100%)"
            : "linear-gradient(135deg, rgba(1, 170, 133, 0.05) 0%, rgba(255, 255, 255, 0.9) 100%)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${isDark ? "rgba(166, 173, 200, 0.1)" : "rgba(108, 111, 133, 0.1)"}`,
          display: "flex",
          alignItems: "center",
        }}
      >
        <IconButton 
          onClick={onBackToChat}
          sx={{
            mr: 2,
            color: isDark ? "#cdd6f4" : "#1e1e2e",
            "&:hover": {
              backgroundColor: isDark ? "rgba(205, 214, 244, 0.1)" : "rgba(30, 30, 46, 0.1)",
              transform: "scale(1.1)",
            },
            transition: "all 0.2s ease-in-out",
          }}
        >
          <ArrowBack />
        </IconButton>
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
            Settings
          </Typography>
          <Typography variant="body2" sx={{ 
            color: isDark ? "#a6adc8" : "#6c6f85",
            fontSize: "0.875rem",
          }}>
            Manage your preferences
          </Typography>
        </Box>
      </Paper>

      {/* Profile Section */}
      <Box sx={{ px: 3, py: 4, textAlign: "center" }}>
        <Fade in timeout={800}>
          <Box>
            {/* Avatar Section */}
            <Box sx={{ position: "relative", display: "inline-block", mb: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 0.5,
                  borderRadius: "50%",
                  background: isDark 
                    ? "linear-gradient(135deg, rgba(1, 170, 133, 0.3), rgba(0, 212, 170, 0.2))"
                    : "linear-gradient(135deg, rgba(1, 170, 133, 0.2), rgba(0, 212, 170, 0.1))",
                  backdropFilter: "blur(10px)",
                  border: `3px solid ${isDark ? "rgba(1, 170, 133, 0.4)" : "rgba(1, 170, 133, 0.3)"}`,
                }}
              >
                <Avatar 
                  src={profile?.profilePicture || `https://ui-avatars.com/api/?name=${profile?.name || 'User'}&background=01aa85&color=fff`} 
                  sx={{ 
                    width: 120, 
                    height: 120,
                    fontSize: "2.5rem",
                    fontWeight: 700,
                    background: "linear-gradient(135deg, #01aa85, #00d4aa)",
                    boxShadow: "0 8px 32px rgba(1, 170, 133, 0.3)",
                  }}
                />
              </Paper>
              
              <IconButton 
                onClick={() => document.getElementById('profilePictureInput')?.click()}
                sx={{ 
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  width: 40,
                  height: 40,
                  background: "linear-gradient(135deg, #01aa85, #00d4aa)",
                  color: "white",
                  boxShadow: "0 4px 20px rgba(1, 170, 133, 0.4)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #008f6e, #01aa85)",
                    transform: "scale(1.1)",
                  },
                  transition: "all 0.2s ease-in-out",
                }}
                disabled={isUpdating}
              >
                {isUpdating ? <CircularProgress size={20} color="inherit" /> : <CameraAlt />}
              </IconButton>
              
              <input
                id="profilePictureInput"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={async (e) => {
                  if (e.target.files?.[0]) {
                    try {
                      await handleProfilePictureUpdate(e.target.files[0]);
                      e.target.value = '';
                    } catch (error) {
                      console.error('Error updating profile picture:', error);
                    }
                  }
                }}
              />
            </Box>

            {/* Profile Info */}
            {isEditing ? (
              <Box sx={{ maxWidth: 280, mx: "auto", space: 2 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Full Name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  sx={{
                    mb: 2.5,
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
                
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Location"
                  value="Alabama, USA"
                  disabled
                  sx={{
                    mb: 3,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                      background: isDark 
                        ? "rgba(49, 50, 68, 0.3)" 
                        : "rgba(255, 255, 255, 0.5)",
                    },
                    "& .MuiInputLabel-root": {
                      color: isDark ? "#a6adc8" : "#6c6f85",
                    },
                    "& .MuiOutlinedInput-input": {
                      color: isDark ? "#a6adc8" : "#6c6f85",
                    },
                  }}
                />
                
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setIsEditing(false)}
                    sx={{
                      borderColor: isDark ? "rgba(166, 173, 200, 0.3)" : "rgba(108, 111, 133, 0.3)",
                      color: isDark ? "#a6adc8" : "#6c6f85",
                      borderRadius: 3,
                      py: 1.5,
                      fontWeight: 600,
                      "&:hover": {
                        borderColor: isDark ? "#a6adc8" : "#6c6f85",
                        background: isDark ? "rgba(166, 173, 200, 0.1)" : "rgba(108, 111, 133, 0.1)",
                      },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleSaveProfile}
                    startIcon={<Save />}
                    disabled={isUpdating}
                    sx={{
                      background: "linear-gradient(135deg, #01aa85, #00d4aa)",
                      borderRadius: 3,
                      py: 1.5,
                      fontWeight: 600,
                      boxShadow: "0 4px 20px rgba(1, 170, 133, 0.3)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #008f6e, #01aa85)",
                        transform: "translateY(-1px)",
                      },
                      transition: "all 0.2s ease-in-out",
                    }}
                  >
                    {isUpdating ? <CircularProgress size={20} color="inherit" /> : 'Save'}
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="h4" sx={{
                  fontWeight: 700,
                  color: isDark ? "#cdd6f4" : "#1e1e2e",
                  mb: 1,
                }}>
                  {profile?.name || 'Josephin water'}
                </Typography>
                
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 2, gap: 1 }}>
                  <LocationOn sx={{ color: isDark ? "#a6adc8" : "#6c6f85", fontSize: 18 }} />
                  <Typography sx={{ color: isDark ? "#a6adc8" : "#6c6f85" }}>
                    Alabama, USA
                  </Typography>
                </Box>
                
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, mb: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {profile?.isVerified ? (
                      <CheckCircle sx={{ color: "#40a9ff", fontSize: 18 }} />
                    ) : (
                      <RadioButtonUnchecked sx={{ color: isDark ? "#a6adc8" : "#6c6f85", fontSize: 18 }} />
                    )}
                    <Typography variant="body2" sx={{ color: isDark ? "#a6adc8" : "#6c6f85" }}>
                      {profile?.isVerified ? 'Verified' : 'Not Verified'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: isDark ? "#a6adc8" : "#6c6f85" }}>
                    {formatLastSeen(profile?.lastSeen || new Date().toISOString())}
                  </Typography>
                </Box>
                
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => setIsEditing(true)}
                  sx={{
                    borderColor: "#01aa85",
                    color: "#01aa85",
                    borderRadius: 3,
                    px: 3,
                    py: 1.5,
                    fontWeight: 600,
                    "&:hover": {
                      borderColor: "#008f6e",
                      background: "rgba(1, 170, 133, 0.1)",
                    },
                  }}
                >
                  Edit Profile
                </Button>
              </Box>
            )}
          </Box>
        </Fade>
      </Box>

      {/* Settings Cards */}
      <Box sx={{ flex: 1, overflow: "auto", px: 2, pb: 3 }}>
        <Box sx={{ space: 2 }}>
          {/* Settings Categories */}
          {[
            { 
              icon: <Person sx={{ color: "#01aa85" }} />, 
              title: "Account", 
              description: "Update Your Account Details",
              gradient: "linear-gradient(135deg, rgba(1, 170, 133, 0.1), rgba(0, 212, 170, 0.05))"
            },
            { 
              icon: <Chat sx={{ color: "#f9e2af" }} />, 
              title: "Chat", 
              description: "Control Your Chat Backup",
              gradient: "linear-gradient(135deg, rgba(249, 226, 175, 0.1), rgba(235, 203, 139, 0.05))"
            },
            { 
              icon: <IntegrationInstructions sx={{ color: "#cba6f7" }} />, 
              title: "Integration", 
              description: "Sync Your Other Social Account",
              gradient: "linear-gradient(135deg, rgba(203, 166, 247, 0.1), rgba(180, 150, 230, 0.05))"
            },
            { 
              icon: <Help sx={{ color: "#94e2d5" }} />, 
              title: "Help", 
              description: "You are Confusion, Tell me",
              gradient: "linear-gradient(135deg, rgba(148, 226, 213, 0.1), rgba(116, 199, 186, 0.05))"
            },
          ].map((item, index) => (
            <Slide key={index} direction="left" in timeout={600 + index * 100}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mb: 2,
                  borderRadius: 3,
                  background: isDark 
                    ? item.gradient.replace('0.1', '0.15').replace('0.05', '0.08')
                    : item.gradient,
                  backdropFilter: "blur(10px)",
                  border: `1px solid ${isDark ? "rgba(166, 173, 200, 0.1)" : "rgba(108, 111, 133, 0.1)"}`,
                  cursor: "pointer",
                  transition: "all 0.3s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: isDark 
                      ? "0 8px 32px rgba(0, 0, 0, 0.3)"
                      : "0 8px 32px rgba(0, 0, 0, 0.1)",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <Box sx={{ mr: 2 }}>{item.icon}</Box>
                  <Typography variant="subtitle1" sx={{
                    fontWeight: 700,
                    color: isDark ? "#cdd6f4" : "#1e1e2e",
                    textTransform: "uppercase",
                    fontSize: "0.875rem",
                    letterSpacing: "0.5px",
                  }}>
                    {item.title}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{
                  color: isDark ? "#a6adc8" : "#6c6f85",
                  lineHeight: 1.4,
                }}>
                  {item.description}
                </Typography>
              </Paper>
            </Slide>
          ))}
        </Box>

        <Divider sx={{ 
          my: 3,
          borderColor: isDark ? "rgba(166, 173, 200, 0.2)" : "rgba(108, 111, 133, 0.2)",
        }} />

        {/* Toggle Settings */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 2,
            borderRadius: 3,
            background: isDark 
              ? "rgba(49, 50, 68, 0.3)" 
              : "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(10px)",
            border: `1px solid ${isDark ? "rgba(166, 173, 200, 0.1)" : "rgba(108, 111, 133, 0.1)"}`,
          }}
        >
          <Typography variant="subtitle1" sx={{
            fontWeight: 700,
            color: isDark ? "#cdd6f4" : "#1e1e2e",
            mb: 2,
            textTransform: "uppercase",
            fontSize: "0.875rem",
            letterSpacing: "0.5px",
          }}>
            Preferences
          </Typography>

          {[
            {
              icon: <Notifications sx={{ color: "#f9e2af" }} />,
              label: "Notifications",
              checked: notificationEnabled,
              onChange: () => setNotificationEnabled(!notificationEnabled),
            },
            {
              icon: <Brightness4 sx={{ color: "#cba6f7" }} />,
              label: "Dark Mode",
              checked: darkModeEnabled,
              onChange: () => setDarkModeEnabled(!darkModeEnabled),
            },
          ].map((toggle, index) => (
            <Box key={index} sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              py: 2,
              "&:not(:last-child)": {
                borderBottom: `1px solid ${isDark ? "rgba(166, 173, 200, 0.1)" : "rgba(108, 111, 133, 0.1)"}`,
              },
            }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box sx={{ mr: 2 }}>{toggle.icon}</Box>
                <Typography sx={{ color: isDark ? "#cdd6f4" : "#1e1e2e", fontWeight: 500 }}>
                  {toggle.label}
                </Typography>
              </Box>
              <Switch 
                checked={toggle.checked}
                onChange={toggle.onChange}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": {
                    color: "#01aa85",
                    "&:hover": {
                      backgroundColor: "rgba(1, 170, 133, 0.08)",
                    },
                  },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    backgroundColor: "#01aa85",
                  },
                }}
              />
            </Box>
          ))}
        </Paper>

        {/* Additional Options */}
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
          {[
            { icon: <Lock sx={{ color: "#f38ba8" }} />, text: "Privacy Policy" },
            { icon: <Help sx={{ color: "#94e2d5" }} />, text: "Help Center" },
            { icon: <Info sx={{ color: "#89b4fa" }} />, text: "About" }
          ].map((item, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                py: 2.5,
                px: 2.5,
                cursor: "pointer",
                borderBottom: index < 2 
                  ? `1px solid ${isDark ? "rgba(166, 173, 200, 0.1)" : "rgba(108, 111, 133, 0.1)"}` 
                  : "none",
                "&:hover": {
                  background: isDark 
                    ? "rgba(166, 173, 200, 0.1)" 
                    : "rgba(108, 111, 133, 0.05)",
                },
                transition: "background-color 0.2s ease-in-out",
              }}
            >
              <Box sx={{ mr: 2.5 }}>{item.icon}</Box>
              <Typography sx={{ 
                color: isDark ? "#cdd6f4" : "#1e1e2e",
                fontWeight: 500,
              }}>
                {item.text}
              </Typography>
            </Box>
          ))}
        </Paper>
      </Box>
    </Box>
  )
}