import React, { useRef, useEffect, useState, useCallback, forwardRef } from 'react';
import { useDebug } from '../hooks/useDebug';

// Define prop interface
interface AudioWaveformProps {
  audioElement?: HTMLAudioElement | null;
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  isPlaying?: boolean;
  label?: string;
  startTime?: number | null;
  endTime?: number | null;
  className?: string;
}

// Define ref interface
interface AudioWaveformRef {
  getAudioContext: () => AudioContext | null;
  initializeAudioContext: () => Promise<AudioContext | null>;
  getAnalyser: () => AnalyserNode | null;
}

// Create a map to track audio elements already connected to audio contexts
const connectedAudioElements = new Map<HTMLAudioElement, MediaElementAudioSourceNode>();

/**
 * Real-time audio waveform visualization component (oscilloscope style)
 */
export const AudioWaveform = forwardRef<AudioWaveformRef, AudioWaveformProps>((props, ref) => {
  const {
    audioElement,
    width = 800,
    height = 200,
    color = '#4CAF50', // Default green color
    backgroundColor = '#f8f9fa', // Default light gray background
    isPlaying = false,
    label = '',
    startTime = null,
    endTime = null,
    className,
  } = props;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const debug = useDebug('AudioWaveform');
  const prevAudioElementRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio context explicitly
  const initializeAudioContext = useCallback(async () => {
    debug.log('Explicitly initializing audio context');
    
    if (!audioCtx) {
      try {
        const newAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioCtx(newAudioCtx);
        debug.log('Created new audio context during explicit initialization');
        return newAudioCtx;
      } catch (error) {
        debug.error(`Error creating audio context: ${(error as Error).message}`);
        return null;
      }
    }
    
    // If context exists but is suspended, try to resume it
    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
        debug.log('Resumed existing audio context during explicit initialization');
      } catch (error) {
        debug.error(`Error resuming audio context: ${(error as Error).message}`);
      }
    }
    
    return audioCtx;
  }, [audioCtx]);
  
  // Expose methods via ref
  React.useImperativeHandle(
    ref,
    () => ({
      getAudioContext: () => audioCtx,
      initializeAudioContext,
      getAnalyser: () => analyser,
    }),
    [audioCtx, analyser, initializeAudioContext]
  );
  
  // Call initialization on mount
  useEffect(() => {
    initializeAudioContext();
  }, [initializeAudioContext]);
  
  // Start visualization if we have an audio element, analyser, and isPlaying=true
  useEffect(() => {
    if (isPlaying) {
      debug.log('isPlaying changed to: true');
      startVisualization();
    } else {
      debug.log('isPlaying changed to: false');
      stopVisualization();
    }
  }, [isPlaying]);
  
  // When audio element changes, log it
  useEffect(() => {
    if (audioElement) {
      debug.log(`audioElement changed: ${audioElement.src.substring(0, 40)}...`);
      
      const hasAudioElementChanged = prevAudioElementRef.current !== audioElement;
      debug.log(`SOURCE CHANGE: New source ${audioElement.src.substring(0, 40)} vs previous ${prevAudioElementRef.current?.src.substring(0, 40) || 'none'}`);
      debug.log(`SOURCE CHANGE: Are they the same object? ${!hasAudioElementChanged}`);
      
      // Store current audio element reference for future comparisons
      prevAudioElementRef.current = audioElement;
    } else {
      debug.log('No audio element provided');
    }
  }, [audioElement]);

  useEffect(() => {
    // Always try to ensure audio context is created, even if not playing
    ensureAudioContextState();
    
    // Reduce check frequency to reduce overhead
    const checkInterval = setInterval(() => {
      ensureAudioContextState();
    }, 3000); // Increased from 1000ms to 3000ms
    
    return () => {
      clearInterval(checkInterval);
      stopVisualization();
      
      // Clean up audio context when component unmounts
      if (audioCtx) {
        audioCtx.close().catch(err => {
          debug.error(`Error closing audio context: ${err.message}`);
        });
      }
    };
  }, []);

  // Set up the audio analyser when the audio element changes
  useEffect(() => {
    debug.log('==== AUDIO ANALYZER SETUP ====');
    
    if (!audioElement) {
      debug.log('Audio element: none');
      debug.log('No audio element provided, skipping setup');
      return;
    }
    
    debug.log(`Audio element: ${audioElement.src.substring(0, 40)}`);
    debug.log(`isPlaying: ${isPlaying}, isConnected: ${connectedAudioElements.has(audioElement)}`);
    
    // Create AudioContext even if not playing - we want to maintain the context
    if (!audioCtx) {
      try {
        const newAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioCtx(newAudioCtx);
        debug.log('Created new audio context');
      } catch (error) {
        debug.error(`Error creating audio context: ${(error as Error).message}`);
        return;
      }
    }

    // Always try to set up the audio analyzer, even if not playing
    // This ensures we have the connections ready when playback starts
    const setupAudioAnalyser = async () => {
      if (!audioCtx) {
        debug.log('Audio context not available');
        return;
      }

      try {
        // Resume the audio context if it's suspended
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
          debug.log('Resumed audio context');
        }

        let source: MediaElementAudioSourceNode;
        
        // Check if this audio element is already connected
        if (connectedAudioElements.has(audioElement)) {
          // Reuse the existing source
          source = connectedAudioElements.get(audioElement)!;
          debug.log('Reusing existing audio source connection');
        } else {
          // Create a new connection
          source = audioCtx.createMediaElementSource(audioElement);
          connectedAudioElements.set(audioElement, source);
          debug.log('Created new audio source connection');
        }

        // Create analyzer if needed
        if (!analyser) {
          const newAnalyser = audioCtx.createAnalyser();
          newAnalyser.fftSize = 2048;
          setAnalyser(newAnalyser);
          debug.log('Created new analyser');
        }

        // Connect the source to the analyser
        if (analyser) {
          source.connect(analyser);
          analyser.connect(audioCtx.destination);
          debug.log(`Setting up audio analyzer for ${audioElement.src.substring(0, 40)}...`);
          
          // Only start visualization if we're playing
          if (isPlaying) {
            startVisualization();
          }
        }
      } catch (error) {
        debug.error(`Error setting up audio analyser: ${(error as Error).message}`);
      }
    };

    setupAudioAnalyser();
  }, [audioElement, audioCtx]);

  const startVisualization = () => {
    debug.log('==== START VISUALIZATION ====');
    if (!canvasRef.current || !analyser) {
      debug.log(`Cannot start visualization: canvas ref: ${canvasRef.current ? 'available' : 'none'}, analyser: ${analyser ? 'available' : 'none'}`);
      return;
    }
    if (!audioElement) {
      debug.log('No audio element for visualization');
      return;
    }
    
    debug.log(`Animation frame ref: ${animationFrameRef.current ? animationFrameRef.current : 'none'}`);
    
    // Skip if already running
    if (animationFrameRef.current !== null) {
      debug.log('Visualization already running');
      return;
    }
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    debug.log(`Created data array with ${bufferLength} bins`);
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) {
      debug.log('Canvas context not available');
      return;
    }
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Pre-calculate values that won't change during animation to improve performance
    const sliceWidth = canvasWidth / bufferLength;
    const halfHeight = canvasHeight / 2;
    
    let previousAnimationTimestamp = 0;
    const targetFPS = 30; // Limit to 30 FPS for better performance
    const frameInterval = 1000 / targetFPS;
    
    const draw = (timestamp: number) => {
      // Store reference for cancellation
      animationFrameRef.current = requestAnimationFrame(draw);
      
      // Throttle drawing to target FPS
      const elapsed = timestamp - previousAnimationTimestamp;
      if (elapsed < frameInterval) {
        return; // Skip this frame
      }
      previousAnimationTimestamp = timestamp;
      
      // Get frequency data
      analyser.getByteTimeDomainData(dataArray);
      
      // Clear canvas
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw waveform
      context.lineWidth = 2;
      context.strokeStyle = color;
      context.beginPath();
      
      let x = 0;
      
      // Draw only every other point for better performance on high resolutions
      const step = window.innerWidth > 1000 ? 2 : 1;
      
      for (let i = 0; i < bufferLength; i += step) {
        const v = dataArray[i] / 128.0;
        const y = v * halfHeight;
        
        if (i === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
        
        x += sliceWidth * step;
      }
      
      context.lineTo(canvasWidth, halfHeight);
      context.stroke();
    };
    
    // Start the animation
    previousAnimationTimestamp = performance.now();
    draw(previousAnimationTimestamp);
    debug.log(`Audio visualization started, element: ${audioElement.src}`);
  };

  const stopVisualization = () => {
    debug.log('==== STOP VISUALIZATION ====');
    debug.log(`Animation frame ref: ${animationFrameRef.current ? animationFrameRef.current : 'none'}`);
    
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      debug.log(`Cancelled animation frame`);
    } else {
      debug.log('No animation frame to cancel');
    }
    
    // Don't disconnect audio - we want to keep the connection alive
    if (audioElement) {
      debug.log(`Audio visualization stopped, element: ${audioElement.src}`);
    } else {
      debug.log('Audio visualization stopped, no element');
    }
  };

  const ensureAudioContextState = async () => {
    if (!audioCtx) {
      // Try to create a new audio context if we don't have one
      if (audioElement) {
        try {
          const newAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          setAudioCtx(newAudioCtx);
          debug.log('Created new audio context during state check');
        } catch (error) {
          debug.error(`Error creating audio context: ${(error as Error).message}`);
        }
      }
      return;
    }
    
    // Only resume if suspended and we need it active (when playing or connecting new elements)
    if (audioCtx.state === 'suspended' && (isPlaying || !connectedAudioElements.has(audioElement!))) {
      try {
        await audioCtx.resume();
        debug.log('Successfully resumed audio context');
      } catch (error) {
        debug.error(`Failed to resume audio context: ${(error as Error).message}`);
      }
    }
    
    // Don't constantly try to connect if not needed
    if (audioElement && !connectedAudioElements.has(audioElement) && audioCtx.state === 'running') {
      try {
        const source = audioCtx.createMediaElementSource(audioElement);
        connectedAudioElements.set(audioElement, source);
        
        // Create analyzer if needed
        if (!analyser) {
          const newAnalyser = audioCtx.createAnalyser();
          newAnalyser.fftSize = 2048;
          setAnalyser(newAnalyser);
          debug.log('Created new analyser during state check');
        }
        
        // Connect the source to the analyser
        if (analyser) {
          source.connect(analyser);
          analyser.connect(audioCtx.destination);
          debug.log('Connected audio element during state check');
        }
      } catch (error) {
        debug.error(`Failed to connect audio element: ${(error as Error).message}`);
      }
    }
  };

  return (
    <div 
      style={{ position: 'relative', width, height, marginBottom: '10px' }}
      className={className}
    >
      {label && (
        <div style={{ position: 'absolute', top: '-25px', left: '10px', fontSize: '14px', fontWeight: 'bold' }}>
          {label}
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          backgroundColor,
          borderRadius: '4px',
          display: 'block',
        }}
      />
      {startTime !== null && endTime !== null && (
        <div
          style={{
            position: 'absolute',
            left: `${(startTime / (audioElement?.duration || 1)) * 100}%`,
            width: `${((endTime - startTime) / (audioElement?.duration || 1)) * 100}%`,
            height: '100%',
            top: 0,
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            borderLeft: '2px solid rgba(0, 123, 255, 0.5)',
            borderRight: '2px solid rgba(0, 123, 255, 0.5)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
});

// Also export as default for compatibility
export default AudioWaveform; 