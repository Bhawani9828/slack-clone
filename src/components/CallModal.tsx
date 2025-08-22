"use client";

import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Avatar,
} from '@mui/material';
import {
  Call,
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  VolumeUp,
  VolumeOff,
} from '@mui/icons-material';

interface CallModalProps {
  open: boolean;
  onClose: () => void;
  incomingCall: {
    from: string;
    type: 'video' | 'audio';
    offer: any;
  } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isIncoming: boolean;
  isInCall: boolean;
  isCalling?: boolean; // Add this prop
  onAccept: () => void;
  onReject: () => void;
  onEndCall: () => void;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
  isMicOn: boolean;
  isVideoOn: boolean;
  isSpeakerOn: boolean;
  callerName: string;
  callerAvatar?: string;
}

export default function CallModal({
  open,
  onClose,
  incomingCall,
  localStream,
  remoteStream,
  isIncoming,
  isInCall,
  onAccept,
  onReject,
  onEndCall,
  onToggleMic,
  onToggleVideo,
  onToggleSpeaker,
  isMicOn,
  isVideoOn,
  isSpeakerOn,
  callerName,
  callerAvatar,
}: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleAccept = () => {
    onAccept();
  };

  const handleReject = () => {
    onReject();
    onClose();
  };

  const handleEndCall = () => {
    onEndCall();
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: '#1a1a1a',
          color: 'white',
          borderRadius: '16px',
        },
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        {/* Remote Video (Main View) */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '400px',
            backgroundColor: '#000',
            borderRadius: '16px 16px 0 0',
            overflow: 'hidden',
          }}
        >
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                backgroundColor: '#2a2a2a',
              }}
            >
              <Avatar
                src={callerAvatar}
                sx={{ width: 80, height: 80, mb: 2 }}
              >
                {callerName.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h6" sx={{ color: 'white' }}>
                {callerName}
              </Typography>
              <Typography variant="body2" sx={{ color: '#ccc' }}>
                {isIncoming ? 'Incoming call...' : 'Calling...'}
              </Typography>
            </Box>
          )}

          {/* Local Video (Picture-in-Picture) */}
          {localStream && isVideoOn && (
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 120,
                height: 90,
                borderRadius: '8px',
                overflow: 'hidden',
                border: '2px solid #00a884',
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </Box>
          )}
        </Box>

        {/* Call Controls */}
        <Box
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {/* Caller Info */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
              {callerName}
            </Typography>
            <Typography variant="body2" sx={{ color: '#ccc' }}>
              {isIncoming ? 'Incoming call' : isCalling ? 'Calling...' : 'Connected'}
            </Typography>
          </Box>

                  {/* Call Action Buttons */}
        {isIncoming && !isInCall ? (
          // Incoming call - show accept/reject buttons
          <Box sx={{ display: 'flex', gap: 2 }}>
            <IconButton
              onClick={handleAccept}
              sx={{
                backgroundColor: '#00a884',
                color: 'white',
                width: 56,
                height: 56,
                '&:hover': {
                  backgroundColor: '#008f6f',
                },
              }}
            >
              <Call />
            </IconButton>
            <IconButton
              onClick={handleReject}
              sx={{
                backgroundColor: '#dc2626',
                color: 'white',
                width: 56,
                height: 56,
                '&:hover': {
                  backgroundColor: '#b91c1c',
                },
              }}
            >
              <CallEnd />
            </IconButton>
          </Box>
        ) : isCalling ? (
          // Outgoing call - show calling status and cancel button
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="body1" sx={{ color: '#ccc', alignSelf: 'center' }}>
              Calling...
            </Typography>
            <IconButton
              onClick={onEndCall}
              sx={{
                backgroundColor: '#dc2626',
                color: 'white',
                width: 48,
                height: 48,
                '&:hover': {
                  backgroundColor: '#b91c1c',
                },
              }}
            >
              <CallEnd />
            </IconButton>
          </Box>
        ) : (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Mic Toggle */}
              <IconButton
                onClick={onToggleMic}
                sx={{
                  backgroundColor: isMicOn ? '#00a884' : '#666',
                  color: 'white',
                  width: 48,
                  height: 48,
                  '&:hover': {
                    backgroundColor: isMicOn ? '#008f6f' : '#555',
                  },
                }}
              >
                {isMicOn ? <Mic /> : <MicOff />}
              </IconButton>

              {/* Video Toggle (only for video calls) */}
              {incomingCall?.type === 'video' && (
                <IconButton
                  onClick={onToggleVideo}
                  sx={{
                    backgroundColor: isVideoOn ? '#00a884' : '#666',
                    color: 'white',
                    width: 48,
                    height: 48,
                    '&:hover': {
                      backgroundColor: isVideoOn ? '#008f6f' : '#555',
                    },
                  }}
                >
                  {isVideoOn ? <Videocam /> : <VideocamOff />}
                </IconButton>
              )}

              {/* Speaker Toggle */}
              <IconButton
                onClick={onToggleSpeaker}
                sx={{
                  backgroundColor: isSpeakerOn ? '#00a884' : '#666',
                  color: 'white',
                  width: 48,
                  height: 48,
                  '&:hover': {
                    backgroundColor: isSpeakerOn ? '#008f6f' : '#555',
                  },
                }}
              >
                {isSpeakerOn ? <VolumeUp /> : <VolumeOff />}
              </IconButton>

              {/* End Call */}
              <IconButton
                onClick={handleEndCall}
                sx={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  width: 48,
                  height: 48,
                  '&:hover': {
                    backgroundColor: '#b91c1c',
                  },
                }}
              >
                <CallEnd />
              </IconButton>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}