import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AudioVisualizer, TimeStamp, SelectionRange, AudioVisualizerHandle } from '../components/AudioVisualizer';
import { parseTimestampsCSV } from '../utils/parseTimestamps';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { logger, createTimer, trackRender } from '../utils/debug';
import { AudioWaveform } from '../components/AudioWaveform';
import { useDebug } from '../hooks/useDebug';

interface AudioDevice {
  deviceId: string;
  label: string;
}

// Define interfaces for person and sample data
interface Sample {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration: number;
  audioFile: string;
  transcriptFile: string;
  fullText: string;
  tags: string[];
  tips: string[];
}

interface Person {
  id: string;
  name: string;
  title: string;
  summary: string;
  bio: string;
  images: {
    profile: string;
  };
  voiceCharacteristics: string[];
  difficulty: string;
  samples: Sample[];
}

export const Training = () => {
  // Debug logger
  const debug = useDebug('Training');
  
  // URL params
  const [searchParams] = useSearchParams();
  const personId = searchParams.get('person') || 'donald-trump';
  const sampleId = searchParams.get('sample') || 'sample1';

  // Person and sample data
  const [person, setPerson] = useState<Person | null>(null);
  const [currentSample, setCurrentSample] = useState<Sample | null>(null);
  
  // Audio state
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);
  const [showPlaybackRateMenu, setShowPlaybackRateMenu] = useState<boolean>(false);
  const [currentSelection, setCurrentSelection] = useState<SelectionRange | null>(null);
  const [selectionPlayheadTime, setSelectionPlayheadTime] = useState<number>(0);
  const [isTargetPlaying, setIsTargetPlaying] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timestamps, setTimestamps] = useState<TimeStamp[]>([]);
  const [isRecordingPlaying, setIsRecordingPlaying] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isHoveringRecordButton, setIsHoveringRecordButton] = useState<boolean>(false);
  const [recordingSaved, setRecordingSaved] = useState<boolean>(false);
  const [transcriptFile, setTranscriptFile] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');

  // Refs
  const visualizerRef = useRef<AudioVisualizerHandle>(null);
  const targetVisualizerRef = useRef<AudioVisualizerHandle>(null);
  const recordingAudioRef = useRef<HTMLAudioElement | null>(null);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const volumeControlRef = useRef<HTMLDivElement>(null);
  const playbackRateControlRef = useRef<HTMLDivElement>(null);
  
  // Recording state
  const { audioURL, isRecording, startRecording, stopRecording, isIOS } = useVoiceRecorder({
    deviceId: selectedDevice
  });
  
  // Timing references
  const playbackStartTimeRef = useRef<number>(0);
  const playheadStartPositionRef = useRef<number>(0);
  
  // Add a persistent audio element reference at the top of the component
  const [persistentAudioElement, setPersistentAudioElement] = useState<HTMLAudioElement | null>(null);
  const [basePath, setBasePath] = useState<string>('');
  // Add a flag to track if audio has been initialized
  const [audioInitialized, setAudioInitialized] = useState<boolean>(false);
  
  // Initialize logger with consistent formatting
  const log = {
    info: (message: string, ...args: any[]) => debug.log(message, ...args),
    log: (message: string, ...args: any[]) => debug.log(message, ...args),
    success: (message: string, ...args: any[]) => debug.success(message, ...args),
    warning: (message: string, ...args: any[]) => debug.log(`⚠️ ${message}`, ...args),
    error: (message: string, ...args: any[]) => debug.error(message, ...args),
    track: (label: string, data: any) => debug.track(label, data),
    warn: (message: string, ...args: any[]) => debug.log(`⚠️ ${message}`, ...args),
  };

  // Load person data
  useEffect(() => {
    log.info(`Loading person data for: ${personId}`);
    const timer = createTimer('Load Person Data');
    
    // Try to fetch from politicians folder first
    fetch(`/persons/politicians/${personId}/profile.json`)
      .then(response => {
        if (!response.ok) {
          // Fall back to the root persons directory if not found in politicians
          return fetch(`/persons/${personId}/profile.json`);
        }
        return response;
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load person data: ${response.status}`);
        }
        
        // Set base path based on where we found the profile
        const path = response.url.includes('/politicians/') 
          ? `/persons/politicians/${personId}/`
          : `/persons/${personId}/`;
        setBasePath(path);
        
        return response.json();
      })
      .then(data => {
        setPerson(data);
        log.success(`Loaded person data for ${data.name}`);
        timer.stop();
      })
      .catch(err => {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        log.error('Failed to load person data:', errorObj);
        timer.stop();
      });
  }, [personId]);

  // Set current sample when person data or sampleId changes
  useEffect(() => {
    if (!person || !basePath) return;
    
    const sample = person.samples.find(s => s.id === sampleId);
    if (sample) {
      log.info(`Setting current sample: ${sample.title}`);
      setCurrentSample(sample);
      setTranscriptFile(`${basePath}${sample.transcriptFile}`);
      setAudioUrl(`${basePath}${sample.audioFile}`);
    } else {
      log.error(`Sample not found: ${sampleId}`);
      setError(new Error(`Sample not found: ${sampleId}`));
    }
  }, [person, sampleId, personId, basePath]);

  // Explicitly initialize audio context on component mount
  useEffect(() => {
    log.info('Initializing audio context on component mount');
    
    // Create a function to initialize the audio context
    const initAudioContext = async () => {
      try {
        // Create a new audio context
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Resume the audio context if it's suspended
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
          log.info('Audio context resumed successfully');
        }
        
        log.success('Audio context initialized successfully');
        
        // Create a silent audio buffer and play it to fully activate the audio context
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
        
        log.info('Played silent buffer to activate audio context');
      } catch (err) {
        log.error('Error initializing audio context:', err);
      }
    };
    
    // Initialize the audio context
    initAudioContext();
  }, []);

  // Utility function for standardized audio element error handling
  const handleAudioElementError = useCallback((e: Event, audioElement: HTMLAudioElement, errorContext: string) => {
    const error = audioElement.error;
    if (error) {
      log.error(`${errorContext}: ${error.code}`);
    } else {
      log.log(`Audio element error triggered in ${errorContext} but no error details available`);
    }
  }, [log]);

  // Add a new effect to initialize audio when audioUrl is set
  useEffect(() => {
    if (!audioUrl) return;
    
    // Create a temporary audio element to preload the audio
    const tempAudio = new Audio(audioUrl);
    
    // Set up event listeners directly rather than creating a nested function
    tempAudio.addEventListener('canplaythrough', () => {
      log.success('Audio preloaded and ready to play');
      setPersistentAudioElement(tempAudio);
      setAudioInitialized(true);
    });
    
    tempAudio.addEventListener('error', (e) => 
      handleAudioElementError(e, tempAudio, 'Failed to preload audio'));
    
    // Start loading the audio
    tempAudio.load();
    
    return () => {
      // Clean up the temporary audio element
      tempAudio.src = '';
    };
  }, [audioUrl, handleAudioElementError]);

  // Debug current sample
  useEffect(() => {
    if (currentSample) {
      log.info('Current sample:', currentSample);
      log.info(`Audio URL: ${audioUrl}`);
      log.info(`Transcript file: ${transcriptFile}`);
    }
  }, [currentSample, audioUrl, transcriptFile]);

  // Track component renders
  trackRender('Training');

  // Debug state changes
  useEffect(() => {
    if (!currentSelection) return;
    
    log.track('State', {
      audioDevices: audioDevices.length,
      selectedDevice,
      playbackRate,
      currentSelection: currentSelection ? 
        `${currentSelection.startTime.toFixed(2)}s - ${currentSelection.endTime.toFixed(2)}s (${currentSelection.wordCount} words)` : 
        'none',
      isTargetPlaying,
      isRecording,
      audioURL: audioURL ? Math.round(audioURL.length / 1024) + ' KB' : 'none',
      error: error ? error.message : 'none'
    });
  }, [
    audioDevices, 
    selectedDevice, 
    playbackRate, 
    currentSelection, 
    isTargetPlaying, 
    isRecording, 
    audioURL,
    error
  ]);

  // Load timestamps
  useEffect(() => {
    log.info(`Loading timestamps from CSV file: ${transcriptFile}`);
    const timer = createTimer('Load Timestamps');
    
    parseTimestampsCSV(transcriptFile)
      .then(data => {
        setTimestamps(data);
        log.success(`Loaded ${data.length} timestamps`);
        timer.stop();
      })
      .catch(err => {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        log.error('Failed to load timestamps:', errorObj);
      });
  }, [transcriptFile]);

  // Load audio devices
  useEffect(() => {
    log.info('Loading audio input devices');
    const timer = createTimer('Load Audio Devices');
    
    async function loadDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`
          }));
        
        setAudioDevices(audioInputs);
        log.success(`Found ${audioInputs.length} audio input devices`);
        
        // Set default device
        if (audioInputs.length > 0 && !selectedDevice) {
          const defaultDevice = audioInputs[0].deviceId;
          setSelectedDevice(defaultDevice);
          log.log(`Set default device: ${audioInputs[0].label}`);
        }
        
        timer.stop();
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        log.error('Error loading audio devices:', errorObj);
      }
    }
    
    loadDevices();
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, [selectedDevice]);

  const handlePlaybackRateChange = (rate: number) => {
    log.log(`Playback rate changed to ${rate}x`);
    setPlaybackRate(rate);
    if (visualizerRef.current) {
      visualizerRef.current.setPlaybackRate(rate);
    }
    if (targetVisualizerRef.current) {
      targetVisualizerRef.current.setPlaybackRate(rate);
    }
  };

  const handleSelectionChange = (selection: SelectionRange | null) => {
    log.log(`Selection changed: ${selection ? 
      `${selection.words.length} words, ${selection.startTime.toFixed(2)}s - ${selection.endTime.toFixed(2)}s` : 
      'cleared'}`);
    
    setCurrentSelection(selection);
    
    // Reset playhead position when selection changes
    if (selection) {
      setSelectionPlayheadTime(selection.startTime);
    }
  };

  // Utility function to stop all audio except for a specific source
  const stopAllAudioExcept = useCallback((exceptSource?: 'main' | 'target' | 'recording') => {
    // Stop target selection playback if needed
    if (exceptSource !== 'target' && isTargetPlaying) {
      log.log('Stopping target playback');
      setIsTargetPlaying(false);
      targetVisualizerRef.current?.pause();
    }
    
    // Stop recording playback if needed
    if (exceptSource !== 'recording' && isRecordingPlaying) {
      log.log('Stopping recording playback');
      setIsRecordingPlaying(false);
      if (recordingAudioRef.current) {
        recordingAudioRef.current.pause();
      }
    }
    
    // Stop main audio playback if needed
    if (exceptSource !== 'main' && isPlaying) {
      log.log('Stopping main audio playback');
      if (visualizerRef.current?.getAudioElement()) {
        visualizerRef.current.pause();
      } else if (persistentAudioElement) {
        persistentAudioElement.pause();
      }
      setIsPlaying(false);
    }
  }, [isTargetPlaying, isRecordingPlaying, isPlaying, targetVisualizerRef, recordingAudioRef, visualizerRef, persistentAudioElement]);

  // Play button for main sample audio
  const handleMainPlayButton = () => {
    log.log('Main play button clicked');
    log.log(`Current state - isPlaying: ${isPlaying}, isTargetPlaying: ${isTargetPlaying}, isRecordingPlaying: ${isRecordingPlaying}`);
    log.log(`Audio element status - ${visualizerRef.current?.getAudioElement() ? 'main audio exists' : 'no main audio'}`);
    log.log(`Audio initialized: ${audioInitialized}, Persistent audio element: ${persistentAudioElement ? 'available' : 'not available'}`);
    
    if (isPlaying) {
      // If currently playing, just stop main audio
      stopAllAudioExcept();
    } else {
      // If starting playback, make sure other sources are stopped
      stopAllAudioExcept('main');
      
      // Start main audio playback
      log.log('Starting main audio playback');
      
      // Try to use visualizer first
      const mainAudio = visualizerRef.current?.getAudioElement();
      
      if (mainAudio) {
        // If main audio has ended, reset it to the beginning
        if (mainAudio.ended) {
          log.log('Main audio was at end, resetting to beginning');
          mainAudio.currentTime = 0;
        }
        
        // Play using the visualizer's play method
        visualizerRef.current?.play();
        setIsPlaying(true);
      } 
      // Fall back to persistent audio element if visualizer isn't ready
      else if (persistentAudioElement && audioInitialized) {
        log.log('Using persistent audio element for playback');
        
        // Reset to beginning if needed
        if (persistentAudioElement.ended) {
          persistentAudioElement.currentTime = 0;
        }
        
        // Play the persistent audio element directly
        persistentAudioElement.play()
          .then(() => {
            log.success('Started playback using persistent audio element');
            setIsPlaying(true);
          })
          .catch(err => {
            log.error('Error playing persistent audio:', err);
          });
      } else {
        log.error('No audio element available for playback');
      }
    }
  };

  // Handle target audio play button click
  const handleTargetPlayButton = () => {
    log.log('Target play button clicked');
    
    if (isTargetPlaying) {
      // If already playing, just pause the playback
      stopAllAudioExcept();
    } else {
      // If starting playback, make sure other sources are stopped
      stopAllAudioExcept('target');
      
      log.log('Starting target playback');
      
      if (currentSelection && targetVisualizerRef.current) {
        // If we're at the end of the selection, reset to the beginning
        if (selectionPlayheadTime >= currentSelection.endTime - 0.1) {
          log.log('Resetting selection playhead to start for replay');
          setSelectionPlayheadTime(currentSelection.startTime);
        }
        
        // Start playback from current selection playhead position
        targetVisualizerRef.current.seek(selectionPlayheadTime);
        targetVisualizerRef.current.play();
        
        // Store the starting position for animation tracking
        playheadStartPositionRef.current = selectionPlayheadTime;
        playbackStartTimeRef.current = performance.now();
        
        // Set playing state - but ONLY for the target
        setIsTargetPlaying(true);
        
        // Just make sure audio context is maintained separately
      } else {
        log.warn('Cannot play target: No selection or visualizer reference');
      }
    }
  };

  // Set crosshair position based on current selection
  useEffect(() => {
    if (currentSelection && !isTargetPlaying) {
      log.log(`Setting crosshair to start position: ${currentSelection.startTime.toFixed(2)}s`);
      setSelectionPlayheadTime(currentSelection.startTime);
    }
  }, [currentSelection, isTargetPlaying]);

  // Track target audio playback position
  useEffect(() => {
    if (!isTargetPlaying || !currentSelection || !targetVisualizerRef.current) {
      return;
    }
    
    log.log(`Starting target audio tracking from ${playheadStartPositionRef.current.toFixed(2)}s`);
    
    // Track playback position using performance.now() for accuracy
    const startTime = playbackStartTimeRef.current;
    const startPosition = playheadStartPositionRef.current;
    const endTime = currentSelection.endTime;
    
    const interval = setInterval(() => {
      // Calculate elapsed time based on performance.now()
      const elapsedMs = performance.now() - startTime;
      const elapsedSec = elapsedMs / 1000 * playbackRate;
      
      // Calculate current position
      const currentPosition = startPosition + elapsedSec;
      
      // Debug log for tracking (but not too frequently)
      if (Math.round(currentPosition * 10) % 10 === 0) {
        log.log(`Target playback position: ${currentPosition.toFixed(2)}s / ${endTime.toFixed(2)}s`);
      }
      
      // Update playhead position
      setSelectionPlayheadTime(currentPosition);
      
      // Check if we've reached the end of the selection
      if (currentPosition >= endTime - 0.01) {
        log.log(`Reached end of selection (${endTime.toFixed(2)}s), stopping playback`);
        
        // Set to exact end position before stopping
        setSelectionPlayheadTime(endTime);
        
        // Stop target playback without affecting main audio
        const targetAudio = targetVisualizerRef.current?.getAudioElement();
        if (targetAudio) {
          targetAudio.pause();
          
          // ONLY update the target playing state, not the main playing state
          log.log('Target playback ended - NOT affecting main audio state');
          setIsTargetPlaying(false);
        }
        
        clearInterval(interval);
      }
    }, 16); // ~60fps updates
    
    return () => {
      log.log('Cleaning up target audio tracking');
      clearInterval(interval);
    };
  }, [isTargetPlaying, currentSelection, playbackRate, targetVisualizerRef]);

  // Updated handleRecordingPlayback with simplified error handling
  const handleRecordingPlayback = () => {
    if (!audioURL) {
      log.log('No recording available to play');
      return;
    }
    
    if (isRecordingPlaying) {
      // Stop playback
      stopAllAudioExcept();
    } else {
      // If starting playback, make sure other sources are stopped
      stopAllAudioExcept('recording');
      
      // Start playback with special focus on iOS compatibility
      log.log(`Attempting to play recording`);
      
      try {
        let audioElement: HTMLAudioElement;
        
        // Special fix for iOS
        if (isIOS) {
          // Create an audio element the iOS-friendly way
          audioElement = new Audio();
          
          // Set source AFTER attaching event listeners for iOS
          audioElement.addEventListener('canplay', () => {
            log.log('Audio can play event fired');
            
            // iOS requires play to be called from a user event handler
            const playPromise = audioElement.play();
            
            if (playPromise !== undefined) {
              playPromise.then(() => {
                log.log('Play promise resolved - playback started');
                setIsRecordingPlaying(true);
              }).catch(err => {
                log.error(`iOS play failed: ${err.message}`);
                setIsRecordingPlaying(false);
              });
            }
          });
        } else {
          // Non-iOS approach (simpler)
          audioElement = new Audio(audioURL);
        }
        
        // Common event listeners for both iOS and non-iOS
        audioElement.addEventListener('playing', () => {
          setIsRecordingPlaying(true);
        });
        
        audioElement.addEventListener('ended', () => {
          setIsRecordingPlaying(false);
        });
        
        audioElement.addEventListener('error', (e) => 
          handleAudioElementError(e, audioElement, 'Recording playback error'));
        
        // Common properties
        audioElement.volume = volume;
        audioElement.controls = false;
        audioElement.preload = 'auto';
        
        // For iOS, set source after listeners
        if (isIOS) {
          audioElement.src = audioURL;
          audioElement.load();
        } else {
          // For non-iOS, we can play directly
          const playPromise = audioElement.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsRecordingPlaying(true);
              })
              .catch(err => {
                log.error(`Play error: ${err.message}`);
                setIsRecordingPlaying(false);
              });
          } else {
            setIsRecordingPlaying(true);
          }
        }
        
        // Store reference for pause/stop functionality
        recordingAudioRef.current = audioElement;
      } catch (err) {
        log.error(`Audio error: ${err instanceof Error ? err.message : 'Unknown'}`);
        setError(err instanceof Error ? err : new Error("Playback error"));
      }
    }
  };

  // Update recording playback rate with a smoother transition
  useEffect(() => {
    if (recordingAudioRef.current) {
      log.log(`Setting recording playback rate to ${playbackRate}x`);
      
      // Apply playback rate change smoothly
      try {
        // TypeScript doesn't know about preservesPitch as it's not standard yet
        // Use a type assertion to avoid TypeScript errors
        const audioEl = recordingAudioRef.current as any;
        if ('preservesPitch' in audioEl) {
          audioEl.preservesPitch = true; // Maintain pitch when changing rate
        }
        recordingAudioRef.current.playbackRate = playbackRate;
      } catch (err) {
        // Fallback for browsers that don't support preservesPitch
        recordingAudioRef.current.playbackRate = playbackRate;
        log.warn('Browser might not support preservesPitch for audio playback');
      }
    }
  }, [playbackRate]);

  // Calculate playhead position as percentage
  const calculatePlayheadPosition = (time: number): number => {
    if (!currentSelection) return 0;
    
    const { startTime, endTime } = currentSelection;
    const range = endTime - startTime;
    
    if (range <= 0) return 0;
    
    // Calculate position as percentage within the selection range
    let position = ((time - startTime) / range) * 100;
    
    // Ensure position is within bounds
    position = Math.max(0, Math.min(position, 100));
    
    // Force position to 100% when very close to the end
    if (time > endTime - 0.01) {
      position = 100;
    }
    
    log.log(`Playhead position: ${position.toFixed(1)}% (${time.toFixed(2)}s / ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s)`);
    
    return position;
  };

  // Handle word click in target visualizer
  const handleWordClick = (timestamp: TimeStamp, index: number) => {
    log.log(`Word clicked in target visualizer: "${timestamp.word}" at ${timestamp.start.toFixed(2)}s (index ${index})`);
    
    if (isTargetPlaying) {
      log.log('Stopping playback before seeking');
      setIsTargetPlaying(false);
    }
    
    // Set the playhead to the clicked word's start time
    const clickedWordStart = timestamp.start;
    setSelectionPlayheadTime(clickedWordStart);
    
    // Update refs for tracking
    playheadStartPositionRef.current = clickedWordStart;
  };

  // Reset audio visualizers when audio URLs change
  useEffect(() => {
    // Add a small delay to ensure the DOM is ready
    const timer = setTimeout(() => {
      log.log('Refreshing audio visualizers');
      
      // Force refresh main visualizer
      if (visualizerRef.current) {
        log.log('Refreshing main visualizer');
        visualizerRef.current.seek(0);
      }
      
      // Force refresh target visualizer if there's a selection
      if (targetVisualizerRef.current && currentSelection) {
        log.log('Refreshing target visualizer');
        targetVisualizerRef.current.seek(currentSelection.startTime);
        setSelectionPlayheadTime(currentSelection.startTime);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentSelection, transcriptFile]);

  // Debug function to test audio files
  const testAudioFiles = useCallback(() => {
    if (!audioUrl || !transcriptFile) {
      // Don't log an error, just return silently since this is expected during initialization
      return;
    }
    
    log.log('Testing audio file access...');
    
    // Test main audio file
    const mainAudioTest = new Audio(audioUrl);
    mainAudioTest.addEventListener('canplaythrough', () => {
      log.log('Main audio file loaded successfully');
    });
    
    // Use the standardized error handling
    mainAudioTest.addEventListener('error', (e) => 
      handleAudioElementError(e, mainAudioTest, 'Error loading main audio file'));
    
    // Test CSV file - use existing parseTimestampsCSV which already has error handling
    fetch(transcriptFile)
      .then(response => {
        if (response.ok) {
          log.log('Transcript file loaded successfully');
          return response.text();
        } else {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
      })
      .then(text => {
        log.log(`Received ${text.length} bytes of text data`);
      })
      .catch(err => {
        log.error('Error loading transcript file:', err);
      });
  }, [audioUrl, transcriptFile, handleAudioElementError]);
  
  // Run the test on initial load
  useEffect(() => {
    testAudioFiles();
  }, [testAudioFiles]);

  // Handle volume change 
  const handleVolumeChange = (newVolume: number) => {
    log.log(`Volume changed to ${newVolume.toFixed(2)}`);
    
    setVolume(newVolume);
    
    // Update volume in both visualizers
    if (visualizerRef.current) {
      visualizerRef.current.setVolume(newVolume);
    }
    
    if (targetVisualizerRef.current) {
      targetVisualizerRef.current.setVolume(newVolume);
    }
    
    // Also update recording audio volume if present
    if (recordingAudioRef.current) {
      recordingAudioRef.current.volume = newVolume;
    }
  };
  
  // Volume adjustment functions
  const increaseVolume = () => {
    const newVolume = Math.min(1.0, volume + 0.1); // Increase by 10% with max at 100%
    handleVolumeChange(newVolume);
  };
  
  const decreaseVolume = () => {
    const newVolume = Math.max(0, volume - 0.1); // Decrease by 10% with min at 0%
    handleVolumeChange(newVolume);
  };

  // Add a new function to handle the volume slider drag
  const handleVolumeSliderDrag = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, sliderRef: React.RefObject<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    
    // Determine if this is a touch or mouse event
    let clientY: number;
    
    if ((e as TouchEvent).touches) {
      clientY = (e as TouchEvent).touches[0].clientY;
    } else {
      clientY = (e as MouseEvent).clientY;
    }
    
    // Get slider dimensions
    const rect = sliderRef.current.getBoundingClientRect();
    const sliderHeight = rect.height;
    const offsetY = clientY - rect.top;
    
    // Calculate new volume (invert because slider is vertical - top is max, bottom is min)
    let newVolume = 1 - (offsetY / sliderHeight);
    
    // Clamp volume between 0 and 1
    newVolume = Math.max(0, Math.min(1, newVolume));
    
    // Update volume
    handleVolumeChange(newVolume);
  }, [handleVolumeChange]);

  // Toggle volume slider visibility
  const toggleVolumeSlider = useCallback(() => {
    log.log('Toggling volume slider');
    setShowVolumeSlider(prev => !prev);
  }, []);

  // Toggle playback rate menu visibility
  const togglePlaybackRateMenu = useCallback(() => {
    log.log('Toggling playback rate menu');
    setShowPlaybackRateMenu(prev => !prev);
  }, []);

  // Close volume slider when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        volumeControlRef.current && 
        !volumeControlRef.current.contains(event.target as Node) &&
        showVolumeSlider
      ) {
        log.log('Closing volume slider');
        setShowVolumeSlider(false);
      }

      if (
        playbackRateControlRef.current && 
        !playbackRateControlRef.current.contains(event.target as Node) &&
        showPlaybackRateMenu
      ) {
        log.log('Closing playback rate menu');
        setShowPlaybackRateMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showVolumeSlider, showPlaybackRateMenu]);

  // Debug helper for audio elements
  useEffect(() => {
    if (recordingAudioRef.current) {
      log.log('Recording audio element available');
    }
  }, [recordingAudioRef.current, audioURL]);

  // Debug rendering
  log.log('Rendering Training component');

  // When audioURL changes, update the recording audio element
  useEffect(() => {
    if (audioURL) {
      log.log(`Creating recording audio element for URL: ${audioURL.substring(0, 30)}...`);
      
      // Create audio element
      try {
        // Create fresh Audio element each time for better iOS compatibility
        const audioEl = new Audio(audioURL);
        
        // Set volume
        audioEl.volume = volume;
        
        // Set playback rate
        audioEl.playbackRate = playbackRate;
        
        // Try to preserve pitch if supported
        try {
          if ('preservesPitch' in audioEl) {
            audioEl.preservesPitch = true;
            log.log('Enabled preservesPitch for recording audio');
          }
        } catch (err) {
          // Ignore errors for browsers that don't support this
        }
        
        // Set up event listeners for better cross-device compatibility
        audioEl.addEventListener('ended', () => {
          log.log('Recording audio playback ended');
          setIsRecordingPlaying(false);
        });
        
        audioEl.addEventListener('canplaythrough', () => {
          log.log('Recording audio can play through');
        });
        
        audioEl.addEventListener('error', (e) => {
          const error = audioEl.error;
          // Handle SyntheticBaseEvent by checking if error exists
          if (error) {
            log.error(`Audio error: ${error.code}`);
          } else {
            // Don't log errors for SyntheticBaseEvents without actual error data
            log.log('Audio element error event triggered but no error details available');
          }
          setIsRecordingPlaying(false);
        });
        
        // Handle iOS specific needs
        if (isIOS) {
          // iOS sometimes needs a user gesture to enable audio
          // We'll preload the audio to improve playback responsiveness
          audioEl.preload = 'auto';
          
          // Force load for iOS
          audioEl.load();
        }
        
        // Update ref
        recordingAudioRef.current = audioEl;
        
        log.log(`Recording audio element created: ${audioURL.substring(0, 30)}...`);
      } catch (error) {
        log.error('Error creating audio element:', error);
        recordingAudioRef.current = null;
      }
    } else if (!audioURL && recordingAudioRef.current) {
      log.log('Cleaning up recording audio element');
      // Clean up previous audio
      recordingAudioRef.current = null;
    }
  }, [audioURL, volume, playbackRate, isIOS]);

  // Update the useEffect that handles recording ended event
  useEffect(() => {
    if (recordingAudioRef.current) {
      const handleEnded = () => {
        log.log('Recording playback ended');
        log.log(`Current state - isPlaying: ${isPlaying}, isTargetPlaying: ${isTargetPlaying}, isRecordingPlaying: ${isRecordingPlaying}`);
        
        // Only set the recording playing flag to false
        // Do NOT affect the main audio isPlaying state
        setIsRecordingPlaying(false);
        
        log.log('Recording playback ended - main audio state remains unchanged');
      };
      
      recordingAudioRef.current.addEventListener('ended', handleEnded);
      log.log('Adding ended listener to recording audio element');
      
      return () => {
        if (recordingAudioRef.current) {
          recordingAudioRef.current.removeEventListener('ended', handleEnded);
          log.log('Removing ended listener from recording audio element');
        }
      };
    }
  }, [recordingAudioRef.current, isRecordingPlaying]);

  // Determine which audio source to use for visualization
  const determineAudioSource = () => {
    log.log('==== AUDIO SOURCE DETERMINATION ====');
    log.log(`State flags - isPlaying: ${isPlaying}, isTargetPlaying: ${isTargetPlaying}, isRecordingPlaying: ${isRecordingPlaying}`);
    
    let selectedSource = 'none';
    let audioElement: HTMLAudioElement | null = null;
    
    // Check if recording is available and playing
    const recordingAvailable = !!(isRecordingPlaying && recordingAudioRef.current);
    
    // Check if target selection is available and playing
    const targetAudioElement = targetVisualizerRef.current?.getAudioElement();
    const targetAvailable = !!(isTargetPlaying && targetAudioElement);
    
    // Check if main audio is available and playing
    const mainAudioElement = visualizerRef.current?.getAudioElement();
    const mainAvailable = !!(isPlaying && mainAudioElement);
    
    // Check if persistent audio is available
    const persistentAvailable = !!(persistentAudioElement && audioInitialized);
    
    log.log(`Source availability - recording: ${recordingAvailable}, target: ${targetAvailable}, main: ${mainAvailable}, persistent: ${persistentAvailable}`);
    
    // Priority: recording > target > main
    if (recordingAvailable) {
      selectedSource = 'recording';
      audioElement = recordingAudioRef.current;
    } else if (targetAvailable && targetAudioElement) {
      selectedSource = 'target';
      audioElement = targetAudioElement;
    } else if (mainAvailable && mainAudioElement) {
      selectedSource = 'main';
      audioElement = mainAudioElement;
    } else if (persistentAvailable) {
      selectedSource = 'persistent';
      audioElement = persistentAudioElement;
    }
    
    if (selectedSource !== 'none') {
      log.log(`Selected source: ${selectedSource}`);
    }
    
    return { source: selectedSource, element: audioElement };
  };
  
  // Update the useEffect to set up the persistent audio element when component mounts
  useEffect(() => {
    // Update persistent audio element reference when visualizer audio element changes
    const updatePersistentAudio = () => {
      const mainAudio = visualizerRef.current?.getAudioElement();
      
      if (mainAudio) {
        if (!persistentAudioElement) {
          log.log('Setting main audio as persistent audio element for the first time');
          setPersistentAudioElement(mainAudio);
        } else if (persistentAudioElement !== mainAudio) {
          log.log('Updating persistent audio element reference');
          setPersistentAudioElement(mainAudio);
        } else {
          log.log('Persistent audio element already set and up to date');
        }
      }
    };
    
    // Initial setup
    updatePersistentAudio();
    
    // Set up an interval to periodically check and update
    const interval = setInterval(updatePersistentAudio, 2000);
    
    return () => {
      clearInterval(interval);
    };
  }, [persistentAudioElement, visualizerRef]);

  // Fix the handleTargetReachedEnd function
  const handleTargetReachedEnd = () => {
    if (!currentSelection) return;
    
    log.log(`Reached end of selection (${currentSelection.endTime.toFixed(2)}s), stopping playback`);
    
    // Just stop the target playback without affecting main audio
    const targetAudio = targetVisualizerRef.current?.getAudioElement();
    if (targetAudio) {
      targetAudio.pause();
      
      // Update the target playing state only
      log.log('✅ Target playback ended - keeping this independent from main audio');
      setIsTargetPlaying(false);
    }
  };

  // Add CSS for recording indicator animation
  useEffect(() => {
    // Create style element if it doesn't exist
    let styleEl = document.getElementById('recording-indicator-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'recording-indicator-style';
      styleEl.innerHTML = `
        @keyframes pulse-recording {
          0% { transform: scale(1); opacity: 0.75; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .recording-indicator-pulse {
          animation: pulse-recording 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `;
      document.head.appendChild(styleEl);
    }
    
    return () => {
      // Clean up on unmount
      const styleToRemove = document.getElementById('recording-indicator-style');
      if (styleToRemove) {
        document.head.removeChild(styleToRemove);
      }
    };
  }, []);

  // Recording control functions with clear names
  const handleStartRecording = async () => {
    if (!selectedDevice) {
      setError(new Error('Please select a microphone before recording'));
      return;
    }
    
    try {
      await startRecording();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Recording failed"));
    }
  };
  
  const handleStopRecording = () => {
    stopRecording();
    
    // Show recording saved notification
    setRecordingSaved(true);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setRecordingSaved(false);
    }, 3000);
    
    // On iOS, we need special cleanup
    if (isIOS && recordingAudioRef.current) {
      setTimeout(() => {
        recordingAudioRef.current = null;
      }, 100);
    }
  };

  return (
    <div className="container mx-auto p-4 bg-white">
      
      {/* Person info section */}
      {person && currentSample && (
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg overflow-hidden shadow-md">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center">
              {/* Profile Image */}
              <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                <img 
                  src={`${basePath}${person.images.profile}`} 
                  alt={person.name}
                  className="h-24 w-24 rounded-full border-4 border-white shadow-lg object-cover bg-white"
                  onError={(e) => {
                    // Fallback for missing images - display initials
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    
                    // Create a div to display person's initials
                    const parent = target.parentNode as HTMLElement;
                    const initialsDiv = document.createElement('div');
                    initialsDiv.className = "h-24 w-24 rounded-full border-4 border-white shadow-lg bg-indigo-600 flex items-center justify-center";
                    
                    // Get initials from name
                    const initials = person.name
                      .split(' ')
                      .map(word => word.charAt(0))
                      .join('')
                      .toUpperCase()
                      .substring(0, 2);
                    
                    // Create text content with person's initials
                    const textContent = document.createElement('span');
                    textContent.className = "text-2xl font-bold text-white";
                    textContent.textContent = initials;
                    
                    initialsDiv.appendChild(textContent);
                    parent.appendChild(initialsDiv);
                  }}
                />
        </div>
              
              {/* Person Info */}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{person.name}</h1>
                <p className="text-blue-100 text-lg mb-2">{person.title}</p>
                
                <div className="flex items-center mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    person.difficulty === 'easy' 
                      ? 'bg-green-500 text-white' 
                      : person.difficulty === 'medium'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-red-500 text-white'
                  }`}>
                    {person.difficulty.toUpperCase()} DIFFICULTY
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sample Info Bar */}
          <div className="bg-indigo-900 py-3 px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="flex items-center">
                <span className="mr-2 text-indigo-200">Current Sample:</span>
                <h2 className="text-lg font-semibold text-white">{currentSample.title}</h2>
              </div>
              <p className="text-indigo-200 mt-1 md:mt-0 text-sm md:text-base">{currentSample.description}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Target audio section */}
      <div className="mb-8 p-4 bg-slate-100 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Target Audio</h2>
        <div className="mb-4">
          <AudioVisualizer 
            ref={visualizerRef}
            audioUrl={audioUrl}
            timestamps={timestamps}
            onSelectionChange={handleSelectionChange}
            onPlaybackRateChange={handlePlaybackRateChange}
            onPlayingChange={(playing) => {
              // This is called when the main audio playing state changes
              // Only update the main isPlaying state
              if (isPlaying !== playing) {
                log.log(`Main audio playing state changed to: ${playing}`);
                setIsPlaying(playing);
              }
            }}
            isPlaying={isPlaying}
            debugName="main-visualizer"
          />
        </div>
        
        <div className="flex space-x-4 mb-4">
          {/* Audio controls section */}
          <div className="flex space-x-3 items-center mt-4">
            {/* Play button */}
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
              onClick={handleMainPlayButton}
            >
              <span className="mr-2">
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </span>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            
            {/* Clear selection button - moved from selected words section */}
              <button
              className={`px-3 py-2 rounded text-sm ${currentSelection ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
              onClick={() => {
                if (visualizerRef.current && currentSelection) {
                  log.log('Clearing word selection');
                  
                  // Clear selection in both visualizers
                  visualizerRef.current.clearSelection();
                  
                  // Also reset the target visualizer if it exists
                  if (targetVisualizerRef.current) {
                    targetVisualizerRef.current.clearSelection();
                  }
                  
                  // Make sure to update the current selection state
                  setCurrentSelection(null);
                  setSelectionPlayheadTime(0);
                }
              }}
              disabled={!currentSelection}
            >
              Clear Selection
              </button>
            
            {/* Playback rate dropdown button */}
            <div className="relative" ref={playbackRateControlRef}>
              <button
                className="flex items-center space-x-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-2 rounded transition-colors"
                onClick={togglePlaybackRateMenu}
                title="Adjust playback rate"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 18l8.5-6L4 6v12zm9 0l8.5-6L13 6v12z"/>
                </svg>
                <span className="inline-block w-8 text-center">{playbackRate}x</span>
              </button>
              
              {/* Playback rate menu - conditionally rendered */}
              {showPlaybackRateMenu && (
                <div className="absolute p-2 bg-white shadow-md rounded-md z-10 border border-gray-300" 
                     style={{ left: 'calc(100% + 4px)', top: '0' }}>
                  <div className="flex flex-col">
                    {[0.5, 0.75, 1, 1.25, 1.5].map((rate) => (
                      <button 
                        key={rate}
                        className={`px-3 py-1 text-left hover:bg-blue-100 rounded-sm transition-colors ${rate === playbackRate ? 'bg-blue-100 font-medium' : ''}`}
                        onClick={() => {
                          handlePlaybackRateChange(rate);
                          setShowPlaybackRateMenu(false);
                        }}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Volume button */}
            <div className="relative" ref={volumeControlRef}>
              <button
                className="flex items-center space-x-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-2 rounded transition-colors"
                onClick={toggleVolumeSlider}
                title="Adjust volume"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                </svg>
                <span className="inline-block w-8 text-center">{Math.round(volume * 100)}%</span>
              </button>
              
              {/* Volume slider popup - conditionally rendered */}
              {showVolumeSlider && (
                <div className="absolute p-2 bg-white shadow-md rounded-md z-10 border border-gray-300" 
                     style={{ left: 'calc(100% + 4px)', top: '0' }}>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="relative h-28 w-2 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 transition-colors"
                      ref={volumeSliderRef}
                      onClick={(e) => handleVolumeSliderDrag(e, volumeSliderRef)}
                      onMouseDown={(e) => {
                        const handleMouseMove = (moveEvent: MouseEvent) => {
                          handleVolumeSliderDrag(moveEvent, volumeSliderRef);
                        };
                        
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                        
                        // Initial position
                        handleVolumeSliderDrag(e, volumeSliderRef);
                      }}
                      onTouchStart={(e) => {
                        const handleTouchMove = (moveEvent: TouchEvent) => {
                          handleVolumeSliderDrag(moveEvent, volumeSliderRef);
                        };
                        
                        const handleTouchEnd = () => {
                          document.removeEventListener('touchmove', handleTouchMove);
                          document.removeEventListener('touchend', handleTouchEnd);
                        };
                        
                        document.addEventListener('touchmove', handleTouchMove);
                        document.addEventListener('touchend', handleTouchEnd);
                        
                        // Initial position
                        handleVolumeSliderDrag(e, volumeSliderRef);
                      }}
                    >
                      {/* Filled area */}
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-full transition-all duration-100"
                        style={{ height: `${volume * 100}%` }}
                      />
                      
                      {/* Draggable knob */}
                      <div 
                        className="absolute w-4 h-4 bg-white border border-blue-500 rounded-full shadow-sm hover:shadow-md active:shadow-sm transition-all transform -translate-x-1 -translate-y-1/2 flex items-center justify-center"
                        style={{ 
                          top: `${100 - (volume * 100)}%`,
                          cursor: 'grab',
                        }}
                      >
                        <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected audio section - always render */}
      <div className="mb-8 p-4 bg-slate-100 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">Selected Audio</h2>
        </div>
        
        {/* Playback controls */}
        <div className="mb-4">
          <div className="flex space-x-4 mb-4">
                <button
              className={`text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center w-52 ${currentSelection ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-300 cursor-not-allowed'}`}
              onClick={handleTargetPlayButton}
              disabled={!currentSelection}
            >
              <span className="mr-2">
                {isTargetPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </span>
              {isTargetPlaying ? 'Stop' : 'Play Selection'}
                </button>
            
            {/* Recording playback button - always visible but disabled when no recording */}
                        <button
              className={`${audioURL ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'} text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center w-52`}
              onClick={handleRecordingPlayback}
              onMouseEnter={() => audioURL && setIsHoveringRecordButton(true)}
              onMouseLeave={() => audioURL && setIsHoveringRecordButton(false)}
              onTouchStart={() => audioURL && setIsHoveringRecordButton(true)}
              onTouchEnd={() => audioURL && setIsHoveringRecordButton(false)}
              disabled={!audioURL}
            >
              <span className="mr-2">
                {isRecordingPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </span>
              {isRecordingPlaying ? 'Pause' : 'Play Recording'}
            </button>
                    </div>
                  </div>
        
        {/* Audio Waveform Visualization */}
        <div className="mt-4 mb-4 max-w-[800px] w-full">
          
          {/* Render the waveform component with explicit element determination */}
          {(() => {
            // Determine which audio element to use
            const { source, element } = determineAudioSource();
            
            // Determine if audio is playing
            const isAudioPlaying = isTargetPlaying || isRecordingPlaying || isPlaying;
            
            // Determine the color based on playing state and hover state
            const waveformColor = isTargetPlaying 
              ? '#00ff00'  // Bright neon green for sample audio
              : isRecordingPlaying || isHoveringRecordButton 
                ? '#00bfff'  // Bright cyan blue for recording or when hovering over recording button
                : '#00ff00';  // Default to neon green when idle
            
            // Determine the background color based on state
            const waveformBackgroundColor = isRecordingPlaying || isHoveringRecordButton
              ? '#000000'  // Black for recording mode (previously light blue)
              : '#000000';  // Black for default (previously light gray)
            
            return (
              <AudioWaveform 
                audioElement={element}
                isPlaying={isAudioPlaying}
                color={waveformColor}
                backgroundColor={waveformBackgroundColor}
                height={150}
                className={isRecordingPlaying ? 'recording-waveform' : ''}
              />
            );
          })()}
              </div>
        
        {/* Microphone and recording controls - moved here */}
        <div className="mb-4 mt-6">
          <div className="flex space-x-4 items-center">
            
          
            {/* Record button */}
            <div className="flex items-center">
                        <button
                className={`${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white px-4 py-2 rounded-lg transition-colors w-52`}
                          onClick={() => {
                  log.log(`Record button clicked, current state: ${isRecording ? 'recording' : 'not recording'}`);
                  if (isRecording) {
                    handleStopRecording();
                  } else {
                    handleStartRecording();
                  }
                }}
              >
                {isRecording ? 'Stop Recording' : 'New Recording'}
                        </button>
              
              {/* Pulsing recording indicator */}
              {isRecording && (
                <div className="ml-3 flex items-center">
                  <div className="relative">
                    <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-3 h-3 bg-red-600 rounded-full animate-ping recording-indicator-pulse opacity-75"></div>
                  </div>
                  <span className="ml-2 text-sm text-red-600 font-medium">Recording</span>
                </div>
              )}
              
              {/* Recording saved notification */}
              {recordingSaved && (
                <div className="ml-3 flex items-center animate-fadeIn">
                  <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-1 rounded-md shadow-sm flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-sm">Recording saved!</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Selected audio transcript section removed as requested */}
        
      </div>
      
      {/* Microphone selection section */}
      <div className="bg-white shadow-sm rounded-lg p-4 mb-4">
        <h3 className="text-lg font-medium mb-2">Microphone Settings</h3>
        <div className="flex items-center">
          <label className="flex items-center text-sm font-medium">
            <span className="mr-2">Select Input Device:</span>
            <select 
              className="border rounded p-2 bg-white text-gray-800"
              value={selectedDevice}
              onChange={(e) => {
                log.log(`Microphone changed to ${e.target.value}`);
                setSelectedDevice(e.target.value);
              }}
            >
              {audioDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </label>
            </div>
          </div>

          
      {/* Hide target visualizer but keep it in the DOM for audio functionality */}
      <div style={{ display: 'none', height: 0, overflow: 'hidden' }}>
              <AudioVisualizer 
          ref={targetVisualizerRef}
          audioUrl={audioUrl}
          timestamps={currentSelection ? currentSelection.words : []}
          isPlaying={isTargetPlaying}
          currentTime={selectionPlayheadTime}
          onTimestampClick={handleWordClick}
          onPlayingChange={(playing) => {
            // This is called when the target audio ends naturally
            // We only update isTargetPlaying, NOT the main isPlaying state
            if (!playing && isTargetPlaying) {
              log.log('Target audio ended naturally, keeping main audio state unchanged');
              setIsTargetPlaying(false);
            }
          }}
          readOnly={true}
          debugName="selection-visualizer"
        />
              </div>


      {/* Hidden div for audio element and other non-visual elements */}
      <div style={{ display: 'none' }}>
        {/* Hidden div to render timestamp boxes for clicking */}
        {timestamps.map((timestamp, index) => (
          <div 
            key={index}
            onClick={() => handleWordClick(timestamp, index)}
          >
            {timestamp.word}
              </div>
        ))}
      </div>
      {/* Tips section moved to bottom of target audio as requested */}
      {person && currentSample && currentSample.tips.length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
          <h3 className="font-semibold mb-2 text-yellow-800">Tips for Imitation:</h3>
          <ul className="list-disc list-inside space-y-1">
            {currentSample.tips.map((tip, index) => (
              <li key={index} className="text-gray-700">{tip}</li>
            ))}
          </ul>
            </div>
          )}
        </div>
  );
}