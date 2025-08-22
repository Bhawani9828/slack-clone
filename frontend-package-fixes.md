# Frontend Package.json Fixes for Video/Audio Calls

## 🚨 **Issues Found:**

1. **Simple-peer dependency** - This conflicts with our WebRTC implementation
2. **Missing WebRTC types** - For better TypeScript support

## 🔧 **Fix Commands:**

### **1. Remove Conflicting Dependency:**
```bash
cd your-frontend-directory
npm uninstall simple-peer @types/simple-peer
```

### **2. Install WebRTC Types (Optional but Recommended):**
```bash
npm install -D @types/webrtc
```

### **3. Updated package.json Dependencies:**
```json
{
  "dependencies": {
    // ... existing dependencies ...
    // Remove: "simple-peer": "^9.11.1"
  },
  "devDependencies": {
    // ... existing devDependencies ...
    // Remove: "@types/simple-peer": "^9.11.8"
    // Add: "@types/webrtc": "^0.4.4"
  }
}
```

## 📝 **Why These Fixes Are Needed:**

- **Simple-peer**: Conflicts with our native WebRTC implementation
- **WebRTC Types**: Better TypeScript support for WebRTC APIs
- **Clean Dependencies**: Remove unused packages

## ✅ **After Fixes, Your Frontend Will Have:**
- Clean WebRTC implementation without conflicts
- Proper TypeScript support
- All necessary dependencies for video/audio calls