# Call System Implementation

## Overview
This document describes the implementation of the call system for the chat application, which handles incoming and outgoing voice/video calls.

## Components

### 1. useCallSocket Hook (`src/hooks/useCallSocket.ts`)
- Manages incoming call state and socket event listeners
- Handles call acceptance, rejection, and cleanup
- Integrates with audio utilities for call notifications

### 2. IncomingCallModal (`src/components/modals/IncomingCallModal.tsx`)
- Displays incoming call interface with caller information
- Shows accept/reject buttons with visual feedback
- Auto-rejects calls after 30 seconds of no response
- Displays call duration timer

### 3. Socket Service (`src/lib/socket.ts`)
- Added call-related methods:
  - `initiateCall()` - Start a call to another user
  - `acceptCall()` - Accept an incoming call
  - `rejectCall()` - Reject an incoming call
  - `endCall()` - End an active call
  - Call event listeners for incoming calls, acceptance, rejection, and ending

### 4. Audio Utilities (`src/lib/audioUtils.ts`)
- Manages call notification sounds
- Handles incoming call ringtone
- Provides audio cleanup and volume control

## How It Works

### Incoming Call Flow
1. **Call Initiation**: User A calls User B via `socketService.initiateCall()`
2. **Socket Event**: Server emits `incoming-call` event to User B
3. **Frontend Handling**: `useCallSocket` hook receives the event
4. **Modal Display**: `IncomingCallModal` shows with caller info and accept/reject options
5. **Audio Notification**: Ringtone plays to alert User B
6. **User Response**: User B can accept or reject the call
7. **Call State**: Modal closes and audio stops based on response

### Outgoing Call Flow
1. **User Action**: User clicks video/voice call button
2. **Call Initiation**: `handleVideoCall()` or `handleVoiceCall()` calls `socketService.initiateCall()`
3. **Socket Event**: `initiate-call` event sent to server
4. **Server Processing**: Server handles call routing and user availability

## Socket Events

### Client to Server
- `initiate-call` - Start a new call
- `accept-call` - Accept incoming call
- `reject-call` - Reject incoming call
- `end-call` - End active call

### Server to Client
- `incoming-call` - Receive incoming call notification
- `call-accepted` - Call was accepted by recipient
- `call-rejected` - Call was rejected by recipient
- `call-ended` - Call was ended

## Integration Points

### Main Page (`src/app/page.tsx`)
- Initializes `useCallSocket` hook
- Renders `IncomingCallModal` component
- Handles video/voice call button clicks
- Integrates call functionality with existing chat system

### Audio Integration
- Call sounds play automatically on incoming calls
- Audio stops when call is accepted/rejected
- Audio resources are properly cleaned up

## Configuration

### Call Timeout
- Incoming calls auto-reject after 30 seconds
- Configurable in `IncomingCallModal.tsx`

### Audio Files
- Expected audio files in `/public/sounds/`:
  - `incoming-call.mp3` - Incoming call notification
  - `ringtone.mp3` - Call ringtone

## Future Enhancements

1. **Call History**: Track call logs and statistics
2. **Call Quality**: Implement WebRTC for actual call handling
3. **Push Notifications**: Browser notifications for missed calls
4. **Call Recording**: Option to record calls
5. **Group Calls**: Support for multiple participants

## Troubleshooting

### Common Issues
1. **No Audio**: Check if audio files exist in `/public/sounds/`
2. **Modal Not Showing**: Verify `useCallSocket` hook is properly initialized
3. **Socket Errors**: Check socket connection status and event listeners

### Debug Logs
The system includes comprehensive logging:
- `📞` - Call-related events
- `✅` - Successful call actions
- `❌` - Call rejections/errors
- `⏰` - Call timeouts

## Testing

To test the call system:
1. Open the app in two different browser tabs/windows
2. Log in as different users
3. Click the video/voice call button from one user to another
4. Verify the incoming call modal appears for the recipient
5. Test accept/reject functionality
6. Check audio notifications work properly