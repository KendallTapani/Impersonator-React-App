import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import * as d3 from 'd3'
import { logger, createTimer, trackRender } from '../utils/debug'

// Define the timestamp interface
export interface TimeStamp {
  word: string;
  start: number;
  stop: number;
  selected?: boolean;
}

// Define the selection range interface
export interface SelectionRange {
  startTime: number;
  endTime: number;
  wordCount: number;
  words: TimeStamp[];
  firstSelectedWord: TimeStamp;
}

// Define the component props
export interface AudioVisualizerProps {
  audioUrl: string;
  timestamps?: TimeStamp[];
  onTimeUpdate?: (time: number) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onSelectionChange?: (selection: SelectionRange | null) => void;
  onTimestampClick?: (timestamp: TimeStamp, index: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  playbackRate?: number;
  displayTimeFormat?: 'seconds' | 'minutes';
  height?: number;
  width?: number;
  isPlaying?: boolean;
  currentTime?: number;
  readOnly?: boolean;
  debugName?: string; // Add debug name prop
}

// Define the handle interface for the ref
export interface AudioVisualizerHandle {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getIsPlaying: () => boolean;
  getPlaybackRate: () => number;
  setPlaybackRate: (rate: number) => void;
  getAudioBuffer: () => Promise<AudioBuffer | null>;
  getFirstSelectedWord: () => TimeStamp | null;
  togglePlayback: () => void;
  clearSelection: () => void;
  getCanvas: () => HTMLCanvasElement | null;
}

// Create the component with forwardRef to expose the handle
export const AudioVisualizer = forwardRef<AudioVisualizerHandle, AudioVisualizerProps>((props, ref) => {
  // Assign a unique debug ID for this instance
  const debugId = useRef(`audiovisualizer-${Math.floor(Math.random() * 10000)}`);
  const debug = logger.audioVisualizer;
  
  debug.log(`Initializing AudioVisualizer: ${debugId.current}, name: ${props.debugName || 'unnamed'}`);
  trackRender(`AudioVisualizer ${props.debugName || debugId.current}`);

  // Setup component state
  const {
  audioUrl,
    timestamps = [],
    onTimeUpdate,
  onPlaybackRateChange,
    onSelectionChange,
    onTimestampClick,
    onPlayingChange,
    playbackRate: initialPlaybackRate = 1,
    displayTimeFormat = 'seconds',
    height = 150,
    width = 800,
    isPlaying: externalIsPlaying,
    currentTime: externalCurrentTime,
    readOnly = false,
  } = props;

  // Audio and canvas refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const currentPlaybackRate = useRef<number>(initialPlaybackRate);
  const playbackStartTimeRef = useRef<number>(0);
  
  // State for waveform and playback
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(initialPlaybackRate);
  const [hoverTime, setHoverTime] = useState<number>(0);
  
  // Selection state
  const [firstSelectedWord, setFirstSelectedWord] = useState<TimeStamp | null>(null);
  const [selectedWords, setSelectedWords] = useState<TimeStamp[]>([]);
  
  // Animation frame ref
  const animationFrameRef = useRef<number | null>(null);

  // Add a ref for the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Debug selected words
  useEffect(() => {
    if (selectedWords.length > 0) {
      debug.track('Selected Words', {
        count: selectedWords.length,
        words: selectedWords.map(w => w.word),
        timeRange: selectedWords.length > 0 
          ? `${selectedWords[0].start.toFixed(2)}s - ${selectedWords[selectedWords.length-1].stop.toFixed(2)}s`
          : 'none'
      });
    }
  }, [selectedWords]);

  // Debug when playback rate changes
  useEffect(() => {
    debug.log(`Playback rate changed to ${playbackRate}x`);
    
    currentPlaybackRate.current = playbackRate;
    if (audioSource) {
      audioSource.playbackRate.value = playbackRate;
    }
    
    if (onPlaybackRateChange) {
      onPlaybackRateChange(playbackRate);
    }
  }, [playbackRate, onPlaybackRateChange, audioSource]);

  // Load and decode the audio for visualization
  useEffect(() => {
    const loadAudio = async () => {
      debug.log(`Loading audio from URL: ${audioUrl}`);
      const timer = createTimer('Audio Load');
      
      try {
        // Fetch the audio data
        const response = await fetch(audioUrl);
        
        if (!response.ok) {
          debug.error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
          return;
        }
        
        const arrayBuffer = await response.arrayBuffer();
        debug.log(`Audio fetched, size: ${(arrayBuffer.byteLength / 1024).toFixed(2)}KB`);
        
        // Create an audio context
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        // Decode the audio data
        debug.log('Decoding audio data...');
        const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        debug.success(`Audio decoded successfully: ${buffer.duration.toFixed(2)}s, ${buffer.numberOfChannels} channels`);
        
        bufferRef.current = buffer;
        setAudioBuffer(buffer);
        setDuration(buffer.duration);
        
        // Draw the waveform
        if (canvasRef.current) {
          drawWaveform(buffer);
        }
        
        timer.stop();
      } catch (error) {
        debug.error('Error loading audio:', error);
      }
    };
    
    if (audioUrl) {
      loadAudio();
    }
    
    return () => {
      debug.log('Cleaning up audio resources');
      if (audioContextRef.current) {
        // Clean up the audio context
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(err => {
            debug.error('Error closing audio context:', err);
          });
        }
      }
    };
  }, [audioUrl]);

  // Watch for external playback control
  useEffect(() => {
    debug.log(`External isPlaying changed to: ${externalIsPlaying}`);
    if (externalIsPlaying !== undefined) {
      if (externalIsPlaying && !isPlaying) {
        playAudio();
      } else if (!externalIsPlaying && isPlaying) {
        stopAudio();
      }
    }
  }, [externalIsPlaying]);

  // Watch for external time control
  useEffect(() => {
    if (externalCurrentTime !== undefined && !isPlaying) {
      debug.log(`External currentTime changed to: ${externalCurrentTime?.toFixed(2)}s`);
      setCurrentTime(externalCurrentTime);
      
      if (canvasRef.current && audioBuffer) {
        drawWaveform(audioBuffer, externalCurrentTime);
      }
    }
  }, [externalCurrentTime, audioBuffer]);

  // Track playback and update time
  useEffect(() => {
    const trackPlayback = () => {
      if (audioRef.current && isPlaying) {
        const newTime = audioRef.current.currentTime;
        
        // Only log if time has changed significantly
        if (Math.abs(newTime - currentTime) > 0.1) {
          debug.log(`Playback time: ${newTime.toFixed(2)}s / ${duration.toFixed(2)}s`);
        }
        
        setCurrentTime(newTime);
        
        if (onTimeUpdate) {
          onTimeUpdate(newTime);
        }
        
        if (canvasRef.current && audioBuffer) {
          drawWaveform(audioBuffer, newTime);
        }
        
        // Check if playback has reached the end
        if (newTime >= duration - 0.1) {
          debug.log('Playback reached end, stopping');
          stopAudio();
        }
        
        // Continue tracking
        animationFrameRef.current = requestAnimationFrame(trackPlayback);
      }
    };
    
    if (isPlaying) {
      debug.log('Starting playback tracking');
      animationFrameRef.current = requestAnimationFrame(trackPlayback);
    }
    
    return () => {
      if (animationFrameRef.current) {
        debug.log('Stopping playback tracking');
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, audioBuffer, duration, currentTime, onTimeUpdate]);

  // Draw the waveform on the canvas
  const drawWaveform = useCallback((buffer: AudioBuffer, currentPosition: number = currentTime) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up dimensions
    const width = canvas.width;
    const height = canvas.height;
    
    // Get the audio data
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;
    
    // Draw the waveform
    ctx.beginPath();
    ctx.moveTo(0, amp);
    
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      
      ctx.lineTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    
    ctx.strokeStyle = '#3b82f6';
    ctx.stroke();
    
    // Draw timestamp markers first (so they appear behind the playhead)
    if (timestamps && timestamps.length > 0) {
      timestamps.forEach((ts, index) => {
        const startX = (ts.start / buffer.duration) * width;
        const endX = (ts.stop / buffer.duration) * width;
        
        // Draw selected timestamps with a different color
        if (ts.selected) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
          ctx.fillRect(startX, 0, endX - startX, height);
          
          // Add a subtle gradient to highlight selected regions
          const gradient = ctx.createLinearGradient(startX, 0, startX, height);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
          gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.2)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.5)');
          ctx.fillStyle = gradient;
          ctx.fillRect(startX, 0, endX - startX, height);
        }
        
        // Draw timestamp start marker
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX, height);
        ctx.strokeStyle = ts.selected ? '#2563eb' : '#9ca3af';
        ctx.lineWidth = ts.selected ? 2 : 1;
        ctx.stroke();
        
        // Draw end marker as well
        ctx.beginPath();
        ctx.moveTo(endX, 0);
        ctx.lineTo(endX, height);
        ctx.strokeStyle = ts.selected ? '#2563eb' : '#9ca3af';
        ctx.lineWidth = ts.selected ? 2 : 1;
        ctx.stroke();
      });
    }
    
