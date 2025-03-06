import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDebug } from '../hooks/useDebug';

// Define prop interface
interface AudioWaveformProps {
  audioElement?: HTMLAudioElement | null;
  width?: number;
  height?: number;
  color?: string;
  isPlaying?: boolean;
  label?: string;
}

/**
 * Real-time audio waveform visualization component (oscilloscope style)
 */
export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  audioElement,
  width = 800,
  height = 200,
  color = '#4CAF50', // Default green color
  isPlaying = false,
  label = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const previousAudioElementRef = useRef<HTMLAudioElement | null>(null);
  
  const debug = useDebug('AudioWaveform');
  
  // Debug props changes
  useEffect(() => {
    debug.log(`isPlaying changed to: ${isPlaying}`);
  }, [isPlaying]);
  
  useEffect(() => {
    if (audioElement) {
      debug.log(`audioElement changed: ${audioElement.src.substring(0, 30)}...`);
    } else {
      debug.log('audioElement set to null/undefined');
    }
  }, [audioElement]);
  
  // Cleanup function for when audio sources change
  const cleanupCurrentAudioSource = useCallback(() => {
    debug.log('Cleaning up current audio source');
    stopVisualization();
    
    // Only disconnect the source, keep the context and analyzer
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
        debug.log('Disconnected previous source node');
      } catch (error) {
        debug.error('Error disconnecting source:', error);
      }
      sourceNodeRef.current = null;
    }
    
    setIsConnected(false);
  }, []);
  
  // Set up Web Audio API connections
  useEffect(() => {
    const setupAudioAnalyser = async () => {
      if (!audioElement) {
        debug.log('No audio element provided');
        if (animationFrameRef.current) {
          stopVisualization();
        }
        return;
      }
      
      if (!isPlaying) {
        debug.log('Audio not playing, skipping analyzer setup');
        if (animationFrameRef.current) {
          stopVisualization();
        }
        return;
      }
      
      debug.log(`Setting up audio analyzer for ${audioElement.src.substring(0, 30)}...`);
      
      // If audio element has changed, clean up the previous connections
      if (previousAudioElementRef.current && previousAudioElementRef.current !== audioElement) {
        debug.log('Audio element changed, cleaning up previous connections');
        cleanupCurrentAudioSource();
      }
      
      // Update the reference to the current audio element
      previousAudioElementRef.current = audioElement;
      
      try {
        // Create audio context if it doesn't exist
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          debug.log('Created new AudioContext');
        }
        
        // Connect audio element to analyzer if not already connected or if audio element changed
        if (!isConnected || !sourceNodeRef.current) {
          // Create analyzer node if it doesn't exist
          if (!analyserRef.current) {
            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 2048; // For detailed waveform
            analyserRef.current = analyser;
            debug.log('Created new AnalyserNode');
          }
          
          const analyser = analyserRef.current;
          
          try {
            // Create source from audio element
            const source = audioContextRef.current.createMediaElementSource(audioElement);
            sourceNodeRef.current = source;
            
            // Connect source -> analyser -> destination
            source.connect(analyser);
            analyser.connect(audioContextRef.current.destination);
            
            setIsConnected(true);
            debug.log('Connected audio to analyser');
          } catch (error) {
            // If there's an error creating the source, it might already be connected
            debug.warn('Error creating source, may already be connected:', error);
            
            // Try to reconnect the existing source if possible
            if (sourceNodeRef.current) {
              try {
                sourceNodeRef.current.connect(analyser);
                analyser.connect(audioContextRef.current.destination);
                setIsConnected(true);
                debug.log('Reconnected existing source to analyser');
              } catch (reconnectError) {
                debug.error('Error reconnecting source:', reconnectError);
              }
            }
          }
        }
        
        // Start visualization
        startVisualization();
      } catch (error) {
        debug.error('Error setting up audio analyser:', error);
      }
    };
    
    setupAudioAnalyser();
    
    // Cleanup function
    return () => {
      if (!audioElement || !isPlaying) {
        stopVisualization();
      }
    };
  }, [audioElement, isPlaying, cleanupCurrentAudioSource]);
  
  // Start the visualization animation
  const startVisualization = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const analyser = analyserRef.current;
    
    // Create buffer for frequency data if not exists
    if (!dataArrayRef.current) {
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    }
    
    const dataArray = dataArrayRef.current;
    const bufferLength = analyser.frequencyBinCount;
    
    // Set canvas for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    
    // Animation function
    const draw = () => {
      if (!ctx || !analyser) return;
      
      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(draw);
      
      // Get time domain data
      analyser.getByteTimeDomainData(dataArray);
      
      // Clear canvas
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, width, height);
      
      // Draw waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.beginPath();
      
      const sliceWidth = width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // convert to range of -1 to 1
        const y = (v * height) / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.stroke();
    };
    
    // Start drawing
    draw();
  };
  
  // Stop the visualization animation
  const stopVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      debug.log('Stopped visualization');
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVisualization();
      
      // Only fully disconnect when component unmounts
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
          debug.log('Disconnected source node on unmount');
        } catch (error) {
          debug.error('Error disconnecting source on unmount:', error);
        }
        sourceNodeRef.current = null;
      }
      
      if (analyserRef.current) {
        try {
          analyserRef.current.disconnect();
          debug.log('Disconnected analyser node on unmount');
        } catch (error) {
          debug.error('Error disconnecting analyser on unmount:', error);
        }
        analyserRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close().then(() => {
          debug.log('Closed audio context on unmount');
        }).catch(error => {
          debug.error('Error closing audio context on unmount:', error);
        });
        audioContextRef.current = null;
      }
      
      // Clear previous audio element reference
      previousAudioElementRef.current = null;
    };
  }, []);
  
  return (
    <div className="audio-waveform-container" style={{ width: '100%' }}>
      {label && <div className="waveform-label">{label}</div>}
      <div className="waveform-canvas-container" style={{ position: 'relative', width: '100%', height }}>
        {!isPlaying && (
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              color: '#666',
              fontSize: '14px',
            }}
          >
            Play audio to see waveform
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          style={{ 
            width: '100%', 
            height: '100%',
            backgroundColor: '#f8f9fa',
            border: '2px solid #ddd',
            borderRadius: '4px',
          }}
        />
      </div>
    </div>
  );
};

// Also export as default for compatibility
export default AudioWaveform; 