# Video and Audio Call Implementation Guide

This guide explains how to implement video and audio calls in your chat application using WebRTC and Socket.IO.

## 🚀 Features

- **Video Calls**: Full video calling with camera access
- **Audio Calls**: Voice-only calling
- **Real-time Communication**: WebRTC peer-to-peer connection
- **Call Controls**: Mute, video toggle, speaker toggle
- **Incoming Call Handling**: Accept/reject incoming calls
- **Responsive UI**: Modern call interface with Material-UI

## 📁 Files Created/Modified

### 1. `src/hooks/useCallSocket.ts`
- Custom hook for managing WebRTC connections
- Handles local/remote streams
- Manages call state (calling, in-call, incoming calls)
- WebRTC peer connection setup

### 2. `src/components/CallModal.tsx`
- Modal component for call interface
- Video display (local and remote)
- Call control buttons
- Responsive design

### 3. `src/components/chat/ChatHeader.tsx`
- Updated with call functionality
- Video and audio call buttons
- Call state management
- Integration with CallModal

### 4. `src/lib/socket.ts`
- Added call-related socket methods
- WebRTC signaling support

### 5. `server.js`
- Express server with Socket.IO
- WebRTC signaling server
- Call event handling

## 🛠️ Setup Instructions

### 1. Install Server Dependencies

```bash
cd /path/to/your/project
npm install express socket.io cors
npm install -D nodemon
```

### 2. Start the Signaling Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will run on port 5000 by default.

### 3. Update Your Next.js App

The components are already integrated into your ChatHeader. Make sure you have:

- Material-UI icons installed
- Socket.IO client configured
- Proper user authentication

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in your Next.js project:

```env
NEXT_PUBLIC_SIGNALING_SERVER_URL=http://localhost:5000
```

### Socket Service Configuration

Update your socket service to connect to the signaling server:

```typescript
// In your socket service
const socket = io(process.env.NEXT_PUBLIC_SIGNALING_SERVER_URL || 'http://localhost:5000');
```

## 📱 How to Use

### Making a Call

1. **Video Call**: Click the video call button (📹) in the chat header
2. **Audio Call**: Click the voice call button (📞) in the chat header
3. The app will request camera/microphone permissions
4. Call modal opens with local video preview

### Receiving a Call

1. Incoming call notification appears
2. Call modal opens showing caller information
3. Choose to accept or reject the call
4. If accepted, the call connects

### During a Call

- **Mute/Unmute**: Toggle microphone on/off
- **Video On/Off**: Toggle camera on/off (video calls only)
- **Speaker**: Toggle speaker mode
- **End Call**: Hang up the call

## 🔒 Security Considerations

### Permissions

- **Camera Access**: Required for video calls
- **Microphone Access**: Required for all calls
- **HTTPS**: Required for production (WebRTC needs secure context)

### User Authentication

- Ensure users are authenticated before allowing calls
- Validate user permissions
- Implement rate limiting for call requests

## 🌐 WebRTC Configuration

### STUN Servers

The implementation uses Google's public STUN servers:

```typescript
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};
```

### TURN Servers (Optional)

For production, consider adding TURN servers for NAT traversal:

```typescript
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'username',
      credential: 'password'
    }
  ],
};
```

## 🐛 Troubleshooting

### Common Issues

1. **Camera/Microphone Not Working**
   - Check browser permissions
   - Ensure HTTPS in production
   - Test with different browsers

2. **Call Not Connecting**
   - Check signaling server status
   - Verify socket connection
   - Check firewall settings

3. **Poor Video Quality**
   - Adjust video constraints
   - Check network bandwidth
   - Optimize video resolution

### Debug Mode

Enable debug logging in your browser console:

```typescript
// In useCallSocket hook
console.log('WebRTC Debug:', {
  localStream,
  remoteStream,
  peerConnection: peerConnectionRef.current
});
```

## 📱 Mobile Support

### Responsive Design

The CallModal is designed to work on mobile devices:

- Touch-friendly buttons
- Responsive video layout
- Mobile-optimized controls

### Mobile-Specific Features

- Picture-in-picture support
- Touch gestures
- Mobile camera handling

## 🚀 Production Deployment

### Server Deployment

1. Deploy to cloud platform (Heroku, AWS, etc.)
2. Set environment variables
3. Configure SSL certificates
4. Set up monitoring and logging

### Client Deployment

1. Build Next.js app for production
2. Deploy to hosting platform
3. Configure environment variables
4. Test call functionality

## 📚 Additional Resources

- [WebRTC Documentation](https://webrtc.org/)
- [Socket.IO Documentation](https://socket.io/)
- [Material-UI Documentation](https://mui.com/)
- [Next.js Documentation](https://nextjs.org/)

## 🤝 Contributing

Feel free to contribute improvements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This implementation is provided under the MIT License.

---

**Note**: This is a basic implementation. For production use, consider adding:
- Call recording
- Screen sharing
- Group video calls
- Call analytics
- Advanced security features