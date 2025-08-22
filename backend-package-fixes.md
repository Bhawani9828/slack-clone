# Backend Package.json Fixes for Video/Audio Calls

## 🚨 **Issues Found:**

1. **Missing CORS dependency** - Required for WebSocket connections
2. **Socket.IO types mismatch** - You have `@types/socket.io` but using Socket.IO v4

## 🔧 **Fix Commands:**

### **1. Install Missing Dependencies:**
```bash
cd your-backend-directory
npm install cors
npm install -D @types/cors
```

### **2. Fix Socket.IO Types:**
```bash
npm uninstall @types/socket.io
npm install -D @types/socket.io@^3.0.2
```

### **3. Updated package.json Dependencies:**
```json
{
  "dependencies": {
    // ... existing dependencies ...
    "cors": "^2.8.5"
  },
  "devDependencies": {
    // ... existing devDependencies ...
    "@types/cors": "^2.8.17"
  }
}
```

## 📝 **Why These Fixes Are Needed:**

- **CORS**: Required for WebSocket connections from your frontend
- **Socket.IO Types**: Proper TypeScript support for Socket.IO v4
- **WebSocket Support**: Your existing dependencies already support WebSockets

## ✅ **After Fixes, Your Backend Will Have:**
- Proper CORS support for WebSocket connections
- Correct Socket.IO type definitions
- All necessary dependencies for video/audio calls