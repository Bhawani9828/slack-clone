"use client";

import { useState, useEffect } from 'react';
import { Button, Box, Typography, Paper, Alert } from '@mui/material';
import { Camera, Mic, CheckCircle, Error } from '@mui/icons-material';

export default function PermissionTest() {
  const [cameraPermission, setCameraPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [microphonePermission, setMicrophonePermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  // Check if MediaDevices API is supported
  const isMediaDevicesSupported = typeof navigator.mediaDevices !== 'undefined';

  // Check current permissions
  useEffect(() => {
    if (isMediaDevicesSupported) {
      checkPermissions();
    }
  }, [isMediaDevicesSupported]);

  const checkPermissions = async () => {
    try {
      // Check camera permission
      const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setCameraPermission(cameraPermission.state);
      
      // Check microphone permission
      const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setMicrophonePermission(micPermission.state);

      // Listen for permission changes
      cameraPermission.onchange = () => setCameraPermission(cameraPermission.state);
      micPermission.onchange = () => setMicrophonePermission(micPermission.state);

    } catch (error) {
      console.error('Error checking permissions:', error);
      setError('Could not check permissions. This might be a browser compatibility issue.');
    }
  };

  const requestCameraPermission = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      setCameraStream(stream);
      setCameraPermission('granted');
      console.log('✅ Camera permission granted');
      
    } catch (error: any) {
      console.error('❌ Camera permission error:', error);
      setCameraPermission('denied');
      
      if (error.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        setError('No camera found. Please connect a camera and try again.');
      } else if (error.name === 'NotSupportedError') {
        setError('Camera not supported in this browser.');
      } else {
        setError(`Camera error: ${error.message}`);
      }
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      setError('');
      await navigator.mediaDevices.getUserMedia({ 
        video: false, 
        audio: true 
      });
      
      setMicrophonePermission('granted');
      console.log('✅ Microphone permission granted');
      
    } catch (error: any) {
      console.error('❌ Microphone permission error:', error);
      setMicrophonePermission('denied');
      
      if (error.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotSupportedError') {
        setError('Microphone not supported in this browser.');
      } else {
        setError(`Microphone error: ${error.message}`);
      }
    }
  };

  const requestBothPermissions = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setCameraStream(stream);
      setCameraPermission('granted');
      setMicrophonePermission('granted');
      console.log('✅ Both permissions granted');
      
    } catch (error: any) {
      console.error('❌ Combined permission error:', error);
      setError(`Permission error: ${error.message}`);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const getPermissionStatus = (permission: 'unknown' | 'granted' | 'denied') => {
    switch (permission) {
      case 'granted':
        return { color: 'success.main', icon: <CheckCircle />, text: 'Granted' };
      case 'denied':
        return { color: 'error.main', icon: <Error />, text: 'Denied' };
      default:
        return { color: 'warning.main', icon: <Error />, text: 'Unknown' };
    }
  };

  if (!isMediaDevicesSupported) {
    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          MediaDevices API is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Camera & Microphone Permission Test
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Current Permission Status
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Camera />
            <Typography>Camera:</Typography>
            <Box sx={{ color: getPermissionStatus(cameraPermission).color, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getPermissionStatus(cameraPermission).icon}
              {getPermissionStatus(cameraPermission).text}
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Mic />
            <Typography>Microphone:</Typography>
            <Box sx={{ color: getPermissionStatus(microphonePermission).color, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getPermissionStatus(microphonePermission).icon}
              {getPermissionStatus(microphonePermission).text}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            onClick={requestCameraPermission}
            disabled={cameraPermission === 'granted'}
            startIcon={<Camera />}
          >
            Test Camera Only
          </Button>
          
          <Button
            variant="outlined"
            onClick={requestMicrophonePermission}
            disabled={microphonePermission === 'granted'}
            startIcon={<Mic />}
          >
            Test Microphone Only
          </Button>
          
          <Button
            variant="contained"
            onClick={requestBothPermissions}
            disabled={cameraPermission === 'granted' && microphonePermission === 'granted'}
            startIcon={<Camera />}
          >
            Test Both (Video Call)
          </Button>
          
          {cameraStream && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={stopCamera}
            >
              Stop Camera
            </Button>
          )}
        </Box>
      </Paper>

      {/* Camera Preview */}
      {cameraStream && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Camera Preview
          </Typography>
          <video
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              maxWidth: '400px',
              height: 'auto',
              border: '2px solid #ccc',
              borderRadius: '8px'
            }}
            ref={(video) => {
              if (video) video.srcObject = cameraStream;
            }}
          />
        </Paper>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Browser Information */}
      <Paper sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom>
          Browser Information
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2">
            <strong>User Agent:</strong> {navigator.userAgent}
          </Typography>
          <Typography variant="body2">
            <strong>Protocol:</strong> {window.location.protocol}
          </Typography>
          <Typography variant="body2">
            <strong>Host:</strong> {window.location.host}
          </Typography>
          <Typography variant="body2">
            <strong>MediaDevices Supported:</strong> {isMediaDevicesSupported ? 'Yes' : 'No'}
          </Typography>
        </Box>
      </Paper>

      {/* Troubleshooting Tips */}
      <Paper sx={{ p: 3, mt: 3, backgroundColor: '#e3f2fd' }}>
        <Typography variant="h6" gutterBottom>
          Troubleshooting Tips
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <li>Make sure you're using HTTPS or localhost</li>
          <li>Check browser settings for camera/microphone permissions</li>
          <li>Try refreshing the page after granting permissions</li>
          <li>Ensure your camera and microphone are not being used by other applications</li>
          <li>Try a different browser if issues persist</li>
        </Box>
      </Paper>
    </Box>
  );
}