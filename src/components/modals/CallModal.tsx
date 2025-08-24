import { useEffect, useRef, useState } from 'react';
import { X, Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react';

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
  const [callDuration, setCallDuration] = useState(0);
  const [showError, setShowError] = useState(false);
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
      await onAccept();
    } catch (error) {
      console.error('Error accepting call:', error);
      // Error will be shown via callError prop
    }
  };

  const isVideoCall = incomingCall?.type === 'video' || (localStream && localStream.getVideoTracks().length > 0);

  console.log('📱 CallModal State:', {
    open,
    isIncoming,
    isInCall,
    hasLocalStream: !!localStream,
    hasRemoteStream: !!remoteStream,
    isVideoCall,
    callerName,
    callError
  });

  if (!open) return null;



  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-4xl h-96 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isInCall && !!remoteStream} // Don't allow closing during active call
          className="absolute top-4 right-4 text-gray-400 hover:text-white z-10 disabled:opacity-50"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Error Banner */}
        {showError && callError && (
          <div className="absolute top-4 left-4 right-16 bg-red-600 text-white p-3 rounded-lg z-10">
            <p className="text-sm font-medium">Call Error</p>
            <p className="text-xs mt-1">{callError}</p>
            <button 
              onClick={() => setShowError(false)}
              className="absolute top-2 right-2 text-white hover:text-red-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Device Status */}
        {deviceStatus?.checking && (
          <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-2 rounded-lg z-10">
            <p className="text-sm">Checking devices...</p>
          </div>
        )}

        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="text-center mb-4">
            <h2 className="text-white text-xl font-semibold">
              {isIncoming ? 'Incoming Call' : isInCall ? 'In Call' : 'Calling...'}
            </h2>
            <p className="text-gray-300">{callerName}</p>
            {isInCall && (
              <p className="text-gray-400 text-sm mt-1">
                {formatDuration(callDuration)}
              </p>
            )}
          </div>

          {/* Video Area */}
          <div className="flex-1 relative bg-gray-800 rounded-lg overflow-hidden mb-4">
            {isVideoCall ? (
              <>
                {/* Remote Video (Main) */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Local Video (Picture-in-Picture) */}
                <div className="absolute top-4 right-4 w-32 h-24 bg-gray-700 rounded-lg overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* No remote stream placeholder */}
                {!remoteStream && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      {callerAvatar ? (
                        <img 
                          src={callerAvatar} 
                          alt={callerName}
                          className="w-24 h-24 rounded-full mx-auto mb-4"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl text-white font-bold">
                            {callerName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <p className="text-white text-lg">{callerName}</p>
                      <p className="text-gray-400">
                        {isIncoming ? 'Video calling...' : 'Connecting...'}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Audio Call Layout
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  {callerAvatar ? (
                    <img 
                      src={callerAvatar} 
                      alt={callerName}
                      className="w-32 h-32 rounded-full mx-auto mb-4"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-600 flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl text-white font-bold">
                        {callerName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <p className="text-white text-xl">{callerName}</p>
                  <p className="text-gray-400">
                    {isIncoming ? 'Audio calling...' : 'Connecting...'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center items-center space-x-6">
            {isIncoming ? (
              // Incoming call buttons
              <>
                <button
                  onClick={onReject}
                  className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full transition-colors"
                  title="Reject Call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
                
                <button
                  onClick={handleAcceptCall}
                  disabled={deviceStatus?.checking}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white p-4 rounded-full transition-colors"
                  title="Accept Call"
                >
                  <Phone className="w-6 h-6" />
                </button>
              </>
            ) : (
              // In-call or outgoing call buttons
              <>
                {/* Microphone Toggle */}
                <button
                  onClick={onToggleMic}
                  disabled={!localStream}
                  className={`p-3 rounded-full transition-colors ${
                    isMicOn 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
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
                    className={`p-3 rounded-full transition-colors ${
                      isVideoOn 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    } disabled:opacity-50`}
                    title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                  >
                    {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                )}

                {/* Speaker Toggle */}
                <button
                  onClick={onToggleSpeaker}
                  className={`p-3 rounded-full transition-colors ${
                    isSpeakerOn 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
                  title={isSpeakerOn ? 'Speaker on' : 'Speaker off'}
                >
                  <Volume2 className="w-5 h-5" />
                </button>

                {/* End Call */}
                <button
                  onClick={onEndCall}
                  className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full transition-colors"
                  title="End Call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              
              </>
            )}
          </div>

{callError && (
  <div className="text-red-600 mt-2">
    <p>{callError}</p>
    <button onClick={handleAcceptCall} className="mt-2 px-4 py-2 bg-green-600 text-white rounded">
      Retry
    </button>
  </div>
)}
          {/* Device Status Info */}
          {deviceStatus && !deviceStatus.checking && (
            <div className="mt-4 text-center">
              <div className="flex justify-center space-x-4 text-sm text-gray-400">
                <span className={deviceStatus.camera ? 'text-green-400' : 'text-red-400'}>
                  Camera: {deviceStatus.camera ? 'Available' : 'Not found'}
                </span>
                <span className={deviceStatus.microphone ? 'text-green-400' : 'text-red-400'}>
                  Microphone: {deviceStatus.microphone ? 'Available' : 'Not found'}
                </span>
               <button onClick={handleAcceptCall}>Retry</button>
              </div>
            </div>
          )}

          {/* Debug Info (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-xs text-gray-500 text-center">
              Local: {localStream ? '✅' : '❌'} | Remote: {remoteStream ? '✅' : '❌'} | 
              In Call: {isInCall ? '✅' : '❌'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}