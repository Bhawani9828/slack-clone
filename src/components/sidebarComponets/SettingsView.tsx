"use client"
import { useState, useEffect } from "react"
import { Avatar, IconButton, Switch, TextField, Button, CircularProgress } from "@mui/material"
import { ArrowBack, Edit, Notifications, Lock, Help, Info, Brightness4, Save } from "@mui/icons-material"
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

  // Color schemes
  const bgColor = isDark ? "bg-gray-900" : "bg-white"
  const cardBgColor = isDark ? "bg-gray-800" : "bg-gray-50"
  const textColor = isDark ? "text-white" : "text-gray-900"
  const secondaryTextColor = isDark ? "text-gray-400" : "text-gray-600"
  const accentColor = "text-[#01aa85]"
  const borderColor = isDark ? "border-gray-700" : "border-gray-200"

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        const response = await getApi<ApiResponse>(API_ENDPOINTS.USER_PROFILE)
        setProfile(response.data) // Updated to match nested API response structure
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

    // Use postApi instead of putApi for file uploads
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
      <div className={`h-screen w-100 ${bgColor} flex items-center justify-center`}>
        <CircularProgress color="success" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`h-screen w-80 ${bgColor} flex items-center justify-center`}>
        <p className={`${textColor}`}>{error}</p>
      </div>
    )
  }

  return (
    <div className={`h-screen w-80 ${bgColor} border-r ${borderColor} flex flex-col shadow-lg`}>
      {/* Header */}
      <div className={`px-4 py-4 border-b ${borderColor} flex items-center`}>
        <IconButton 
          onClick={onBackToChat} 
          className={`mr-2 ${textColor}`}
          aria-label="Back"
        >
          <ArrowBack />
        </IconButton>
        <h2 className={`text-xl font-bold ${textColor}`}>Settings</h2>
      </div>

      {/* Profile Section */}
      <div className="px-6 py-8 flex flex-col items-center">
        <div className="relative mb-4 group">
          <Avatar 
            src={profile?.profilePicture || `https://ui-avatars.com/api/?name=${profile?.name || 'User'}&background=01aa85&color=fff`} 
            className="w-32 h-32 text-4xl transition-all duration-300 group-hover:opacity-90"
            sx={{ 
              width: 128, 
              height: 128,
              border: '3px solid #01aa85'
            }}
          />
          <IconButton 
            className="absolute bottom-2 right-2 bg-[#01aa85] text-white shadow-lg transition-all duration-300 opacity-0 group-hover:opacity-100"
            onClick={() => document.getElementById('profilePictureInput')?.click()}
            sx={{ 
              width: 40, 
              height: 40,
              backgroundColor: '#01aa85',
              '&:hover': {
                backgroundColor: '#028a6b'
              }
            }}
          >
            <Edit />
          </IconButton>
         <input
      id="profilePictureInput"
      type="file"
      accept="image/*"
      className="hidden"
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
        </div>

        {isEditing ? (
          <div className="w-full max-w-xs space-y-4">
            <TextField
              fullWidth
              variant="outlined"
              label="Full Name"
              size="medium"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className={bgColor}
              InputProps={{
                className: textColor
              }}
            />
            <TextField
              fullWidth
              variant="outlined"
              label="Location"
              size="medium"
              value="Alabama, USA"
              className={bgColor}
              InputProps={{
                className: textColor,
                readOnly: true
              }}
            />
            <div className="flex space-x-3">
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setIsEditing(false)}
                className="border-gray-400 text-gray-600"
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={handleSaveProfile}
                startIcon={<Save />}
                disabled={isUpdating}
              >
                {isUpdating ? <CircularProgress size={24} color="inherit" /> : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h3 className={`text-2xl font-bold ${textColor} mb-1`}>
              {profile?.name || 'Josephin water'}
            </h3>
            <p className={`text-md ${secondaryTextColor} mb-3`}>
              Alabama, USA
            </p>
            <div className="flex items-center justify-center space-x-4">
              <span className={`text-sm ${secondaryTextColor} flex items-center`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${profile?.isVerified ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                {profile?.isVerified ? 'Verified' : 'Not Verified'}
              </span>
              <span className={`text-sm ${secondaryTextColor}`}>
                {formatLastSeen(profile?.lastSeen || new Date().toISOString())}
              </span>
            </div>
            <Button
              variant="text"
              color="primary"
              startIcon={<Edit />}
              onClick={() => setIsEditing(true)}
              className={`mt-4 ${textColor}`}
            >
              Edit Profile
            </Button>
          </div>
        )}
      </div>

      {/* Settings Cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        {/* Account Card */}
        <div className={`p-4 rounded-xl ${cardBgColor} shadow-sm`}>
          <h4 className={`text-sm font-semibold uppercase ${accentColor} mb-1`}>Account</h4>
          <p className={`text-sm ${textColor}`}>Update Your Account Details</p>
        </div>

        {/* Chat Card */}
        <div className={`p-4 rounded-xl ${cardBgColor} shadow-sm`}>
          <h4 className={`text-sm font-semibold uppercase ${accentColor} mb-1`}>Chat</h4>
          <p className={`text-sm ${textColor}`}>Control Your Chat Backup</p>
        </div>

        {/* Integration Card */}
        <div className={`p-4 rounded-xl ${cardBgColor} shadow-sm`}>
          <h4 className={`text-sm font-semibold uppercase ${accentColor} mb-1`}>Integration</h4>
          <p className={`text-sm ${textColor}`}>Sync Your Other Social Account</p>
        </div>

        {/* Help Card */}
        <div className={`p-4 rounded-xl ${cardBgColor} shadow-sm`}>
          <h4 className={`text-sm font-semibold uppercase ${accentColor} mb-1`}>Help</h4>
          <p className={`text-sm ${textColor}`}>You are Confusion, Tell me</p>
        </div>

        {/* Toggles Section */}
        <div className={`mt-6 pt-4 border-t ${borderColor}`}>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center">
              <Notifications className={`mr-3 ${accentColor}`} />
              <span className={textColor}>Notifications</span>
            </div>
            <Switch 
              checked={notificationEnabled}
              onChange={() => setNotificationEnabled(!notificationEnabled)}
              color="success"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center">
              <Brightness4 className={`mr-3 ${accentColor}`} />
              <span className={textColor}>Dark Mode</span>
            </div>
            <Switch 
              checked={darkModeEnabled}
              onChange={() => setDarkModeEnabled(!darkModeEnabled)}
              color="success"
            />
          </div>
        </div>

        {/* Additional Options */}
        <div className="space-y-2 mt-4">
          {[
            { icon: <Lock className={accentColor} />, text: "Privacy Policy" },
            { icon: <Help className={accentColor} />, text: "Help Center" },
            { icon: <Info className={accentColor} />, text: "About" }
          ].map((item, index) => (
            <div
              key={index}
              className={`flex items-center py-2 px-2 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} cursor-pointer`}
            >
              <div className="mr-3">{item.icon}</div>
              <span className={textColor}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}