"use client";
import { IconButton, Tooltip, Divider } from "@mui/material";
import {
  Chat,
  Notifications,
  Archive,
  Settings,
  DarkMode,
  Logout,
  ContactEmergencyOutlined,
  ChevronLeft
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { setActiveView,setIsLeftNavOpen } from "@/lib/store/slices/sidebarSlice";
import type { RootState } from "@/lib/store";
interface LeftNavigationProps {
  isDark: boolean;
  onToggleTheme?: () => void;
}
export default function LeftNavigation({ isDark, onToggleTheme }: LeftNavigationProps) {
  const dispatch = useDispatch();
  const { isLeftNavOpen, activeView } = useSelector(
    (state: RootState) => state.sidebar
  );
  

  const handleNavClick = (section: string) => {
    switch (section) {
      case "close":
        dispatch(setIsLeftNavOpen(false));
        break;

      case "chat":
        dispatch(setActiveView("chat"));
        break;
      case "starred":
        dispatch(setActiveView("contacts"));
        break;
      case "notifications":
        dispatch(setActiveView("notifications"));
        break;
      case "archive":
        dispatch(setActiveView("documents"));
        break;
      case "settings":
        dispatch(setActiveView("settings"));
        break;
      case "theme":
         onToggleTheme?.();
        break;
      case "logout":
        console.log("Logout clicked");
        break;
      default:
        console.log("Unknown section:", section);
    }
  };

  const topNavItems = [
    
    {
      icon: <Chat />,
      section: "chat",
      label: "Chat",
      isActive: activeView === "chat",
    },
    {
      icon: <ContactEmergencyOutlined />,
      section: "starred",
      label: "Contacts",
      isActive: activeView === "contacts",
    },
    {
      icon: <Notifications />,
      section: "notifications",
      label: "Notifications",
      isActive: activeView === "notifications",
    },
    {
      icon: <Archive />,
      section: "archive",
      label: "Documents",
      isActive: activeView === "documents",
    },
          {
      icon: <ChevronLeft />, // 👈 nav close button
      section: "close",
      label: "Close Nav",
      isActive: false,
    },
  ];
  

  const bottomNavItems = [
    {
      icon: <Settings />,
      section: "settings",
      label: "Settings",
      isActive: activeView === "settings",
    },
    {
      icon: <DarkMode />,
      section: "theme",
      label: "Theme",
      isActive: false,
    },
    {
      icon: <Logout />,
      section: "logout",
      label: "Logout",
      isActive: false,
    },

  ];

  return (
    <div className={`left-nav-container ${isLeftNavOpen ? "open" : "closed"}`}>
      <div className="left-nav-logo">
        <strong className="left-nav-logo-text">B</strong>
      </div>

      <div className="left-nav-section">
        {topNavItems.map((item, index) => (
          <Tooltip
            key={item.section}
            title={item.label}
            placement="right"
            arrow
            componentsProps={{
              tooltip: { className: "left-nav-tooltip" },
              arrow: { className: "left-nav-tooltip-arrow" },
            }}
          >
            <IconButton
              onClick={() => handleNavClick(item.section)}
              className={`left-nav-icon-btn ${
                item.isActive ? "active-nav-btn" : ""
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="left-nav-icon-wrapper">{item.icon}</div>
            </IconButton>
          </Tooltip>
        ))}
      </div>

      <div className="left-nav-spacer" />
      <Divider className="left-nav-divider" />

      <div className="left-nav-section">
        {bottomNavItems.map((item, index) => (
          <Tooltip
            key={item.section}
            title={item.label}
            placement="right"
            arrow
            componentsProps={{
              tooltip: { className: "left-nav-tooltip" },
              arrow: { className: "left-nav-tooltip-arrow" },
            }}
          >
            <IconButton
              onClick={() => handleNavClick(item.section)}
              className={`left-nav-icon-btn ${
                item.isActive ? "active-nav-btn" : ""
              }`}
              style={{ animationDelay: `${(index + 5) * 100}ms` }}
            >
              <div className="left-nav-icon-wrapper">{item.icon}</div>
            </IconButton>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
