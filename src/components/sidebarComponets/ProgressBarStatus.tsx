import React, { useEffect, useState, useRef, useCallback } from 'react';

interface StoryProgressBarProps {
  segments: number;
  currentIndex: number;
  duration: number;
  isPaused: boolean;
  onComplete: () => void;
  onSegmentComplete?: (index: number) => void;
}

const StoryProgressBar: React.FC<StoryProgressBarProps> = ({
  segments,
  currentIndex,
  duration,
  isPaused,
  onComplete,
  onSegmentComplete
}) => {
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const totalPausedTimeRef = useRef<number>(0);
 const animationFrameRef = useRef<number | undefined>(undefined);

  // Reset progress when segment changes
  useEffect(() => {
    setProgress(0);
    startTimeRef.current = Date.now();
    pausedTimeRef.current = 0;
    totalPausedTimeRef.current = 0;
  }, [currentIndex]);

  // Handle pause/resume
  useEffect(() => {
    if (isPaused) {
      pausedTimeRef.current = Date.now();
    } else if (pausedTimeRef.current > 0) {
      const pauseDuration = Date.now() - pausedTimeRef.current;
      totalPausedTimeRef.current += pauseDuration;
      pausedTimeRef.current = 0;
    }
  }, [isPaused]);

  const updateProgress = useCallback(() => {
    if (isPaused) return;

    const now = Date.now();
    const elapsed = now - startTimeRef.current - totalPausedTimeRef.current;
    const newProgress = Math.min((elapsed / duration) * 100, 100);
    
    setProgress(newProgress);

    if (newProgress >= 100) {
      if (onSegmentComplete) {
        onSegmentComplete(currentIndex);
      }
      
      if (currentIndex === segments - 1) {
        onComplete();
      }
      return;
    }

    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [isPaused, duration, currentIndex, segments, onComplete, onSegmentComplete]);

  useEffect(() => {
    if (!isPaused) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateProgress, isPaused]);

  return (
 <div className="flex space-x-1 px-4 py-2">
  {Array.from({ length: segments }).map((_, index) => (
    <div
      key={index}
      className="h-1 flex-1 rounded-full bg-gray-400 dark:bg-gray-700 overflow-hidden"
    >
      <div
        className="h-full bg-white rounded-full"
        style={{
          width: 
            index < currentIndex 
              ? '100%' 
              : index === currentIndex 
              ? `${progress}%` 
              : '0%'
        }}
      />
    </div>
  ))}
</div>
  );
};

export default StoryProgressBar;