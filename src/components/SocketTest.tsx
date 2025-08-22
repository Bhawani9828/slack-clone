"use client";

import { useState, useEffect } from 'react';
import { Button, Box, Typography, Paper, Alert, TextField } from '@mui/material';
import { socketService } from '@/lib/socket';

export default function SocketTest() {
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [userId, setUserId] = useState('test-user-1');
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    // Test socket connection
    testSocketConnection();
  }, []);

  const testSocketConnection = () => {
    try {
      addLog('🔌 Testing socket connection...');
      
      // Try to connect
      const socket = socketService.connect(userId);
      
      if (socket) {
        addLog('✅ Socket service returned socket instance');
        
        if (socket.connected) {
          setSocketStatus('connected');
          addLog('✅ Socket already connected');
        } else {
          setSocketStatus('connecting');
          addLog('⏳ Socket connecting...');
          
          socket.on('connect', () => {
            setSocketStatus('connected');
            addLog('✅ Socket connected successfully');
            addLog(`🔗 Socket ID: ${socket.id}`);
          });
          
          socket.on('disconnect', (reason) => {
            setSocketStatus('disconnected');
            addLog(`❌ Socket disconnected: ${reason}`);
          });
          
          socket.on('error', (error) => {
            addLog(`🚨 Socket error: ${error}`);
          });
        }
      } else {
        addLog('❌ Socket service returned null');
        setSocketStatus('failed');
      }
    } catch (error) {
      addLog(`🚨 Error testing socket: ${error}`);
      setSocketStatus('error');
    }
  };

  const testCall = async () => {
    try {
      addLog('📞 Testing call functionality...');
      
      // Emit a test call event
      const socket = socketService.getSocket();
      if (socket && socket.connected) {
        socket.emit('call-user', {
          to: 'test-user-2',
          from: userId,
          offer: { type: 'offer', sdp: 'test-sdp' },
          type: 'video'
        });
        addLog('📡 Test call event emitted');
      } else {
        addLog('❌ Socket not connected for call test');
      }
    } catch (error) {
      addLog(`🚨 Error testing call: ${error}`);
    }
  };

  const getOnlineUsers = () => {
    try {
      const socket = socketService.getSocket();
      if (socket && socket.connected) {
        socket.emit('getOnlineUsers');
        addLog('👥 Requested online users');
      } else {
        addLog('❌ Socket not connected for online users request');
      }
    } catch (error) {
      addLog(`🚨 Error getting online users: ${error}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Socket Connection Test
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Connection Status
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            size="small"
          />
          <Button
            variant="outlined"
            onClick={testSocketConnection}
            disabled={socketStatus === 'connected'}
          >
            Test Connection
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            onClick={testCall}
            disabled={socketStatus !== 'connected'}
          >
            Test Call
          </Button>
          
          <Button
            variant="contained"
            onClick={getOnlineUsers}
            disabled={socketStatus !== 'connected'}
          >
            Get Online Users
          </Button>
        </Box>
        
        <Typography>
          <strong>Status:</strong> {socketStatus}
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test Logs
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2">
            {logs.length} log entries
          </Typography>
          <Button size="small" onClick={clearLogs}>
            Clear Logs
          </Button>
        </Box>
        
        <Box
          sx={{
            maxHeight: '300px',
            overflowY: 'auto',
            backgroundColor: '#f5f5f5',
            p: 2,
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '12px'
          }}
        >
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </Box>
      </Paper>

      <Paper sx={{ p: 3, backgroundColor: '#e3f2fd' }}>
        <Typography variant="h6" gutterBottom>
          What to Check
        </Typography>
        
        <Box component="ul" sx={{ pl: 2 }}>
          <li>✅ <strong>Socket Status:</strong> Should show "connected"</li>
          <li>✅ <strong>Socket ID:</strong> Should show a valid socket ID</li>
          <li>✅ <strong>Test Call:</strong> Should emit call event</li>
          <li>✅ <strong>Backend Logs:</strong> Check NestJS console for connection logs</li>
        </Box>
        
        <Typography variant="body2" sx={{ mt: 2 }}>
          <strong>Expected Backend Logs:</strong><br/>
          ✅ User connected: test-user-1 (socket-id)<br/>
          📞 Call from test-user-1 to test-user-2 (video)
        </Typography>
      </Paper>
    </Box>
  );
}