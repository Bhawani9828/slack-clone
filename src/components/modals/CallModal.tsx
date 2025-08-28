import { useEffect, useRef, useState } from 'react';
import { X, Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Maximize2 } from 'lucide-react';

interface CallModalProps {
  open: boolean;
  onClose: () => void;
  incomingCall?: {
    from: string;
    type: 'video' | 'audio';
    offer: any;
    fromName?: string;
    callId?: string;
  } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isIncoming: boolean;
  isInCall: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEndCall: () => void;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
  isMicOn: boolean;
  isVideoOn: boolean;
  isSpeakerOn: boolean;
  callerName: string;
  callerAvatar?: string;
  callError?: string | null;
  deviceStatus?: {
    camera: boolean;
    microphone: boolean;
    checking: boolean;
  };
}

export default function CallModal({
  open,
  onClose,
  incomingCall,
  localStream,
  remoteStream,
  isIncoming,
  isInCall,
  onAccept,
  onReject,
  onEndCall,
  onToggleMic,
  onToggleVideo,
  onToggleSpeaker,
  isMicOn,
  isVideoOn,
  isSpeakerOn,
  callerName,
  callerAvatar,
  callError,
  deviceStatus,
}: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [showError, setShowError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const callStartTimeRef = useRef<number | null>(null);

  // Setup video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      console.log('📹 Local video stream attached');
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      console.log('📹 Remote video stream attached');
    }
  }, [remoteStream]);

  // Setup audio stream for audio calls - This fixes the audio issue
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.volume = isSpeakerOn ? 1.0 : 0.8;
      console.log('🔊 Remote audio stream attached');
    }
  }, [remoteStream, isSpeakerOn]);

  // Ringtone management - Fixed with better error handling
  useEffect(() => {
    const manageRingtone = async () => {
      if (isIncoming && !isInCall && open) {
        setIsRinging(true);
        console.log('📞 Starting ringtone');
        
        if (ringtoneRef.current) {
          try {
            // Set volume and play
            ringtoneRef.current.volume = 0.7;
            ringtoneRef.current.currentTime = 0;
            
            const playPromise = ringtoneRef.current.play();
            if (playPromise) {
              await playPromise;
              console.log('📞 Ringtone playing');
            }
          } catch (error) {
            console.warn('⚠️ Ringtone autoplay blocked:', error);
            // Fallback: try to play with user interaction
          }
        }
      } else {
        setIsRinging(false);
        console.log('📞 Stopping ringtone');
        
        if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
        }
      }
    };

    manageRingtone();

    // Cleanup
    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    };
  }, [isIncoming, isInCall, open]);

  // Call duration timer
  useEffect(() => {
    if (isInCall && !callStartTimeRef.current) {
      callStartTimeRef.current = Date.now();
    }

    if (!isInCall) {
      callStartTimeRef.current = null;
      setCallDuration(0);
      return;
    }

    const interval = setInterval(() => {
      if (callStartTimeRef.current) {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isInCall]);

  // Show error handling
  useEffect(() => {
    if (callError) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [callError]);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAcceptCall = async () => {
    try {
      setShowError(false);
      setIsRinging(false);
      // Stop ringtone when accepting call
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      await onAccept();
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  };

  const handleRejectCall = () => {
    setIsRinging(false);
    // Stop ringtone when rejecting call
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    onReject();
  };

  const isVideoCall = incomingCall?.type === 'video' || (localStream && localStream.getVideoTracks().length > 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      {/* Hidden audio elements */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        className="hidden"
      />
      
      {/* Ringtone audio element with proper ringtone */}
      <audio
        ref={ringtoneRef}
        loop
        preload="auto"
        className="hidden"
        crossOrigin="anonymous"
      >
        {/* Using a proper ringtone URL - you can replace with your own */}
        <source src="https://www.soundjay.com/misc/sounds/bell-ringing-05.wav" type="audio/wav" />
        {/* Fallback ringtone */}
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dys2spBj2Y3u++dScELIHO8tiINwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dys2spBj2Y3u++dScELI=" type="audio/wav" />
      </audio>
      
      <div className={`bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl ${
        isFullscreen ? 'w-full h-full' : 'w-full max-w-5xl h-[600px]'
      } relative overflow-hidden`}>
        
        {/* Header Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-4 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${isRinging ? 'bg-red-500 animate-ping' : 'bg-green-500 animate-pulse'}`}></div>
              <div className="text-white">
                <h2 className="text-lg font-semibold">
                  {isIncoming ? (isRinging ? 'Incoming Call 📞' : 'Incoming Call') : isInCall ? 'Connected' : 'Calling...'}
                </h2>
                <p className="text-sm text-gray-300">{callerName}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isInCall && (
                <div className="bg-black/30 px-3 py-1 rounded-full">
                  <p className="text-white text-sm font-mono">
                    {formatDuration(callDuration)}
                  </p>
                </div>
              )}
              
              {isVideoCall && (
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={onClose}
                disabled={isInCall && !!remoteStream}
                className="p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {showError && callError && (
          <div className="absolute top-20 left-4 right-4 bg-red-500/90 backdrop-blur text-white p-4 rounded-lg z-20">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">Connection Error</p>
                <p className="text-sm mt-1 opacity-90">{callError}</p>
              </div>
              <button 
                onClick={() => setShowError(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="h-full flex flex-col pt-20 pb-6">
          {/* Video/Avatar Area */}
          <div className="flex-1 relative">
            {isVideoCall ? (
              // Video Call Layout
              <div className="w-full h-full relative bg-black rounded-lg overflow-hidden mx-4">
                {/* Remote Video (Main) */}
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // Placeholder when no remote stream
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <div className="text-center">
                      {callerAvatar ? (
                        <img 
                          src={callerAvatar} 
                          alt={callerName}
                          className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white/20"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 border-4 border-white/20">
                          <span className="text-4xl text-white font-bold">
                            {callerName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <p className="text-white text-xl font-medium">{callerName}</p>
                      <p className="text-gray-300 text-sm mt-2">
                        {isIncoming ? (isRinging ? '📞 Ringing...' : 'Video calling...') : 'Connecting...'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Local Video (Picture-in-Picture) */}
                {localStream && (
                  <div className="absolute top-4 right-4 w-40 h-30 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20 shadow-lg">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {!isVideoOn && (
                      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <VideoOff className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Audio Call Layout
              <div className="w-full h-full flex items-center justify-center px-4">
                <div className="text-center">
                  {callerAvatar ? (
                    <img 
                      src={callerAvatar} 
                      alt={callerName}
                      className="w-48 h-48 rounded-full mx-auto mb-6 border-8 border-white/10 shadow-2xl"
                    />
                  ) : (
                    <div className="w-48 h-48 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center mx-auto mb-6 border-8 border-white/10 shadow-2xl">
                      <span className="text-6xl text-white font-bold">
                        {callerName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <p className="text-white text-3xl font-medium mb-2">{callerName}</p>
                  <p className="text-gray-400 text-lg">
                    {isIncoming ? (isRinging ? '📞 Ringing...' : 'Audio calling...') : isInCall ? 'Connected' : 'Connecting...'}
                  </p>
                  {isInCall && (
                    <div className="mt-4 flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <p className="text-green-400 text-sm">Call in progress</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="px-8 pt-6">
            <div className="flex justify-center items-center space-x-4">
              {isIncoming ? (
                // Incoming call buttons
                <div className="flex space-x-8">
                  <button
                    onClick={handleRejectCall}
                    className={`w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all transform hover:scale-105 shadow-lg flex items-center justify-center ${isRinging ? 'animate-pulse' : ''}`}
                    title="Decline"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                  
                  <button
                    onClick={handleAcceptCall}
                    disabled={deviceStatus?.checking}
                    className={`w-16 h-16 bg-green-500 hover:bg-green-600 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-full transition-all transform hover:scale-105 shadow-lg flex items-center justify-center ${isRinging ? 'animate-bounce' : ''}`}
                    title="Accept"
                  >
                    <Phone className="w-7 h-7" />
                  </button>
                </div>
              ) : (
                // In-call controls
                <div className="flex items-center space-x-3">
                  {/* Microphone Toggle */}
                  <button
                    onClick={onToggleMic}
                    disabled={!localStream}
                    className={`w-12 h-12 rounded-full transition-all transform hover:scale-105 shadow-lg flex items-center justify-center ${
                      isMicOn 
                        ? 'bg-gray-700/80 hover:bg-gray-600 text-white backdrop-blur' 
                        : 'bg-red-500/90 hover:bg-red-600 text-white'
                    } disabled:opacity-50`}
                    title={isMicOn ? 'Mute' : 'Unmute'}
                  >
                    {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>

                  {/* Video Toggle (only for video calls) */}
                  {isVideoCall && (
                    <button
                      onClick={onToggleVideo}
                      disabled={!localStream}
                      className={`w-12 h-12 rounded-full transition-all transform hover:scale-105 shadow-lg flex items-center justify-center ${
                        isVideoOn 
                          ? 'bg-gray-700/80 hover:bg-gray-600 text-white backdrop-blur' 
                          : 'bg-red-500/90 hover:bg-red-600 text-white'
                      } disabled:opacity-50`}
                      title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                    >
                      {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    </button>
                  )}

                  {/* Speaker Toggle */}
                  <button
                    onClick={onToggleSpeaker}
                    className={`w-12 h-12 rounded-full transition-all transform hover:scale-105 shadow-lg flex items-center justify-center ${
                      isSpeakerOn 
                        ? 'bg-blue-500/90 hover:bg-blue-600 text-white' 
                        : 'bg-gray-700/80 hover:bg-gray-600 text-white backdrop-blur'
                    }`}
                    title={isSpeakerOn ? 'Speaker on' : 'Speaker off'}
                  >
                    {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>

                  {/* End Call */}
                  <button
                    onClick={onEndCall}
                    className="w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all transform hover:scale-105 shadow-lg flex items-center justify-center ml-4"
                    title="End Call"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>

            {/* Device Status Info */}
            {deviceStatus && !deviceStatus.checking && (
              <div className="mt-4 flex justify-center">
                <div className="bg-black/30 backdrop-blur rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-4 text-xs">
                    <div className={`flex items-center space-x-1 ${deviceStatus.camera ? 'text-green-400' : 'text-red-400'}`}>
                      <Video className="w-3 h-3" />
                      <span>Camera {deviceStatus.camera ? '✓' : '✗'}</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${deviceStatus.microphone ? 'text-green-400' : 'text-red-400'}`}>
                      <Mic className="w-3 h-3" />
                      <span>Mic {deviceStatus.microphone ? '✓' : '✗'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Retry button for errors */}
            {callError && !isInCall && (
              <div className="mt-4 text-center">
                <button 
                  onClick={handleAcceptCall} 
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Device checking overlay */}
        {deviceStatus?.checking && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-30">
            <div className="text-center text-white">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg">Checking devices...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}