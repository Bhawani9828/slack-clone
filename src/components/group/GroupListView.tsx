"use client";
import { Box, List, ListItem, ListItemAvatar, ListItemText, Avatar, Typography, Badge, Chip } from "@mui/material";
import { Group, PersonAdd } from "@mui/icons-material";
import { useAppSelector } from "@/lib/store";
import { useGroupChat } from "@/hooks/useGroupChat";
import { useState, useEffect } from "react";
import { ChatGroup } from "@/types/chatTypes";

interface GroupListViewProps {
  isDark: boolean;
  currentUserId: string;
  selectedGroupId: string | null;
  onGroupClick: (group: ChatGroup) => void;
  searchQuery?: string;
}

// ✅ Helper function to validate MongoDB ObjectId
const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// ✅ Helper function to get valid group ID
const getValidGroupId = (group: any): string | null => {
  const id = group._id || group.id;
  return (id && isValidObjectId(id)) ? id : null;
};

export default function GroupListView({
  isDark,
  currentUserId,
  selectedGroupId,
  onGroupClick,
  searchQuery = ""
}: GroupListViewProps) {
  // ✅ Only pass selectedGroupId if it's valid, otherwise empty string
  const validSelectedGroupId = (selectedGroupId && isValidObjectId(selectedGroupId)) ? selectedGroupId : "";
  
  const { groups, isLoading, connectionError } = useGroupChat(validSelectedGroupId, currentUserId);
  const [filteredGroups, setFilteredGroups] = useState(groups);

  const getGroupAvatar = (group: any): string | undefined => {
  return group.avatar || group.groupImage;
};

  // ✅ Debug groups data
  useEffect(() => {
    console.log("🔍 GroupListView Debug:", {
      totalGroups: groups.length,
      selectedGroupId,
      validSelectedGroupId,
      groupsData: groups.map(g => ({
        name: g.name,
        id: 'id' in g ? g.id : undefined,
        _id: g._id,
        hasValidId: !!getValidGroupId(g)
      }))
    });
  }, [groups, selectedGroupId, validSelectedGroupId]);

  useEffect(() => {
    // ✅ Filter groups and ensure they have valid IDs
    const validGroups = groups.filter(group => {
      const hasValidId = !!getValidGroupId(group);
      if (!hasValidId) {
        console.warn("⚠️ Group with invalid ID found:", group);
      }
      return hasValidId;
    });

    const filtered = validGroups.filter(group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredGroups(filtered);
  }, [groups, searchQuery]);

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // ✅ Handle click with proper validation
  const handleGroupClick = (group: any) => {
    const validId = getValidGroupId(group);
    
    if (!validId) {
      console.error("❌ Cannot select group with invalid ID:", group);
      alert("Invalid group selected. Please contact support.");
      return;
    }

    console.log("✅ Group clicked with valid ID:", validId);

    // ✅ Create properly formatted ChatGroup object
    const chatGroup: ChatGroup = {
      id: validId,           // Use the valid ObjectId
      _id: validId,          // Keep MongoDB _id
      name: group.name,
      description: group.description,
      avatar: getGroupAvatar(group),
      members: group.participants || group.members || [],
      lastMessage: group.lastMessage?.content || "",
      unreadCount: group.unreadCount || 0,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      // Add any other required fields
    };

    onGroupClick(chatGroup);
  };

  // ✅ Loading state
  if (isLoading) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body2" color={isDark ? "#ccc" : "#666"}>
          Loading groups...
        </Typography>
      </Box>
    );
  }

  // ✅ Error state
  if (connectionError) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body2" color="error">
          Error loading groups: {connectionError}
        </Typography>
      </Box>
    );
  }

  // ✅ Empty state
  if (filteredGroups.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Group sx={{ fontSize: 48, color: isDark ? "#666" : "#ccc", mb: 2 }} />
        <Typography variant="h6" color={isDark ? "white" : "black"} gutterBottom>
          No Groups Found
        </Typography>
        <Typography variant="body2" color={isDark ? "#ccc" : "#666"}>
          {searchQuery ? "No groups match your search" : "Create your first group to start chatting"}
        </Typography>
        {groups.length === 0 && !searchQuery && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: "block" }}>
            Check console for group loading errors
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <List sx={{ py: 0 }}>
      {filteredGroups.map(group => {
        const validId = getValidGroupId(group);
        
        // ✅ Skip groups with invalid IDs
        if (!validId) {
          console.warn("⚠️ Skipping group with invalid ID:", group);
          return null;
        }

        const isSelected = selectedGroupId === validId;

        return (
          <ListItem
            key={validId}
            onClick={() => handleGroupClick(group)}
            sx={{
              cursor: "pointer",
              borderBottom: `1px solid ${isDark ? "#374151" : "#e5e5e5"}`,
              backgroundColor: isSelected ? (isDark ? "#1f2937" : "#f0f0f0") : "transparent",
              "&:hover": { backgroundColor: isDark ? "#374151" : "#f5f5f5" }
            }}
          >
            <ListItemAvatar>
            <Avatar
  src={getGroupAvatar(group)}
  sx={{ 
    bgcolor: "#01aa85",
    width: 48,
    height: 48
  }}
>
  {group.name?.charAt(0)?.toUpperCase() || <Group />}
</Avatar>
            </ListItemAvatar>

            <ListItemText
              primary={
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: isDark ? "white" : "black",
                      fontWeight: isSelected ? 600 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "70%"
                    }}
                  >
                    {group.name}
                  </Typography>
                  
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {group.lastMessage?.createdAt && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: isDark ? "#9ca3af" : "#6b7280",
                          fontSize: "0.75rem"
                        }}
                      >
                        {formatTime(group.lastMessage.createdAt)}
                      </Typography>
                    )}
                    
                    {(group.unreadCount ?? 0) > 0 && (
                      <Badge
                        badgeContent={group.unreadCount}
                        sx={{
                          "& .MuiBadge-badge": {
                            backgroundColor: "#01aa85",
                            color: "white",
                            fontSize: "0.7rem",
                            minWidth: "18px",
                            height: "18px"
                          }
                        }}
                      />
                    )}
                  </Box>
                </Box>
              }
              secondary={
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDark ? "#9ca3af" : "#6b7280",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "100%"
                    }}
                  >
                    {group.lastMessage?.content || group.description || "No recent messages"}
                  </Typography>
                  
                  {group.participants?.length && (
                    <Chip
                      size="small"
                      label={`${group.participants.length} members`}
                      sx={{
                        mt: 0.5,
                        height: "20px",
                        fontSize: "0.65rem",
                        backgroundColor: isDark ? "#374151" : "#f3f4f6",
                        color: isDark ? "#d1d5db" : "#6b7280"
                      }}
                    />
                  )}
                </Box>
              }
            />
          </ListItem>
        );
      })}
    </List>
  );
}

// ✅ Export helper functions for debugging
export { isValidObjectId, getValidGroupId };