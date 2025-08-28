// Audio utilities for call notifications

let incomingCallAudio: HTMLAudioElement | null = null;
let ringtoneAudio: HTMLAudioElement | null = null;

// Initialize audio elements
export const initCallAudio = () => {
  try {
    // Create incoming call notification sound
    incomingCallAudio = new Audio('/sounds/incoming-call.mp3');
    incomingCallAudio.loop = true;
    incomingCallAudio.volume = 0.7;
    
    // Create ringtone sound
    ringtoneAudio = new Audio('/sounds/ringtone.mp3');
    ringtoneAudio.loop = true;
    ringtoneAudio.volume = 0.8;
    
    console.log('🎵 Call audio initialized successfully');
  } catch (error) {
    console.warn('Could not initialize call audio:', error);
  }
};

// Play incoming call sound
export const playIncomingCallSound = () => {
  try {
    if (incomingCallAudio) {
      incomingCallAudio.currentTime = 0;
      incomingCallAudio.play().catch(error => {
        console.warn('Could not play incoming call sound:', error);
        // Fallback: try to create a simple beep sound
        createFallbackBeep();
      });
    } else {
      // Fallback: create a simple beep sound
      createFallbackBeep();
    }
  } catch (error) {
    console.warn('Error playing incoming call sound:', error);
    // Fallback: create a simple beep sound
    createFallbackBeep();
  }
};

// Fallback beep sound using Web Audio API
export const createFallbackBeep = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    console.log('🔊 Playing fallback beep sound');
  } catch (error) {
    console.warn('Could not create fallback beep sound:', error);
  }
};

// Stop incoming call sound
export const stopIncomingCallSound = () => {
  try {
    if (incomingCallAudio) {
      incomingCallAudio.pause();
      incomingCallAudio.currentTime = 0;
    }
  } catch (error) {
    console.warn('Error stopping incoming call sound:', error);
  }
};

// Play ringtone
export const playRingtone = () => {
  try {
    if (ringtoneAudio) {
      ringtoneAudio.currentTime = 0;
      ringtoneAudio.play().catch(error => {
        console.warn('Could not play ringtone:', error);
      });
    }
  } catch (error) {
    console.warn('Error playing ringtone:', error);
  }
};

// Stop ringtone
export const stopRingtone = () => {
  try {
    if (ringtoneAudio) {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
    }
  } catch (error) {
    console.warn('Error stopping ringtone:', error);
  }
};

// Cleanup audio resources
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
  } catch (error) {
    console.warn('Error cleaning up call audio:', error);
  }
};



