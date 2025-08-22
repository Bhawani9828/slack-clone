"use client";

import { useState } from 'react';
import { Button, Box, Typography, TextField, Paper } from '@mui/material';
import { useCallSocket } from '@/hooks/useCallSocket';
import CallModal from './modals/CallModal';


export default function CallTest() {
  const [currentUserId, setCurrentUserId] = useState('user1');
  const [targetUserId, setTargetUserId] = useState('user2');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const {
    localStream,
    remoteStream,
    incomingCall,
    isCalling,
    isInCall,
    callUser,
    acceptCall,
    endCall,
    initLocalStream,
  } = useCallSocket({ currentUserId });

  const handleVideoCall = async () => {
    try {
      await initLocalStream({ video: true, audio: true });
      await callUser(targetUserId);
    } catch (error) {
      console.error('Failed to initiate video call:', error);
      alert('Failed to start video call. Please check your camera and microphone permissions.');
    }
  };

  const handleAudioCall = async () => {
    try {
      await initLocalStream({ video: false, audio: true });
      await callUser(targetUserId);
    } catch (error) {
      console.error('Failed to initiate audio call:', error);
      alert('Failed to start audio call. Please check your microphone permissions.');
    }
  };

  const handleAcceptCall = async () => {
    try {
      await acceptCall();
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  };

  const handleRejectCall = () => {
    // Reject the call
  };

  const handleEndCall = () => {
    endCall();
  };

  const handleToggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Video/Audio Call Test
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Configuration
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Current User ID"
            value={currentUserId}
            onChange={(e) => setCurrentUserId(e.target.value)}
            size="small"
          />
          <TextField
            label="Target User ID"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            size="small"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleVideoCall}
            disabled={isCalling || isInCall}
          >
            Start Video Call
          </Button>
          
          <Button
            variant="contained"
            color="secondary"
            onClick={handleAudioCall}
            disabled={isCalling || isInCall}
          >
            Start Audio Call
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Call Status
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography>
            <strong>Current User:</strong> {currentUserId}
          </Typography>
          <Typography>
            <strong>Target User:</strong> {targetUserId}
          </Typography>
          <Typography>
            <strong>Calling:</strong> {isCalling ? 'Yes' : 'No'}
          </Typography>
          <Typography>
            <strong>In Call:</strong> {isInCall ? 'Yes' : 'No'}
          </Typography>
          <Typography>
            <strong>Incoming Call:</strong> {incomingCall ? `From ${incomingCall.from} (${incomingCall.type})` : 'No'}
          </Typography>
          <Typography>
            <strong>Local Stream:</strong> {localStream ? 'Active' : 'None'}
          </Typography>
          <Typography>
            <strong>Remote Stream:</strong> {remoteStream ? 'Active' : 'None'}
          </Typography>
        </Box>
      </Paper>

      {/* Call Modal */}
      <CallModal
         open={!!incomingCall || isInCall || isCalling}
        onClose={() => {}}
        incomingCall={incomingCall}
        localStream={localStream}
        remoteStream={remoteStream}
        
        isIncoming={!!incomingCall}
        isInCall={isInCall}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onEndCall={handleEndCall}
        onToggleMic={handleToggleMic}
        onToggleVideo={handleToggleVideo}
        onToggleSpeaker={handleToggleSpeaker}
        isMicOn={isMicOn}
        isVideoOn={isVideoOn}
        isSpeakerOn={isSpeakerOn}
        callerName={incomingCall?.from || targetUserId}
        callerAvatar=""
      />

      {/* Instructions */}
      <Paper sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom>
          How to Test
        </Typography>
        
        <Typography variant="body2" paragraph>
          1. <strong>Open this page in two different browser tabs/windows</strong>
        </Typography>
        
        <Typography variant="body2" paragraph>
          2. <strong>Set different User IDs</strong> in each tab (e.g., "user1" and "user2")
        </Typography>
        
        <Typography variant="body2" paragraph>
          3. <strong>Allow camera and microphone permissions</strong> when prompted
        </Typography>
        
        <Typography variant="body2" paragraph>
          4. <strong>Click "Start Video Call" or "Start Audio Call"</strong> from one tab
        </Typography>
        
        <Typography variant="body2" paragraph>
          5. <strong>Accept the call</strong> in the other tab
        </Typography>
        
        <Typography variant="body2">
          6. <strong>Test the call controls</strong> (mute, video toggle, etc.)
        </Typography>
      </Paper>
    </Box>
  );
}