    // Draw the playhead (on top of everything else)
    const playheadX = (currentPosition / buffer.duration) * width;
    
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Add a small circle on top of the playhead for better visibility
    ctx.beginPath();
    ctx.arc(playheadX, 10, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    
    // Restore line width
    ctx.lineWidth = 1;
  }, [timestamps, currentTime]);

  // Play the audio
  const playAudio = useCallback(() => {
    debug.log('Play audio called');
    
    if (audioRef.current) {
      const audio = audioRef.current;
      
      // Set the playback rate
      audio.playbackRate = playbackRate;
      
      // Start playback
      audio.play()
        .then(() => {
          debug.success('Audio playback started');
          setIsPlaying(true);
          if (onPlayingChange) {
            onPlayingChange(true);
          }
        })
        .catch(error => {
          debug.error('Error playing audio:', error);
        });
    } else {
      debug.warn('Audio element not available');
    }
  }, [playbackRate, onPlayingChange]);

  // Pause the audio
  const pauseAudio = useCallback(() => {
    debug.log('Pause audio called');
    
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      debug.log('Audio playback paused');
      if (onPlayingChange) {
        onPlayingChange(false);
      }
    }
  }, [onPlayingChange]);

  // Stop the audio
  const stopAudio = useCallback(() => {
    debug.log('Stop audio called');
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
      debug.log('Audio playback stopped');
      if (onPlayingChange) {
        onPlayingChange(false);
      }
    }
  }, [onPlayingChange]);

  // Seek to a specific time
  const seek = useCallback((time: number) => {
    debug.log(`Seek to ${time.toFixed(2)}s`);
    
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      
      if (canvasRef.current && audioBuffer) {
        drawWaveform(audioBuffer, time);
      }
    }
  }, [audioBuffer, drawWaveform]);

  // Handle timestamp clicks
  const handleTimestampClick = useCallback((event: React.MouseEvent, timestamp: TimeStamp, index: number) => {
    event.preventDefault();
    
    debug.log(`Timestamp clicked: "${timestamp.word}" at ${timestamp.start.toFixed(2)}s (index: ${index})`);
    
    // Set crosshair position to the clicked word
    const clickedWordStart = timestamp.start;
    setCurrentTime(clickedWordStart);
    
    // Toggle selection state of the clicked timestamp
    const newTimestamps = [...timestamps];
    
    if (event.shiftKey && firstSelectedWord !== null) {
      // If shift key is held and we have a first selection, select a range
      const firstSelectedIndex = timestamps.indexOf(firstSelectedWord);
      debug.log(`Shift-click detected, selecting range from index ${firstSelectedIndex} to ${index}`);
      
      const startIndex = Math.min(firstSelectedIndex, index);
      const endIndex = Math.max(firstSelectedIndex, index);
      
      // Check if all words in range are already selected (to toggle them off)
      const allSelected = newTimestamps.slice(startIndex, endIndex + 1)
        .every(ts => ts.selected);
      
      for (let i = startIndex; i <= endIndex; i++) {
        newTimestamps[i] = {
          ...newTimestamps[i],
          selected: !allSelected
        };
      }
    } else {
      // Single selection - toggle the clicked timestamp
      newTimestamps[index] = {
        ...newTimestamps[index],
        selected: !newTimestamps[index].selected
      };
      
      // Update first selected word based on selection state
      if (newTimestamps[index].selected) {
        setFirstSelectedWord(newTimestamps[index]);
      } else {
        setFirstSelectedWord(null);
      }
    }
    
    // Calculate selected time range
    const selectedTimestamps = newTimestamps.filter(ts => ts.selected);
    
    if (selectedTimestamps.length > 0) {
      const startTime = Math.min(...selectedTimestamps.map(ts => ts.start));
      const endTime = Math.max(...selectedTimestamps.map(ts => ts.stop));
      
      debug.log(`Selection updated: ${selectedTimestamps.length} words, ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s`);
      
      // Update selected words array
      setSelectedWords(selectedTimestamps);
      
      // Update first selected word to be the earliest selected word if not already set
      if (!firstSelectedWord || !firstSelectedWord.selected) {
        setFirstSelectedWord(selectedTimestamps[0]);
      }
      
      // Notify parent about selection change
      if (onSelectionChange) {
        onSelectionChange({
          words: selectedTimestamps,
          startTime,
          endTime,
          wordCount: selectedTimestamps.length,
          firstSelectedWord: selectedTimestamps[0]
        });
      }
      
      // Scroll the clicked timestamp into view - find its container
      const container = event.currentTarget.parentElement?.parentElement;
      if (container && container.classList.contains('timestamps-scrollable-container')) {
        // Determine if we need to scroll
        const box = event.currentTarget as HTMLElement;
        const containerRect = container.getBoundingClientRect();
        const boxRect = box.getBoundingClientRect();
        
        // Check if box is outside the visible area
        if (boxRect.left < containerRect.left || boxRect.right > containerRect.right) {
          // Calculate scroll position
          box.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    } else {
      debug.log('Selection cleared - no words selected');
      setSelectedWords([]);
      setFirstSelectedWord(null);
      
      // Notify parent about selection change (cleared)
      if (onSelectionChange) {
        onSelectionChange(null);
      }
    }
    
    // Call onTimestampClick if provided
    if (onTimestampClick) {
      debug.log(`Calling onTimestampClick with "${timestamp.word}" at index ${index}`);
      onTimestampClick(timestamp, index);
    }
    
    // Update timestamps in place since we don't have a setTimestamps function
    timestamps.forEach((ts, i) => {
      ts.selected = newTimestamps[i].selected;
    });
    
    // Move the playhead to the clicked position and redraw the waveform
    seek(clickedWordStart);
  }, [timestamps, firstSelectedWord, seek, onSelectionChange, onTimestampClick, setSelectedWords]);

  // Toggle playback
  const togglePlayback = useCallback(() => {
    debug.log(`Toggle playback called, current state: ${isPlaying ? 'playing' : 'paused'}`);
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  }, [isPlaying, pauseAudio, playAudio]);

  // Clear selection
  const clearSelection = useCallback(() => {
    debug.log('Clear selection called');
    setSelectedWords([]);
    setFirstSelectedWord(null);
    if (onSelectionChange) {
      onSelectionChange(null);
    }
  }, [onSelectionChange]);

  // Format time for display
  const formatTime = useCallback((time: number): string => {
    if (displayTimeFormat === 'minutes') {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return time.toFixed(2);
    }
  }, [displayTimeFormat]);

  // Auto-scroll the timestamp container to keep current playhead in view
  useEffect(() => {
    // Skip if not playing or no timestamps
    if (!isPlaying || !timestamps || timestamps.length === 0 || !scrollContainerRef.current) {
      return;
    }
    
    // Find the current timestamp based on playhead position
    const currentWordIndex = timestamps.findIndex(ts => 
      currentTime >= ts.start && currentTime <= ts.stop
    );
    
    // If we found a current word
    if (currentWordIndex !== -1) {
      const container = scrollContainerRef.current;
      const currentWordElement = container.querySelector(`[data-index="${currentWordIndex}"]`) as HTMLElement;
      
      if (currentWordElement) {
        // Check if the current word is in view
        const containerRect = container.getBoundingClientRect();
        const wordRect = currentWordElement.getBoundingClientRect();
        
        // If word is outside the visible area, scroll to it
        if (wordRect.left < containerRect.left || wordRect.right > containerRect.right) {
          currentWordElement.scrollIntoView({ 
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }
        
        // Add a subtle background highlight to the current word without using a crosshair
        const allTimestampBoxes = container.querySelectorAll('.timestamp-box');
        allTimestampBoxes.forEach((box) => {
          (box as HTMLElement).classList.remove('current-word');
        });
        
        // Add the current-word class to highlight the current word
        currentWordElement.classList.add('current-word');
      }
    }
  }, [currentTime, isPlaying, timestamps]);

  // Add a new CSS style block in the component
  useEffect(() => {
    // Add CSS for the current-word class
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .timestamp-box.current-word:not(.selected) {
        box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.3);
      }
      .timestamp-box.current-word.selected {
        box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.5), 0 0 0 4px rgba(37, 99, 235, 0.3);
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      // Clean up the style when component unmounts
      document.head.removeChild(styleElement);
    };
  }, []);

  // Handle scroll navigation with arrows
  const handleScrollArrow = useCallback((direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.8; // Scroll 80% of visible width
    
    const targetScroll = direction === 'left' 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount;
    
    container.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
  }, []);

  // Calculate scroll indicator position
  const getScrollIndicatorStyle = useCallback(() => {
    if (!scrollContainerRef.current) {
      return {
        width: '0%',
        left: '0%'
      };
    }
    
    const container = scrollContainerRef.current;
    const scrollableWidth = container.scrollWidth - container.clientWidth;
    
    if (scrollableWidth <= 0) {
      // No scrolling needed, fill the full width
      return {
        width: '100%',
        left: '0%'
      };
    }
    
    // Calculate width and position based on viewport vs content size
    const viewportRatio = container.clientWidth / container.scrollWidth;
    const indicatorWidth = Math.max(viewportRatio * 100, 10); // At least 10% width
    const indicatorPosition = (container.scrollLeft / scrollableWidth) * (100 - indicatorWidth);
    
    return {
      width: `${indicatorWidth}%`,
      left: `${indicatorPosition}%`
    };
  }, []);
  
  // Update scroll indicator on scroll
  const [scrollIndicatorStyle, setScrollIndicatorStyle] = useState({ width: '0%', left: '0%' });
  
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      setScrollIndicatorStyle(getScrollIndicatorStyle());
    };
    
    // Set initial position
    setScrollIndicatorStyle(getScrollIndicatorStyle());
    
    // Add scroll event listener
    container.addEventListener('scroll', handleScroll);
    
    // Handle window resize to recalculate
    window.addEventListener('resize', handleScroll);
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [getScrollIndicatorStyle]);

  // Expose the handle through useImperativeHandle
  useImperativeHandle(ref, () => ({
    play: playAudio,
    pause: pauseAudio,
    stop: stopAudio,
    seek,
    getCurrentTime: () => currentTime,
    getDuration: () => duration,
    getIsPlaying: () => isPlaying,
    getPlaybackRate: () => playbackRate,
    setPlaybackRate: (rate: number) => {
      debug.log(`Setting playback rate to ${rate}x`);
      setPlaybackRate(rate);
      if (audioRef.current) {
        audioRef.current.playbackRate = rate;
      }
    },
    getAudioBuffer: async () => bufferRef.current,
    getFirstSelectedWord: () => firstSelectedWord,
    togglePlayback,
    clearSelection,
    getCanvas: () => canvasRef.current,
  }), [
    currentTime, 
    duration, 
    isPlaying, 
    playAudio, 
    pauseAudio, 
    playbackRate, 
    seek, 
    stopAudio, 
    togglePlayback, 
    clearSelection
  ]);

  // Render the component
  return (
    <div ref={containerRef} className="audio-visualizer" data-debug-id={debugId.current}>
      <div className="visualizer-canvas-container" style={{ position: 'relative', width: '100%', height }}>
      <canvas 
        ref={canvasRef}
          width={width}
          height={height}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      
      {/* Timestamp boxes with navigation arrows */}
      {timestamps && timestamps.length > 0 && !readOnly && (
        <div className="timestamps-container" style={{
          width: '100%',
          position: 'relative',
          marginTop: '10px',
          borderRadius: '4px',
        }}>
          {/* Left navigation arrow */}
          <button 
            className="scroll-arrow left"
            onClick={() => handleScrollArrow('left')}
            aria-label="Scroll left"
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 40,
              background: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(209, 213, 219, 0.8)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
              fontSize: '14px',
              marginLeft: '4px'
            }}
          >
            ←
          </button>
          
          {/* Right navigation arrow */}
          <button 
            className="scroll-arrow right"
            onClick={() => handleScrollArrow('right')}
            aria-label="Scroll right"
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 40,
              background: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(209, 213, 219, 0.8)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
              fontSize: '14px',
              marginRight: '4px'
            }}
          >
            →
          </button>
          
          <div 
            ref={scrollContainerRef}
            className="timestamps-scrollable-container" 
            style={{ 
              width: '100%', 
              overflowX: 'auto',
              padding: '8px 0',
              backgroundColor: 'rgba(243, 244, 246, 0.5)',
              borderRadius: '4px',
              border: '1px solid rgba(209, 213, 219, 0.5)',
              scrollbarWidth: 'none', // Hide scrollbar for Firefox
              msOverflowStyle: 'none', // Hide scrollbar for IE
            }}
          >
            {/* Hide default scrollbar for Webkit browsers */}
            <style>
              {`
                .timestamps-scrollable-container::-webkit-scrollbar {
                  display: none;
                }
              `}
            </style>
            
            <div className="timestamps-inner-container" style={{
              display: 'flex',
              minWidth: '100%',
              width: 'max-content',
              position: 'relative',
              height: '36px',
              paddingLeft: '28px',  // Add padding for left arrow
              paddingRight: '28px'  // Add padding for right arrow
            }}>
              {timestamps.map((timestamp, index) => {
                // Calculate width based on word length (with min width to ensure clickability)
                const wordLength = timestamp.word.length;
                const minWidth = 40; // Minimum width in pixels
                const widthPerChar = 8; // Pixels per character
                const boxWidth = Math.max(minWidth, wordLength * widthPerChar);
                
                return (
                  <div
                    key={index}
                    data-index={index}
                    className={`timestamp-box ${timestamp.selected ? 'selected' : ''}`}
          style={{ 
                      margin: '0 2px',
                      minWidth: `${boxWidth}px`,
                      height: '100%',
                      backgroundColor: timestamp.selected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(229, 231, 235, 0.6)',
                      border: timestamp.selected ? '2px solid rgba(37, 99, 235, 0.8)' : '1px solid rgba(156, 163, 175, 0.7)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px 4px',
                      fontSize: '14px',
                      fontWeight: timestamp.selected ? 'bold' : 'normal',
                      transition: 'all 0.1s ease-in-out',
                      position: 'relative',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={(e) => handleTimestampClick(e, timestamp, index)}
                    title={`Click to select: ${timestamp.word} (${formatTime(timestamp.start)} - ${formatTime(timestamp.stop)})`}
                  >
                    <span style={{ 
                      color: timestamp.selected ? '#1E40AF' : '#4B5563',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {timestamp.word}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Thin scroll indicator */}
          <div 
            className="scroll-indicator-track" 
            style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              width: '100%',
              height: '2px',
              backgroundColor: 'rgba(209, 213, 219, 0.4)',
              borderRadius: '1px',
            }}
          >
            <div 
              className="scroll-indicator-thumb" 
              style={{
                position: 'absolute',
                height: '100%',
                backgroundColor: 'rgba(107, 114, 128, 0.7)',
                borderRadius: '1px',
                ...scrollIndicatorStyle
              }}
            />
          </div>
            </div>
      )}
      
      {/* Audio element (hidden) */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => {
          debug.log('Audio playback ended naturally');
          setIsPlaying(false);
          if (onPlayingChange) {
            onPlayingChange(false);
          }
        }}
        onLoadedMetadata={(e) => {
          debug.log(`Audio metadata loaded, duration: ${e.currentTarget.duration.toFixed(2)}s`);
          setDuration(e.currentTarget.duration);
        }}
        onError={(e) => {
          debug.error('Audio element error:', e);
        }}
        style={{ display: 'none' }}
      />
    </div>
  );
});

// Display name for debugging
AudioVisualizer.displayName = 'AudioVisualizer';