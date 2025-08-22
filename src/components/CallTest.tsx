"use client";

import { useState, useEffect } from 'react';
import { Button, Box, Typography, TextField, Paper, Alert } from '@mui/material';
import { useCallSocket } from '@/hooks/useCallSocket';
import CallModal from './CallModal';

export default function CallTest() {
  const [currentUserId, setCurrentUserId] = useState('user1');
  const [targetUserId, setTargetUserId] = useState('user2');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [socketStatus, setSocketStatus] = useState('disconnected');

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

  // Monitor socket connection status
  useEffect(() => {
    const checkSocketStatus = () => {
      // You can add socket status checking here
      setSocketStatus('connected');
    };
    
    checkSocketStatus();
  }, []);

  const handleVideoCall = async () => {
    try {
      console.log('🎥 Starting video call from', currentUserId, 'to', targetUserId);
      const stream = await initLocalStream({ video: true, audio: true });
      
      if (!stream) {
        throw new Error('Failed to get media stream');
      }
      
      console.log('✅ Media stream obtained, initiating call...');
      await callUser(targetUserId, stream);
      console.log('📞 Call initiated, waiting for response...');
    } catch (error) {
      console.error('Failed to initiate video call:', error);
      alert(`Failed to start video call: ${error.message}`);
    }
  };

  const handleAudioCall = async () => {
    try {
      console.log('🎤 Starting audio call from', currentUserId, 'to', targetUserId);
      const stream = await initLocalStream({ video: false, audio: true });
      
      if (!stream) {
        throw new Error('Failed to get media stream');
      }
      
      console.log('✅ Media stream obtained, initiating call...');
      await callUser(targetUserId, stream);
      console.log('📞 Call initiated, waiting for response...');
    } catch (error) {
      console.error('Failed to initiate audio call:', error);
      alert(`Failed to start audio call: ${error.message}`);
    }
  };

  const handleAcceptCall = async () => {
    try {
      console.log('✅ Accepting incoming call...');
      await acceptCall();
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  };

  const handleRejectCall = () => {
    console.log('❌ Rejecting incoming call');
    // You can implement call rejection logic here
  };

  const handleEndCall = () => {
    console.log('📞 Ending call...');
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
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
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
            helperText="Set this to 'user1' in first tab, 'user2' in second tab"
          />
          <TextField
            label="Target User ID"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            size="small"
            helperText="Set this to the user you want to call"
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
            <strong>Socket Status:</strong> {socketStatus}
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
        isCalling={isCalling}
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
          How to Test Signaling
        </Typography>
        
        <Typography variant="body2" paragraph>
          1. <strong>Open this page in two different browser tabs</strong>
        </Typography>
        
        <Typography variant="body2" paragraph>
          2. <strong>Set different User IDs:</strong>
             - Tab 1: Current User = "user1", Target User = "user2"
             - Tab 2: Current User = "user2", Target User = "user1"
        </Typography>
        
        <Typography variant="body2" paragraph>
          3. <strong>Allow camera and microphone permissions</strong> in both tabs
        </Typography>
        
        <Typography variant="body2" paragraph>
          4. <strong>Click "Start Video Call" from Tab 1</strong> (user1 calling user2)
        </Typography>
        
        <Typography variant="body2" paragraph>
          5. <strong>Check Tab 2 for incoming call notification</strong>
        </Typography>
        
        <Typography variant="body2" paragraph>
          6. <strong>Accept the call in Tab 2</strong>
        </Typography>
        
        <Typography variant="body2">
          7. <strong>Test the call connection</strong> between both tabs
        </Typography>
      </Paper>

      {/* Debug Information */}
      <Paper sx={{ p: 3, mt: 3, backgroundColor: '#fff3cd' }}>
        <Typography variant="h6" gutterBottom>
          Debug Information
        </Typography>
        
        <Typography variant="body2" paragraph>
          <strong>Current Issue:</strong> Call is being initiated but other user is not receiving it.
        </Typography>
        
        <Typography variant="body2" paragraph>
          <strong>Possible Causes:</strong>
        </Typography>
        
        <Box component="ul" sx={{ pl: 2 }}>
          <li>Other user is not connected to WebSocket</li>
          <li>Backend signaling is not working properly</li>
          <li>User IDs don't match between frontend and backend</li>
          <li>Socket namespace mismatch</li>
        </Box>
        
        <Typography variant="body2" paragraph>
          <strong>Check Backend Logs:</strong> Look for "Call from [user] to [user]" messages
        </Typography>
      </Paper>
    </Box>
  );
}