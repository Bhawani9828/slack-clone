const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.0.170:3000'],
  credentials: true
}));

// Socket.IO server
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://192.168.0.170:3000'],
    credentials: true
  }
});

// Store connected users
const connectedUsers = new Map(); // userId -> socketId

// Middleware to handle authentication (simple for testing)
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (token) {
    // For testing, accept any token
    // In production, validate JWT here
    socket.userId = 'test-user-' + Math.random().toString(36).substr(2, 9);
    next();
  } else {
    // For testing, allow connection without token
    socket.userId = 'anonymous-' + Math.random().toString(36).substr(2, 9);
    next();
  }
});

// Handle connections
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.userId} (${socket.id})`);
  
  // Store user connection
  connectedUsers.set(socket.userId, socket.id);
  
  // Join user to their personal room
  socket.join(`user_${socket.userId}`);
  
  // Send connection confirmation
  socket.emit('connectionSuccess', {
    message: 'Connected successfully',
    userId: socket.userId,
    onlineUsers: Array.from(connectedUsers.keys())
  });
  
  // Broadcast user online status
  socket.broadcast.emit('userOnline', socket.userId);
  
  // Handle user joining specific rooms
  socket.on('joinUserRoom', (data) => {
    if (data.userId === socket.userId) {
      socket.join(`user_${data.userId}`);
      console.log(`🏠 User ${socket.userId} joined personal room`);
      socket.emit('joinedUserRoom', { userId: data.userId });
    }
  });
  
  socket.on('joinChat', (data) => {
    socket.join(data.chatId);
    console.log(`👥 User ${socket.userId} joined chat ${data.chatId}`);
    socket.emit('joinedChat', { chatId: data.chatId, userId: socket.userId });
  });
  
  // Handle video/audio calls
  socket.on('call-user', (data) => {
    console.log(`📞 Call from ${data.from} to ${data.to} (${data.type})`);
    
    const targetSocketId = connectedUsers.get(data.to);
    if (targetSocketId) {
      // Send incoming call to target user
      io.to(targetSocketId).emit('incoming-call', {
        from: data.from,
        type: data.type,
        offer: data.offer
      });
      console.log(`📡 Emitting incoming-call to ${data.to}`);
    } else {
      console.log(`❌ User ${data.to} not found for call`);
      socket.emit('call-failed', { message: 'User not available' });
    }
  });
  
  socket.on('call-accepted', (data) => {
    console.log(`✅ Call accepted by ${data.from}`);
    
    const targetSocketId = connectedUsers.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-accepted', {
        from: data.from,
        answer: data.answer
      });
    }
  });
  
  socket.on('call-rejected', (data) => {
    console.log(`❌ Call rejected by ${data.from}`);
    
    const targetSocketId = connectedUsers.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-rejected', { from: data.from });
    }
  });
  
  socket.on('end-call', (data) => {
    console.log(`📞 Call ended by ${data.from}`);
    
    const targetSocketId = connectedUsers.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call-ended', { from: data.from });
    }
  });
  
  socket.on('ice-candidate', (data) => {
    console.log(`🧊 ICE candidate from ${socket.userId} to ${data.to}`);
    
    const targetSocketId = connectedUsers.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', {
        from: socket.userId,
        candidate: data.candidate
      });
    }
  });
  
  // Handle messages
  socket.on('sendMessage', (messageData) => {
    console.log(`📨 Message from ${socket.userId} to ${messageData.receiverId}`);
    
    const receiverSocketId = connectedUsers.get(messageData.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receiveMessage', {
        ...messageData,
        senderId: socket.userId,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Handle typing indicators
  socket.on('typing', (data) => {
    const receiverSocketId = connectedUsers.get(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing', {
        userId: socket.userId,
        receiverId: data.receiverId,
        isTyping: data.isTyping
      });
    }
  });
  
  // Handle online users request
  socket.on('getOnlineUsers', () => {
    const onlineUserIds = Array.from(connectedUsers.keys());
    socket.emit('onlineUsers', onlineUserIds);
    console.log(`👥 Sent online users list: ${onlineUserIds.length} users`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.userId}`);
    
    // Remove from connected users
    connectedUsers.delete(socket.userId);
    
    // Broadcast user offline status
    socket.broadcast.emit('userOffline', socket.userId);
    
    console.log(`📊 Online users: ${connectedUsers.size}`);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    onlineUsers: connectedUsers.size,
    connections: io.engine.clientsCount
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
  console.log(`🌐 WebSocket server ready for WebRTC signaling`);
  console.log(`📱 CORS enabled for: http://localhost:3000, http://192.168.0.170:3000`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});