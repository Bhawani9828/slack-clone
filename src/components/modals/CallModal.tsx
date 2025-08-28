"use client";

import { useEffect, useRef, useState } from "react";
import { X, Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { resumeAudioContext, playRingtone, stopRingtone } from "@/lib/audioUtils";

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
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isMobile = isAndroid || isIOS;
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const ringtoneSoundRef = useRef<HTMLAudioElement>(null);
  
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showError, setShowError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const [audioContextReady, setAudioContextReady] = useState(false);
  
  const callStartTimeRef = useRef<number | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const vibrationPatternRef = useRef<NodeJS.Timeout | null>(null);

  // Device detection
 

  // Initialize audio context on first user interaction
  const initializeAudio = async () => {
    try {
      await resumeAudioContext();
      setAudioContextReady(true);
      console.log("Audio context initialized for call modal");
    } catch (error) {
      console.warn("Failed to initialize audio context:", error);
      setAutoplayBlocked(true);
    }
  };

  // Setup video streams with error handling
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      try {
        localVideoRef.current.srcObject = localStream;
        // Ensure video plays on mobile devices
        if (isMobile) {
          localVideoRef.current.playsInline = true;
          localVideoRef.current.muted = true;
          localVideoRef.current.autoplay = true;
        }
        console.log('📹 Local video stream attached');
      } catch (error) {
        console.warn('Error attaching local video stream:', error);
      }
    }
  }, [localStream, isMobile]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      try {
        remoteVideoRef.current.srcObject = remoteStream;
        if (isMobile) {
          remoteVideoRef.current.playsInline = true;
          remoteVideoRef.current.autoplay = true;
        }
        console.log('📹 Remote video stream attached');
      } catch (error) {
        console.warn('Error attaching remote video stream:', error);
      }
    }
  }, [remoteStream, isMobile]);

  // Enhanced audio stream handling for all devices
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      try {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.volume = isSpeakerOn ? 1.0 : 0.8;
        
        // Special handling for mobile devices
        if (isMobile) {
          remoteAudioRef.current.autoplay = true;
          remoteAudioRef.current.muted = false; 
        remoteAudioRef.current.controls = false;
        }
        
        // Try to play audio
        const playAudio = async () => {
          try {
            if (remoteAudioRef.current) {
              await remoteAudioRef.current.play();
              console.log('🔊 Remote audio playing');
            }
          } catch (error) {
            console.warn('Autoplay blocked for remote audio:', error);
          }
        };
        
        playAudio();
        
        console.log('🔊 Remote audio stream attached');
      } catch (error) {
        console.warn('Error attaching remote audio stream:', error);
      }
    }
  }, [remoteStream, isSpeakerOn, isMobile]);

  // Enhanced ringtone management with better mobile support
  useEffect(() => {
    const manageRingtone = async () => {
      if (isIncoming && !isInCall && open && incomingCall) {
        setIsRinging(true);
        console.log('📞 Starting ringtone for incoming call');
        
        // Initialize audio context if not ready
        if (!audioContextReady) {
          await initializeAudio();
        }
        
        try {
          // Use the enhanced audio utils ringtone
          await playRingtone();
          
          // For mobile devices, also use vibration
          if (isMobile && 'vibrate' in navigator) {
            const vibratePattern = [1000, 500, 1000, 500, 1000, 500];
           if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
  navigator.vibrate(vibratePattern);
}
            
            // Repeat vibration pattern
            vibrationPatternRef.current = setInterval(() => {
              if (isRinging) {
                if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
  navigator.vibrate(vibratePattern);
}
              }
            }, 4000);
          }
          
          // HTML5 Audio fallback
          if (ringtoneSoundRef.current) {
            ringtoneSoundRef.current.volume = 0.7;
            ringtoneSoundRef.current.currentTime = 0;
            
            try {
              await ringtoneSoundRef.current.play();
              console.log('📞 HTML5 ringtone playing');
            } catch (error) {
              console.warn('HTML5 ringtone autoplay blocked:', error);
              setAutoplayBlocked(true);
            }
          }
          
        } catch (error) {
          console.warn('⚠️ Ringtone failed:', error);
          setAutoplayBlocked(true);
        }
      } else {
        setIsRinging(false);
        console.log('📞 Stopping ringtone');
        
        // Stop all ringtone sources
        stopRingtone();
        
        if (ringtoneSoundRef.current) {
          ringtoneSoundRef.current.pause();
          ringtoneSoundRef.current.currentTime = 0;
        }
        
        
        // Stop vibration
     if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
  navigator.vibrate(0);
}
        
        if (vibrationPatternRef.current) {
          clearInterval(vibrationPatternRef.current);
          vibrationPatternRef.current = null;
        }
        
        if (ringtoneIntervalRef.current) {
          clearInterval(ringtoneIntervalRef.current);
          ringtoneIntervalRef.current = null;
        }
      }
    };

    manageRingtone();

    // Cleanup function
    return () => {
      stopRingtone();
      if (ringtoneSoundRef.current) {
        ringtoneSoundRef.current.pause();
        ringtoneSoundRef.current.currentTime = 0;
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
      if (vibrationPatternRef.current) {
        clearInterval(vibrationPatternRef.current);
      }
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
      }
    };
  }, [isIncoming, isInCall, open, incomingCall, audioContextReady, isRinging, isMobile]);

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

  // Enhanced error handling
  useEffect(() => {
    if (callError) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [callError]);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Enhanced accept call handler
  const handleAcceptCall = async () => {
    try {
      setShowError(false);
      setIsRinging(false);
      setAutoplayBlocked(false);
      
      // Stop all ringtone sources
      stopRingtone();
      if (ringtoneSoundRef.current) {
        ringtoneSoundRef.current.pause();
        ringtoneSoundRef.current.currentTime = 0;
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
      
      // Initialize audio context
      await initializeAudio();
      
      await onAccept();
    } catch (error) {
      console.error('Error accepting call:', error);
      setShowError(true);
    }
  };

  // Enhanced reject call handler
  const handleRejectCall = () => {
    setIsRinging(false);
    
    // Stop all ringtone sources
    stopRingtone();
    if (ringtoneSoundRef.current) {
      ringtoneSoundRef.current.pause();
      ringtoneSoundRef.current.currentTime = 0;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
    
    onReject();
  };

  // Handle manual audio activation for blocked autoplay
  const handleEnableAudio = async () => {
    try {
      setAutoplayBlocked(false);
      await initializeAudio();
      
      if (isRinging && ringtoneSoundRef.current) {
        await ringtoneSoundRef.current.play();
      }
    } catch (error) {
      console.warn('Failed to enable audio manually:', error);
    }
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return;
      
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Failed to enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.warn('Failed to exit fullscreen:', err);
      });
    }
    setIsFullscreen(!isFullscreen);
  };

  const isVideoCall = incomingCall?.type === 'video' || (localStream && localStream.getVideoTracks().length > 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 backdrop-blur-sm">
      {/* Hidden audio elements */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        className="hidden"
      />
      
      {/* Enhanced ringtone with multiple sources for better compatibility */}
      <audio
        ref={ringtoneSoundRef}
        loop
        preload="auto"
        className="hidden"
      >
        {/* Base64 encoded ringtone for maximum compatibility */}
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dys2spBj2Y3u++dScELIHO8tiINwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dys2spBj2Y3u++dScE" type="audio/wav" />
        {/* Fallback sources */}
        <source src="/sounds/ringtone.mp3" type="audio/mpeg" />
        <source src="/sounds/ringtone.ogg" type="audio/ogg" />
      </audio>
      
      <div className={`bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl ${
        isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[600px] mx-4'
      } relative overflow-hidden transition-all duration-300`}>
        
        {/* Enhanced Header Bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                isRinging ? 'bg-red-500 animate-ping' : 
                isInCall ? 'bg-green-500 animate-pulse' : 
                'bg-yellow-500 animate-pulse'
              }`}></div>
              <div className="text-white">
                <h2 className="text-lg font-semibold">
                  {isIncoming ? (isRinging ? 'Incoming Call' : 'Incoming Call') : 
                   isInCall ? 'Connected' : 'Calling...'}
                </h2>
                <p className="text-sm text-gray-300">{callerName}</p>
                {deviceStatus?.checking && (
                  <p className="text-xs text-blue-400">Checking devices...</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isInCall && (
                <div className="bg-black/40 px-3 py-1 rounded-full backdrop-blur">
                  <p className="text-white text-sm font-mono">
                    {formatDuration(callDuration)}
                  </p>
                </div>
              )}
              
              {isVideoCall && (
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-all transform hover:scale-105"
                  title="Toggle fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={onClose}
                disabled={isInCall && !!remoteStream}
                className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Error Banner */}
        {showError && callError && (
          <div className="absolute top-20 left-4 right-4 bg-red-500/90 backdrop-blur-sm text-white p-4 rounded-lg z-20 shadow-lg border border-red-400/30">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium flex items-center">
                  <span className="w-2 h-2 bg-red-300 rounded-full mr-2 animate-pulse"></span>
                  Connection Error
                </p>
                <p className="text-sm mt-1 opacity-90">{callError}</p>
                {isAndroid && (
                  <p className="text-xs mt-2 opacity-75">
                    Android detected - Make sure permissions are granted
                  </p>
                )}
              </div>
              <button 
                onClick={() => setShowError(false)}
                className="text-white/80 hover:text-white ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="h-full flex flex-col pt-20 pb-6">
          {/* Enhanced Video/Avatar Area */}
          <div className="flex-1 relative">
            {isVideoCall ? (
              // Enhanced Video Call Layout
              <div className="w-full h-full relative bg-black rounded-lg overflow-hidden mx-4 shadow-inner">
                {/* Remote Video (Main) */}
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    onLoadedMetadata={() => console.log('Remote video metadata loaded')}
                    onError={(e) => console.warn('Remote video error:', e)}
                  />
                ) : (
                  // Enhanced placeholder with animations
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-600/10 animate-pulse"></div>
                    <div className="text-center relative z-10">
                      {callerAvatar ? (
                        <img 
                          src={callerAvatar} 
                          alt={callerName}
                          className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-white/20 shadow-2xl"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 border-4 border-white/20 shadow-2xl">
                          <span className="text-4xl text-white font-bold">
                            {callerName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <p className="text-white text-xl font-medium">{callerName}</p>
                      <p className="text-gray-300 text-sm mt-2">
                        {isIncoming ? (isRinging ? 'Ringing...' : 'Video calling...') : 'Connecting...'}
                      </p>
                      {isRinging && (
                        <div className="mt-4 flex justify-center space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Enhanced Local Video (Picture-in-Picture) */}
                {localStream && (
                  <div className="absolute top-4 right-4 w-40 h-30 bg-gray-800 rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl backdrop-blur-sm">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      onLoadedMetadata={() => console.log('Local video metadata loaded')}
                      onError={(e) => console.warn('Local video error:', e)}
                    />
                    {!isVideoOn && (
                      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <VideoOff className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-1 left-1 text-xs text-white/80 bg-black/50 px-1 rounded">
                      You
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Enhanced Audio Call Layout
              <div className="w-full h-full flex items-center justify-center px-4 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-teal-600/10 animate-pulse"></div>
                <div className="text-center relative z-10">
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
                  <p className="text-gray-400 text-lg mb-4">
                    {isIncoming ? (isRinging ? 'Ringing...' : 'Audio calling...') : isInCall ? 'Connected' : 'Connecting...'}
                  </p>
                  
                  {isInCall && (
                    <div className="flex items-center justify-center space-x-3 mt-6">
                      <div className="flex space-x-1">
                        <div className="w-1 h-8 bg-green-500 rounded animate-pulse"></div>
                        <div className="w-1 h-6 bg-green-400 rounded animate-pulse" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-1 h-10 bg-green-500 rounded animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-1 h-7 bg-green-400 rounded animate-pulse" style={{animationDelay: '0.3s'}}></div>
                        <div className="w-1 h-9 bg-green-500 rounded animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                      <p className="text-green-400 text-sm ml-3">Call in progress</p>
                    </div>
                  )}
                  
                  {isRinging && (
                    <div className="mt-6 flex justify-center space-x-2">
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Control Buttons */}
          <div className="px-8 pt-6">
            <div className="flex justify-center items-center space-x-4">
              {isIncoming ? (
                // Enhanced incoming call buttons
                <div className="flex space-x-8">
                  <button
                    onClick={handleRejectCall}
                    className={`w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-2xl flex items-center justify-center ${
                      isRinging ? 'animate-pulse shadow-red-500/50' : ''
                    }`}
                    title="Decline"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                  
                  <button
                    onClick={handleAcceptCall}
                    disabled={deviceStatus?.checking}
                    className={`w-16 h-16 bg-green-500 hover:bg-green-600 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95 shadow-2xl flex items-center justify-center ${
                      isRinging ? 'animate-bounce shadow-green-500/50' : ''
                    }`}
                    title="Accept"
                  >
                    {deviceStatus?.checking ? (
                      <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Phone className="w-7 h-7" />
                    )}
                  </button>
                </div>
              ) : (
                // Enhanced in-call controls
                <div className="flex items-center space-x-3">
                  {/* Microphone Toggle */}
                  <button
                    onClick={onToggleMic}
                    disabled={!localStream}
                    className={`w-12 h-12 rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center ${
                      isMicOn 
                        ? 'bg-gray-700/80 hover:bg-gray-600 text-white backdrop-blur' 
                        : 'bg-red-500/90 hover:bg-red-600 text-white shadow-red-500/30'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={isMicOn ? 'Mute' : 'Unmute'}
                  >
                    {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>

                  {/* Video Toggle (only for video calls) */}
                  {isVideoCall && (
                    <button
                      onClick={onToggleVideo}
                      disabled={!localStream}
                      className={`w-12 h-12 rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center ${
                        isVideoOn 
                          ? 'bg-gray-700/80 hover:bg-gray-600 text-white backdrop-blur' 
                          : 'bg-red-500/90 hover:bg-red-600 text-white shadow-red-500/30'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                    >
                      {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    </button>
                  )}

                  {/* Speaker Toggle */}
                  <button
                    onClick={onToggleSpeaker}
                    className={`w-12 h-12 rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center ${
                      isSpeakerOn 
                        ? 'bg-blue-500/90 hover:bg-blue-600 text-white shadow-blue-500/30' 
                        : 'bg-gray-700/80 hover:bg-gray-600 text-white backdrop-blur'
                    }`}
                    title={isSpeakerOn ? 'Speaker on' : 'Speaker off'}
                  >
                    {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>

                  {/* End Call */}
                  <button
                    onClick={onEndCall}
                    className="w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-2xl shadow-red-500/30 flex items-center justify-center ml-4"
                    title="End Call"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>

            {/* Enhanced Device Status Info */}
            {deviceStatus && !deviceStatus.checking && (isIncoming || isInCall) && (
              <div className="mt-4 flex justify-center">
                <div className="bg-black/30 backdrop-blur rounded-lg px-4 py-2 border border-white/10">
                  <div className="flex items-center space-x-4 text-xs">
                    <div className={`flex items-center space-x-1 ${deviceStatus.camera ? 'text-green-400' : 'text-red-400'}`}>
                      <Video className="w-3 h-3" />
                      <span>Camera {deviceStatus.camera ? '✓' : '✗'}</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${deviceStatus.microphone ? 'text-green-400' : 'text-red-400'}`}>
                      <Mic className="w-3 h-3" />
                      <span>Mic {deviceStatus.microphone ? '✓' : '✗'}</span>
                    </div>
                    {isMobile && (
                      <div className="text-blue-400">
                        <span>Mobile</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Action Buttons */}
            <div className="mt-4 flex justify-center space-x-3">
              {/* Retry button for errors */}
              {callError && !isInCall && (
                <button 
                  onClick={handleAcceptCall} 
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
                >
                  Retry Connection
                </button>
              )}

              {/* Enable sound button for autoplay blocked */}
              {autoplayBlocked && (
                <button
                  onClick={handleEnableAudio}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
                >
                  Enable Sound
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Device checking overlay */}
        {deviceStatus?.checking && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur flex items-center justify-center z-30">
            <div className="text-center text-white">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg font-medium">Checking devices...</p>
              <p className="text-sm text-gray-300 mt-2">Please allow camera and microphone access</p>
              {isAndroid && (
                <p className="text-xs text-blue-400 mt-2">Android detected - This may take a moment</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}