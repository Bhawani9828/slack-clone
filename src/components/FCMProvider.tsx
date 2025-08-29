'use client';

import { useEffect, useState } from 'react';
import { useFcm } from '@/hooks/useFcm';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { onForegroundMessage } from "@/lib/firebaseClient"; 
import { useSnackbar } from '@/hooks/use-snackbar';
import { CustomSnackbar } from './custom-snackbar';

interface FCMProviderProps {
  children: React.ReactNode;
}

export const FCMProvider: React.FC<FCMProviderProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const { ready, error, supported } = useFcm(currentUser?._id);

  // Snackbar hook
  const { snackbarState, showSnackbar, handleClose } = useSnackbar();

  useEffect(() => {
    setMounted(true);
    console.log('🚀 FCMProvider mounted');
  }, []);

  // Setup foreground message listener - FIXED ASYNC HANDLING
  useEffect(() => {
    if (!mounted || !ready) {
      console.log('⏳ Not ready for foreground messages:', { mounted, ready });
      return;
    }

    console.log('🔊 Setting up foreground message listener...');
    
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    const setupListener = async () => {
      try {
        // ✅ FIXED: Properly await the Promise
        const unsubscribeFunction = await onForegroundMessage((payload) => {
          if (!isMounted) return;
          
          console.log("📨 Foreground FCM received:", payload);
          console.log("📨 Notification data:", payload.notification);
          console.log("📨 Data payload:", payload.data);

          // Show snackbar notification
          const title = payload.notification?.title || payload.data?.title || "New notification";
          const body = payload.notification?.body || payload.data?.body || "You have a new message";
          
          console.log("🎯 Showing snackbar:", { title, body });
          showSnackbar(`${title}: ${body}`, "info");

          // Show browser notification if permission granted
          if (Notification.permission === "granted") {
            console.log("🔔 Showing browser notification");
            try {
              new Notification(title, {
                body: body,
                icon: "/logo.png",
                badge: "/logo.png",
                tag: `notification-${Date.now()}`,
              });
            } catch (notifError) {
              console.error("❌ Error showing browser notification:", notifError);
            }
          } else {
            console.log("❌ Browser notification permission not granted:", Notification.permission);
          }
        });

        if (unsubscribeFunction && isMounted) {
          unsubscribe = unsubscribeFunction;
          console.log("✅ Foreground message listener setup complete");
        } else {
          console.log("❌ Failed to setup foreground message listener");
        }
      } catch (error) {
        console.error("❌ Error setting up foreground listener:", error);
      }
    };

    setupListener();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        console.log("🔄 Cleaning up foreground message listener");
        unsubscribe();
      }
    };
  }, [mounted, ready, showSnackbar]);

  // Show error in development only
  useEffect(() => {
    if (error && process.env.NODE_ENV === 'development') {
      console.warn('FCM Error:', error);
    }
  }, [error]);

  // Log FCM status changes
  useEffect(() => {
    console.log('📊 FCM Status Update:', { 
      mounted, 
      ready, 
      supported, 
      error, 
      userId: currentUser?._id ? `${currentUser._id.substring(0, 8)}...` : 'No user'
    });
  }, [mounted, ready, supported, error, currentUser?._id]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      {/* Development debug panel */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '10px',
            padding: '8px 12px',
            fontSize: '11px',
            backgroundColor: ready 
              ? '#10b981' 
              : !supported 
                ? '#f59e0b' 
                : error 
                  ? '#ef4444' 
                  : '#6b7280',
            color: 'white',
            borderRadius: '6px',
            zIndex: 9999,
            pointerEvents: 'none',
            fontFamily: 'monospace',
            maxWidth: '200px',
            wordWrap: 'break-word',
          }}
        >
          <div>FCM: {
            ready 
              ? 'Ready ✅' 
              : !supported 
                ? 'Unsupported ⚠️' 
                : error 
                  ? `Error: ${error}` 
                  : 'Loading... ⏳'
          }</div>
          {currentUser?._id && (
            <div style={{ fontSize: '9px', marginTop: '2px', opacity: 0.8 }}>
              User: {currentUser._id.substring(0, 8)}...
            </div>
          )}
          <div style={{ fontSize: '9px', marginTop: '2px', opacity: 0.8 }}>
            Notif: {Notification.permission}
          </div>
        </div>
      )}

      {/* Snackbar for notifications */}
      <CustomSnackbar
        open={snackbarState.open}
        message={snackbarState.message}
        severity={snackbarState.severity}
        onClose={handleClose}
      />
    </>
  );
};