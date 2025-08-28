// Enhanced audio utilities with Android 11+ support and better ringtone handling

let incomingCallAudio: HTMLAudioElement | null = null;
let ringtoneAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let wakeLock: any = null;

// Device compatibility detection
const isAndroid = /Android/i.test(navigator.userAgent);
const androidVersion = isAndroid ? parseFloat(navigator.userAgent.match(/Android (\d+\.?\d*)/)?.[1] || '0') : 0;
const isLegacyAndroid = androidVersion > 0 && androidVersion < 11;

// Initialize audio with compatibility checks
export const initCallAudio = async () => {
  try {
    console.log(`🎵 Initializing audio for ${isAndroid ? `Android ${androidVersion}` : 'other platform'}`);
    
    // Request wake lock for Android to prevent screen sleep during calls
    if ('wakeLock' in navigator && isAndroid) {
      try {
        wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('🔒 Wake lock acquired for Android');
      } catch (e) {
        console.warn('Could not acquire wake lock:', e);
      }
    }

    // Initialize AudioContext with user interaction
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
        if (audioContext.state === 'suspended') {
          console.log('🎵 AudioContext suspended, will resume on user interaction');
        }
      }
    }

    // Create multiple audio elements for better compatibility
    await createAudioElements();
    
    console.log('🎵 Call audio initialized successfully');
    return true;
  } catch (error) {
    console.warn('Could not initialize call audio:', error);
    return false;
  }
};

// Create audio elements with fallbacks
const createAudioElements = async () => {
  try {
    // Create incoming call audio with multiple sources
    incomingCallAudio = new Audio();
    incomingCallAudio.loop = true;
    incomingCallAudio.volume = 0.7;
    incomingCallAudio.preload = 'auto';
    
    // Add multiple format sources for better compatibility
    const incomingCallSources = [
      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dys2spBj2Y3u++dScELIHO8tiINwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dys2spBj2Y3u++dScE',
      '/sounds/incoming-call.mp3',
      '/sounds/incoming-call.ogg'
    ];

    // Try to load the first available source
    for (const src of incomingCallSources) {
      try {
        incomingCallAudio.src = src;
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Load timeout')), 3000);
          incomingCallAudio!.addEventListener('canplaythrough', () => {
            clearTimeout(timeout);
            resolve(true);
          }, { once: true });
          incomingCallAudio!.addEventListener('error', reject, { once: true });
        });
        console.log('🎵 Loaded incoming call audio from:', src);
        break;
      } catch (e) {
        console.warn('Failed to load audio from:', src, e);
        continue;
      }
    }

    // Create ringtone audio
    ringtoneAudio = new Audio();
    ringtoneAudio.loop = true;
    ringtoneAudio.volume = 0.8;
    ringtoneAudio.preload = 'auto';
    
    const ringtoneSources = [
      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dys2spBj2Y3u++dScELIHO8tiINwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dys2spBj2Y3u++dScE',
      '/sounds/ringtone.mp3',
      '/sounds/ringtone.ogg'
    ];

    for (const src of ringtoneSources) {
      try {
        ringtoneAudio.src = src;
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Load timeout')), 3000);
          ringtoneAudio!.addEventListener('canplaythrough', () => {
            clearTimeout(timeout);
            resolve(true);
          }, { once: true });
          ringtoneAudio!.addEventListener('error', reject, { once: true });
        });
        console.log('🎵 Loaded ringtone audio from:', src);
        break;
      } catch (e) {
        console.warn('Failed to load ringtone from:', src, e);
        continue;
      }
    }

  } catch (error) {
    console.warn('Error creating audio elements:', error);
  }
};

// Resume audio context on user interaction
export const resumeAudioContext = async () => {
  if (audioContext && audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
      console.log('🎵 AudioContext resumed');
      return true;
    } catch (error) {
      console.warn('Failed to resume AudioContext:', error);
      return false;
    }
  }
  return true;
};

// Enhanced play incoming call sound with fallbacks
export const playIncomingCallSound = async () => {
  try {
    console.log('📞 Playing incoming call sound...');
    
    // Resume audio context if needed
    await resumeAudioContext();
    
    // Try HTML5 audio first
    if (incomingCallAudio) {
      try {
        incomingCallAudio.currentTime = 0;
        
        // For Android, set additional properties
        if (isAndroid) {
          incomingCallAudio.muted = false;
          incomingCallAudio.volume = 1.0;
        }
        
        const playPromise = incomingCallAudio.play();
        if (playPromise) {
          await playPromise;
          console.log('🎵 Playing incoming call sound via HTML5 Audio');
          return true;
        }
      } catch (error) {
        console.warn('HTML5 audio failed:', error);
      }
    }
    
    // Fallback to Web Audio API
    await createFallbackRingtone();
    return true;
    
  } catch (error) {
    console.warn('Error playing incoming call sound:', error);
    // Last resort: vibration for Android
    if (isAndroid && 'vibrate' in navigator) {
      navigator.vibrate([1000, 500, 1000, 500, 1000]);
      console.log('📳 Using vibration as audio fallback');
    }
    return false;
  }
};

