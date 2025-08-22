const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Your Next.js app URL
    methods: ["GET", "POST"]
  }
});

// Enable CORS
app.use(cors());
app.use(express.json());

// Store connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining
  socket.on('join', (userId) => {
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
    console.log(`User ${userId} joined with socket ${socket.id}`);
  });

  // Handle video/audio calls
  socket.on('call-user', (data) => {
    const { to, from, offer, type } = data;
    const targetSocketId = connectedUsers.get(to);
    
    if (targetSocketId) {
      console.log(`Call from ${from} to ${to} (${type})`);
      io.to(targetSocketId).emit('incoming-call', {
        from,
        type,
        offer
      });
    } else {
      console.log(`User ${to} not found`);
      socket.emit('call-failed', { message: 'User not available' });
    }
  });

  // Handle call acceptance
  socket.on('call-accepted', (data) => {
    const { to, from, answer } = data;
    const targetSocketId = connectedUsers.get(to);
    
    if (targetSocketId) {
      console.log(`Call accepted by ${from}`);
      io.to(targetSocketId).emit('call-accepted', {
        from,
        answer
      });
    }
  });

  // Handle call rejection
  socket.on('call-rejected', (data) => {
    const { to, from } = data;
    const targetSocketId = connectedUsers.get(to);
    
    if (targetSocketId) {
      console.log(`Call rejected by ${from}`);
      io.to(targetSocketId).emit('call-rejected', { from });
    }
  });

  // Handle call ending
  socket.on('end-call', (data) => {
    const { to, from } = data;
    const targetSocketId = connectedUsers.get(to);
    
    if (targetSocketId) {
      console.log(`Call ended by ${from}`);
      io.to(targetSocketId).emit('call-ended', { from });
    }
  });

  // Handle ICE candidates
  socket.on('ice-candidate', (data) => {
    const { to, candidate } = data;
    const targetSocketId = connectedUsers.get(to);
    
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', {
        from: socket.userId,
        candidate
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    }
    console.log('User disconnected:', socket.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', connectedUsers: connectedUsers.size });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready for WebRTC signaling`);
});