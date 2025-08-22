# NestJS Backend Setup for Video/Audio Calls

This guide explains how to integrate the video and audio call functionality with your existing NestJS backend.

## 🔄 **What's Been Updated**

Your existing `ChatGateway` has been enhanced with complete video/audio call support. The updated version includes:

### **New Call Handlers:**
- `@SubscribeMessage('call-user')` - Initiates calls
- `@SubscribeMessage('call-accepted')` - Handles call acceptance
- `@SubscribeMessage('call-rejected')` - Handles call rejection
- `@SubscribeMessage('end-call')` - Handles call termination
- `@SubscribeMessage('ice-candidate')` - Handles WebRTC ICE candidates

### **Enhanced Features:**
- Proper error handling and logging
- Call state management
- WebRTC signaling support
- Backward compatibility with existing call methods

## 📁 **Files to Update**

### 1. **Replace Your `chat.gateway.ts`**

Copy the contents of `chat.gateway.updated.ts` and replace your existing `chat.gateway.ts` file.

### 2. **Ensure Required Dependencies**

Make sure your `package.json` includes:

```json
{
  "dependencies": {
    "@nestjs/websockets": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.0.0",
    "socket.io": "^4.8.1"
  }
}
```

## 🚀 **Integration Steps**

### **Step 1: Update Your Gateway**

1. **Backup your current gateway:**
   ```bash
   cp src/chat/chat.gateway.ts src/chat/chat.gateway.backup.ts
   ```

2. **Replace with the updated version:**
   ```bash
   cp chat.gateway.updated.ts src/chat/chat.gateway.ts
   ```

### **Step 2: Update Your Module**

Ensure your `ChatModule` properly imports the gateway:

```typescript
// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { GroupChatService } from '../groupchat/group-chat.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [ChatGateway, ChatService, GroupChatService],
  exports: [ChatGateway, ChatService],
})
export class ChatModule {}
```

### **Step 3: Environment Configuration**

Add these environment variables to your `.env` file:

```env
# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# JWT Secret
JWT_SECRET=your-secret-key

# WebSocket Configuration
WS_PORT=3001
```

### **Step 4: Update Main App Configuration**

Ensure your main app supports WebSockets:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable WebSocket support
  app.useWebSocketAdapter(new IoAdapter(app));
  
  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(process.env.PORT || 3001);
}
bootstrap();
```

## 🔧 **Frontend Integration**

### **Update Your Socket Service**

Your frontend socket service should connect to your NestJS backend:

```typescript
// src/lib/socket.ts (update the connection URL)
const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/chat', {
  withCredentials: true,
  transports: ['websocket', 'polling']
});
```

### **Environment Variables**

Add to your frontend `.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## 📡 **WebSocket Events Flow**

### **Call Initiation:**
1. **Frontend** → `call-user` event
2. **Backend** → `incoming-call` event to target user
3. **Target User** → Receives call notification

### **Call Acceptance:**
1. **Target User** → `call-accepted` event
2. **Backend** → `call-accepted` event to caller
3. **Caller** → Receives acceptance confirmation

### **Call Termination:**
1. **Either User** → `end-call` event
2. **Backend** → `call-ended` event to other user
3. **Both Users** → Call ends

### **ICE Candidates:**
1. **Either User** → `ice-candidate` event
2. **Backend** → `ice-candidate` event to other user
3. **WebRTC** → Establishes peer connection

## 🧪 **Testing the Integration**

### **1. Start Your Backend:**
```bash
npm run start:dev
```

### **2. Start Your Frontend:**
```bash
npm run dev
```

### **3. Test Call Functionality:**
- Open the `CallTest` component in two browser tabs
- Set different user IDs
- Allow camera/microphone permissions
- Test video and audio calls

## 🔍 **Debugging**

### **Backend Logs:**
Look for these log messages in your NestJS console:

```
📞 Call from user1 to user2 (video)
✅ Call accepted by user2
📞 Call ended by user1
```

### **Frontend Console:**
Check browser console for WebRTC events and connection status.

### **Common Issues:**

1. **CORS Errors:**
   - Ensure `FRONTEND_URL` is correctly set
   - Check CORS configuration in main.ts

2. **Authentication Errors:**
   - Verify JWT middleware is working
   - Check token validation

3. **Connection Issues:**
   - Ensure WebSocket adapter is properly configured
   - Check port configuration

## 🚀 **Production Deployment**

### **Environment Variables:**
```env
FRONTEND_URL=https://yourdomain.com
JWT_SECRET=your-production-secret
NODE_ENV=production
```

### **SSL Configuration:**
For production, ensure HTTPS is enabled as WebRTC requires secure context.

### **Load Balancing:**
If using multiple instances, implement sticky sessions for WebSocket connections.

## 📚 **Additional Resources**

- [NestJS WebSockets Documentation](https://docs.nestjs.com/websockets/gateways)
- [Socket.IO Documentation](https://socket.io/docs/)
- [WebRTC Documentation](https://webrtc.org/)

## 🆘 **Support**

If you encounter issues:

1. Check the backend logs for error messages
2. Verify all dependencies are installed
3. Ensure environment variables are set correctly
4. Test with the `CallTest` component first

---

**Note**: This integration maintains backward compatibility with your existing chat functionality while adding robust video/audio call support.