// Enhanced fallback ringtone with Web Audio API
export const createFallbackRingtone = async () => {
  try {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported');
      }
      audioContext = new AudioContextClass();
    }
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Create a more pleasant ringtone pattern
    const createTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext!.createOscillator();
      const gainNode = audioContext!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext!.destination);
      
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + duration - 0.1);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
      
      return { oscillator, gainNode };
    };
    
    // Create ringtone pattern
    const currentTime = audioContext.currentTime;
    const pattern = [
      { freq: 800, start: 0, duration: 0.3 },
      { freq: 1000, start: 0.4, duration: 0.3 },
      { freq: 800, start: 0.8, duration: 0.3 },
      { freq: 1000, start: 1.2, duration: 0.3 }
    ];
    
    pattern.forEach(({ freq, start, duration }) => {
      createTone(freq, currentTime + start, duration);
    });
    
    console.log('🔊 Playing fallback Web Audio ringtone');
    
    // Repeat the pattern
    setTimeout(() => {
      if (incomingCallAudio && !incomingCallAudio.paused) {
        createFallbackRingtone();
      }
    }, 2000);
    
  } catch (error) {
    console.warn('Could not create fallback ringtone:', error);
    // Ultimate fallback: simple beep
    createFallbackBeep();
  }
};

// Simple beep fallback
export const createFallbackBeep = () => {
  try {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    console.log('🔊 Playing simple beep fallback');
  } catch (error) {
    console.warn('Could not create simple beep:', error);
  }
};

// Stop incoming call sound
export const stopIncomingCallSound = () => {
  try {
    if (incomingCallAudio) {
      incomingCallAudio.pause();
      incomingCallAudio.currentTime = 0;
      console.log('🔇 Stopped incoming call sound');
    }
    
    // Stop Web Audio API oscillators by recreating context if needed
    if (audioContext) {
      // Note: Individual oscillators stop automatically, but we can suspend context
      // audioContext.suspend(); // Uncomment if you want to suspend context
    }
    
  } catch (error) {
    console.warn('Error stopping incoming call sound:', error);
  }
};

// Play ringtone during outgoing calls
export const playRingtone = async () => {
  try {
    await resumeAudioContext();
    
    if (ringtoneAudio) {
      ringtoneAudio.currentTime = 0;
      
      if (isAndroid) {
        ringtoneAudio.muted = false;
        ringtoneAudio.volume = 0.9;
      }
      
      const playPromise = ringtoneAudio.play();
      if (playPromise) {
        await playPromise;
        console.log('🎵 Playing ringtone');
      }
    }
  } catch (error) {
    console.warn('Error playing ringtone:', error);
    await createFallbackRingtone();
  }
};

// Stop ringtone
export const stopRingtone = () => {
  try {
    if (ringtoneAudio) {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
      console.log('🔇 Stopped ringtone');
    }
  } catch (error) {
    console.warn('Error stopping ringtone:', error);
  }
};

// Enhanced user media constraints for Android 11+ compatibility
export const getCompatibleMediaConstraints = (isVideo: boolean = false) => {
  const baseConstraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 44100,
      channelCount: 1
    }
  };

  if (isVideo) {
    baseConstraints.video = {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 }
    };

    // For legacy Android, use lower quality
    if (isLegacyAndroid) {
      baseConstraints.video = {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 15, max: 30 }
      };
      
      // Reduce audio quality for older devices
      if (baseConstraints.audio && typeof baseConstraints.audio === 'object') {
        (baseConstraints.audio as any).sampleRate = 22050;
      }
    }
  }

  console.log(`📱 Using ${isLegacyAndroid ? 'legacy Android' : 'modern'} media constraints:`, baseConstraints);
  return baseConstraints;
};

// Check if device supports modern WebRTC features
export const checkWebRTCSupport = () => {
  const support = {
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    RTCPeerConnection: !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection),
    audioContext: !!(window.AudioContext || (window as any).webkitAudioContext),
    wakeLock: 'wakeLock' in navigator,
    vibrate: 'vibrate' in navigator
  };
  
  console.log('🔧 WebRTC support check:', support);
  return support;
};

// Request necessary permissions for Android
export const requestAndroidPermissions = async () => {
  if (!isAndroid) return true;
  
  try {
    // Request microphone permission
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    
    console.log('🎤 Microphone permission granted');
    return true;
  } catch (error) {
    console.warn('❌ Could not get microphone permission:', error);
    return false;
  }
};

// Cleanup with wake lock release
export const cleanupCallAudio = () => {
  try {
    if (incomingCallAudio) {
      incomingCallAudio.pause();
      incomingCallAudio.src = '';
      incomingCallAudio = null;
    }
    
    if (ringtoneAudio) {
      ringtoneAudio.pause();
      ringtoneAudio.src = '';
      ringtoneAudio = null;
    }
    
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }
    
    // Release wake lock
    if (wakeLock) {
      wakeLock.release();
      wakeLock = null;
      console.log('🔓 Wake lock released');
    }
    
    console.log('🧹 Call audio cleaned up');
  } catch (error) {
    console.warn('Error cleaning up call audio:', error);
  }
};

// Initialize on page load with user interaction detection
export const initializeWithUserInteraction = () => {
  const events = ['click', 'touchstart', 'keydown'];
  
  const initHandler = async () => {
    console.log('👆 User interaction detected, initializing audio...');
    await initCallAudio();
    await resumeAudioContext();
    
    // Remove event listeners after initialization
    events.forEach(event => {
      document.removeEventListener(event, initHandler);
    });
  };
  
  events.forEach(event => {
    document.addEventListener(event, initHandler, { once: true });
  });
};

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  initializeWithUserInteraction();
}