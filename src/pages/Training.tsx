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

export const Training = () => {
  // Debug logger
  const debug = useDebug('Training');
  
  // URL params
  const [searchParams] = useSearchParams();

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
  const [transcriptFile, setTranscriptFile] = useState(
    searchParams.get('transcript') || '/data/timestamps.csv'
  );

  // Refs
  const visualizerRef = useRef<AudioVisualizerHandle>(null);
  const targetVisualizerRef = useRef<AudioVisualizerHandle>(null);
  const recordingAudioRef = useRef<HTMLAudioElement | null>(null);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const volumeControlRef = useRef<HTMLDivElement>(null);
  const playbackRateControlRef = useRef<HTMLDivElement>(null);
  
  // Recording state
  const { audioURL, isRecording, startRecording, stopRecording } = useVoiceRecorder();
  
  // Timing references
  const playbackStartTimeRef = useRef<number>(0);
  const playheadStartPositionRef = useRef<number>(0);
  
  // Add a persistent audio element reference at the top of the component
  const [persistentAudioElement, setPersistentAudioElement] = useState<HTMLAudioElement | null>(null);
  
  // Debug state changes
  useEffect(() => {
    if (!currentSelection) return;
    
    debug.track('State', {
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
    debug.log(`Loading timestamps from CSV file: ${transcriptFile}`);
    const timer = createTimer('Load Timestamps');
    
    parseTimestampsCSV(transcriptFile)
      .then(data => {
        setTimestamps(data);
        debug.success(`Loaded ${data.length} timestamps`);
        timer.stop();
      })
      .catch(err => {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        debug.error('Failed to load timestamps:', errorObj);
      });
  }, [transcriptFile]);

  // Load audio devices
  useEffect(() => {
    debug.log('Loading audio input devices');
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
        debug.success(`Found ${audioInputs.length} audio input devices`);
        
        // Set default device
        if (audioInputs.length > 0 && !selectedDevice) {
          const defaultDevice = audioInputs[0].deviceId;
          setSelectedDevice(defaultDevice);
          debug.log(`Set default device: ${audioInputs[0].label}`);
        }
        
        timer.stop();
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        debug.error('Error loading audio devices:', errorObj);
      }
    }
    
    loadDevices();
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, [selectedDevice]);

  const handlePlaybackRateChange = (rate: number) => {
    debug.log(`Playback rate changed to ${rate}x`);
    setPlaybackRate(rate);
    if (visualizerRef.current) {
      visualizerRef.current.setPlaybackRate(rate);
    }
    if (targetVisualizerRef.current) {
      targetVisualizerRef.current.setPlaybackRate(rate);
    }
  };

  const handleSelectionChange = (selection: SelectionRange | null) => {
    debug.log(`Selection changed: ${selection ? 
      `${selection.words.length} words, ${selection.startTime.toFixed(2)}s - ${selection.endTime.toFixed(2)}s` : 
      'cleared'}`);
    
    setCurrentSelection(selection);
    
    // Reset playhead position when selection changes
    if (selection) {
      setSelectionPlayheadTime(selection.startTime);
    }
  };

  // Play button for main sample audio
  const handleMainPlayButton = () => {
    debug.log('Main play button clicked');
    debug.log(`Current state - isPlaying: ${isPlaying}, isTargetPlaying: ${isTargetPlaying}, isRecordingPlaying: ${isRecordingPlaying}`);
    debug.log(`Audio element status - ${visualizerRef.current?.getAudioElement() ? 'main audio exists' : 'no main audio'}`);
    
    if (isPlaying) {
      // If currently playing, pause main audio
      debug.log('Pausing main audio playback');
      visualizerRef.current?.pause();
      setIsPlaying(false);
    } else {
      // If starting playback, make sure other sources are stopped
      if (isTargetPlaying) {
        debug.log('Stopping target playback before starting main audio');
        setIsTargetPlaying(false);
        targetVisualizerRef.current?.pause();
      }
      
      if (isRecordingPlaying) {
        debug.log('Stopping recording playback before starting main audio');
        setIsRecordingPlaying(false);
        if (recordingAudioRef.current) {
          recordingAudioRef.current.pause();
        }
      }
      
      // Start main audio playback
      debug.log('Starting main audio playback');
      
      // If main audio has ended, reset it to the beginning
      const mainAudio = visualizerRef.current?.getAudioElement();
      if (mainAudio && mainAudio.ended) {
        debug.log('Main audio was at end, resetting to beginning');
        mainAudio.currentTime = 0;
      }
      
      // Play using the visualizer's play method
      visualizerRef.current?.play();
      setIsPlaying(true);
    }
  };

  // Handle target audio play button click
  const handleTargetPlayButton = () => {
    debug.log('Target play button clicked');
    
    if (isTargetPlaying) {
      // If already playing, just pause the playback
      debug.log('Stopping target playback');
      targetVisualizerRef.current?.pause();
      setIsTargetPlaying(false);
    } else {
      debug.log('Starting target playback');
      
      // If recording is playing, stop it
      if (isRecordingPlaying) {
        debug.log('Stopping recording playback before playing target audio');
        setIsRecordingPlaying(false);
        if (recordingAudioRef.current) {
          recordingAudioRef.current.pause();
        }
      }
      
      if (currentSelection && targetVisualizerRef.current) {
        // If we're at the end of the selection, reset to the beginning
        if (selectionPlayheadTime >= currentSelection.endTime - 0.1) {
          debug.log('Resetting selection playhead to start for replay');
          setSelectionPlayheadTime(currentSelection.startTime);
        }
        
        // Set up tracking variables
        playheadStartPositionRef.current = selectionPlayheadTime;
        playbackStartTimeRef.current = performance.now();
        
        // Seek to the current selection start time and play
        targetVisualizerRef.current.seek(selectionPlayheadTime);
        targetVisualizerRef.current.play();
        setIsTargetPlaying(true);
        
        // Don't change the main isPlaying state
        // Just make sure audio context is maintained separately
      } else {
        debug.warn('Cannot play target: No selection or visualizer reference');
      }
    }
  };

  // Set crosshair position based on current selection
  useEffect(() => {
    if (currentSelection && !isTargetPlaying) {
      debug.log(`Setting crosshair to start position: ${currentSelection.startTime.toFixed(2)}s`);
      setSelectionPlayheadTime(currentSelection.startTime);
    }
  }, [currentSelection, isTargetPlaying]);

  // Track target audio playback position
  useEffect(() => {
    if (!isTargetPlaying || !currentSelection || !targetVisualizerRef.current) {
      return;
    }
    
    debug.log(`Starting target audio tracking from ${playheadStartPositionRef.current.toFixed(2)}s`);
    
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
        debug.log(`Target playback position: ${currentPosition.toFixed(2)}s / ${endTime.toFixed(2)}s`);
      }
      
      // Update playhead position
      setSelectionPlayheadTime(currentPosition);
      
      // Check if we've reached the end of the selection
      if (currentPosition >= endTime - 0.01) {
        debug.log(`Reached end of selection (${endTime.toFixed(2)}s), stopping playback`);
        
        // Set to exact end position before stopping
        setSelectionPlayheadTime(endTime);
        
        // Stop target playback without affecting main audio
        const targetAudio = targetVisualizerRef.current?.getAudioElement();
        if (targetAudio) {
          targetAudio.pause();
          
          // ONLY update the target playing state, not the main playing state
          debug.log('Target playback ended - NOT affecting main audio state');
          setIsTargetPlaying(false);
        }
        
        clearInterval(interval);
      }
    }, 16); // ~60fps updates
    
    return () => {
      debug.log('Cleaning up target audio tracking');
      clearInterval(interval);
    };
  }, [isTargetPlaying, currentSelection, playbackRate, targetVisualizerRef]);

  const handleRecordingPlayback = () => {
    debug.log('Recording playback button clicked');
    
    if (isRecordingPlaying) {
      // If already playing, pause the recording
      debug.log('Pausing recording playback');
      if (recordingAudioRef.current) {
        recordingAudioRef.current.pause();
      }
      setIsRecordingPlaying(false);
    } else {
      // If starting playback, make sure target source is stopped
      if (isTargetPlaying) {
        debug.log('Stopping target playback before starting recording');
        setIsTargetPlaying(false);
        targetVisualizerRef.current?.pause();
      }
      
      // Start recording playback
      debug.log('Starting recording playback');
      if (recordingAudioRef.current) {
        recordingAudioRef.current.currentTime = 0;
        recordingAudioRef.current.play().catch(err => {
          debug.error(`Error playing recording: ${err.message}`);
        });
      }
      setIsRecordingPlaying(true);
      // Do NOT change the main isPlaying state
    }
  };

  // Update recording playback rate
  useEffect(() => {
    if (recordingAudioRef.current) {
      debug.log(`Setting recording playback rate to ${playbackRate}x`);
      recordingAudioRef.current.playbackRate = playbackRate;
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
    
    debug.log(`Playhead position: ${position.toFixed(1)}% (${time.toFixed(2)}s / ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s)`);
    
    return position;
  };

  // Handle word click in target visualizer
  const handleWordClick = (timestamp: TimeStamp, index: number) => {
    debug.log(`Word clicked in target visualizer: "${timestamp.word}" at ${timestamp.start.toFixed(2)}s (index ${index})`);
    
    if (isTargetPlaying) {
      debug.log('Stopping playback before seeking');
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
      debug.log('Refreshing audio visualizers');
      
      // Force refresh main visualizer
      if (visualizerRef.current) {
        debug.log('Refreshing main visualizer');
        visualizerRef.current.seek(0);
      }
      
      // Force refresh target visualizer if there's a selection
      if (targetVisualizerRef.current && currentSelection) {
        debug.log('Refreshing target visualizer');
        targetVisualizerRef.current.seek(currentSelection.startTime);
        setSelectionPlayheadTime(currentSelection.startTime);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentSelection, transcriptFile]);

  // Debug function to test audio files
  const testAudioFiles = useCallback(() => {
    debug.log('Testing audio file access...');
    
    // Test main audio file
    const mainAudioTest = new Audio('/samples/mr_freeman.wav');
    mainAudioTest.addEventListener('canplaythrough', () => {
      debug.success('Main audio file loaded successfully');
    });
    mainAudioTest.addEventListener('error', (e) => {
      debug.error('Error loading main audio file:', e);
    });
    
    // Test CSV file
    fetch('/data/timestamps.csv')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        return response.text();
      })
      .then(text => {
        debug.success('CSV file loaded successfully', text.slice(0, 100) + '...');
      })
      .catch(err => {
        debug.error('Error loading CSV file:', err);
      });
  }, []);
  
  // Run the test on initial load
  useEffect(() => {
    testAudioFiles();
  }, [testAudioFiles]);

  // Handle volume change 
  const handleVolumeChange = (newVolume: number) => {
    debug.log(`Volume changed to ${newVolume.toFixed(2)}`);
    
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
    setShowVolumeSlider(prev => !prev);
  }, []);

  // Toggle playback rate menu visibility
  const togglePlaybackRateMenu = useCallback(() => {
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
        setShowVolumeSlider(false);
      }

      if (
        playbackRateControlRef.current && 
        !playbackRateControlRef.current.contains(event.target as Node) &&
        showPlaybackRateMenu
      ) {
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
      debug.log('Recording audio element available');
    }
  }, [recordingAudioRef.current, audioURL]);

  // Debug rendering
  debug.log('Rendering Training component');

  // Initialize recording audio element
  useEffect(() => {
    if (audioURL && !recordingAudioRef.current) {
      debug.log('Creating recording audio element');
      // Create the audio element programmatically
      const audioElement = new Audio(audioURL);
      audioElement.addEventListener('play', () => {
        debug.log('Recording audio playback started');
        setIsRecordingPlaying(true);
      });
      audioElement.addEventListener('pause', () => {
        debug.log('Recording audio playback paused');
        setIsRecordingPlaying(false);
      });
      audioElement.addEventListener('ended', () => {
        debug.log('Recording audio playback ended');
        setIsRecordingPlaying(false);
      });
      audioElement.addEventListener('error', (e) => {
        debug.error('Recording audio error:', e);
        setIsRecordingPlaying(false);
      });
      
      // Assign to ref
      recordingAudioRef.current = audioElement;
      
      debug.log(`Recording audio element created: ${audioURL.substring(0, 30)}...`);
    } else if (!audioURL && recordingAudioRef.current) {
      debug.log('Cleaning up recording audio element');
      // Clean up previous audio
      recordingAudioRef.current = null;
    } else if (audioURL && recordingAudioRef.current) {
      // Update source if URL changed
      if (recordingAudioRef.current.src !== audioURL) {
        debug.log('Updating recording audio source');
        recordingAudioRef.current.src = audioURL;
      }
    }
  }, [audioURL]);

  // Update the useEffect that handles recording ended event
  useEffect(() => {
    if (recordingAudioRef.current) {
      const handleEnded = () => {
        debug.log('Recording playback ended');
        debug.log(`Current state - isPlaying: ${isPlaying}, isTargetPlaying: ${isTargetPlaying}, isRecordingPlaying: ${isRecordingPlaying}`);
        
        // Only set the recording playing flag to false
        // Do NOT affect the main audio isPlaying state
        setIsRecordingPlaying(false);
        
        debug.log('Recording playback ended - main audio state remains unchanged');
      };
      
      recordingAudioRef.current.addEventListener('ended', handleEnded);
      debug.log('Adding ended listener to recording audio element');
      
      return () => {
        if (recordingAudioRef.current) {
          recordingAudioRef.current.removeEventListener('ended', handleEnded);
          debug.log('Removing ended listener from recording audio element');
        }
      };
    }
  }, [recordingAudioRef.current, isRecordingPlaying]);

  // When any audio element is created, store it as the persistent element if needed
  useEffect(() => {
    if (persistentAudioElement) {
      debug.log('Setting persistent audio element');
    }
  }, [persistentAudioElement]);
  
  // Update the determineAudioSource function to use the AudioVisualizer's getAudioElement method
  const determineAudioSource = () => {
    debug.log('==== AUDIO SOURCE DETERMINATION ====');
    debug.log(`State flags - isPlaying: ${isPlaying}, isTargetPlaying: ${isTargetPlaying}, isRecordingPlaying: ${isRecordingPlaying}`);
    
    let selectedSource = 'none';
    let audioElement: HTMLAudioElement | null = null;
    
    // Check each potential source and log its availability
    const recordingAvailable = !!(isRecordingPlaying && recordingAudioRef.current);
    const targetAvailable = !!(isTargetPlaying && targetVisualizerRef.current?.getAudioElement());
    const mainAvailable = !!(isPlaying && visualizerRef.current?.getAudioElement());
    
    debug.log(`Source availability - recording: ${recordingAvailable}, target: ${targetAvailable}, main: ${mainAvailable}`);
    
    if (recordingAvailable && recordingAudioRef.current) {
      selectedSource = 'recording';
      audioElement = recordingAudioRef.current;
      debug.log(`Using recording audio: ${audioElement.src.substring(0, 40)}`);
    } else if (targetAvailable && targetVisualizerRef.current) {
      selectedSource = 'target';
      const targetAudio = targetVisualizerRef.current.getAudioElement();
      if (targetAudio) {
        audioElement = targetAudio;
        debug.log(`Using target audio: ${audioElement.src.substring(0, 40)}`);
      }
    } else if (mainAvailable && visualizerRef.current) {
      selectedSource = 'main';
      const mainAudio = visualizerRef.current.getAudioElement();
      if (mainAudio) {
        audioElement = mainAudio;
        debug.log(`Using main audio: ${audioElement.src.substring(0, 40)}`);
      }
    }
    
    debug.log(`Selected source: ${selectedSource}`);
    
    // If no active source, use the persistent element for visualization (but don't play it)
    if (!audioElement && persistentAudioElement) {
      debug.log('⚠️ Using persistent audio element (main) instead of null');
      audioElement = persistentAudioElement;
      
      // Log the persistent element details
      if (persistentAudioElement.src) {
        debug.log(`Persistent audio element source: ${persistentAudioElement.src.substring(0, 40)}`);
      } else {
        debug.log('Persistent audio element has no source');
      }
    }
    
    if (!audioElement) {
      debug.warn('⛔ No audio element available for waveform visualization');
    }
    
    return audioElement;
  };
  
  // Update the useEffect to set up the persistent audio element when component mounts
  useEffect(() => {
    // Set up persistent audio element from the main visualizer
    const mainAudio = visualizerRef.current?.getAudioElement();
    
    if (mainAudio) {
      if (!persistentAudioElement) {
        debug.log('Setting main audio as persistent audio element for the first time');
        setPersistentAudioElement(mainAudio);
      } else if (persistentAudioElement !== mainAudio) {
        debug.log('Updating persistent audio element reference');
        setPersistentAudioElement(mainAudio);
      } else {
        debug.log('Persistent audio element already set and up to date');
      }
    } else {
      debug.log('Main audio element not available yet for persistent reference');
      
      // Schedule a retry after a short delay
      const retryTimer = setTimeout(() => {
        const retryAudio = visualizerRef.current?.getAudioElement();
        if (retryAudio && !persistentAudioElement) {
          debug.log('Setting persistent audio element after retry');
          setPersistentAudioElement(retryAudio);
        }
      }, 500);
      
      return () => clearTimeout(retryTimer);
    }
  }, [visualizerRef.current, audioURL]);

  // Fix the handleTargetReachedEnd function
  const handleTargetReachedEnd = () => {
    if (!currentSelection) return;
    
    debug.log(`Reached end of selection (${currentSelection.endTime.toFixed(2)}s), stopping playback`);
    
    // Just stop the target playback without affecting main audio
    const targetAudio = targetVisualizerRef.current?.getAudioElement();
    if (targetAudio) {
      targetAudio.pause();
      
      // Update the target playing state only
      debug.log('✅ Target playback ended - keeping this independent from main audio');
      setIsTargetPlaying(false);
    }
  };

  return (
    <div className="container mx-auto p-4 bg-white">
      
      {/* Target audio section */}
      <div className="mb-8 p-4 bg-slate-100 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Target Audio</h2>
        <div className="mb-4">
          <AudioVisualizer 
            ref={visualizerRef}
            audioUrl="/samples/mr_freeman.wav"
            timestamps={timestamps}
            onSelectionChange={handleSelectionChange}
            onPlaybackRateChange={handlePlaybackRateChange}
            onPlayingChange={(playing) => {
              // This is called when the main audio playing state changes
              // Only update the main isPlaying state
              if (isPlaying !== playing) {
                debug.log(`Main audio playing state changed to: ${playing}`);
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
                <button
            className={`px-3 py-1 rounded text-sm ${currentSelection ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                          onClick={() => {
              if (visualizerRef.current && currentSelection) {
                debug.log('Clearing word selection');
                
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
            Clear Words
                        </button>
        </div>
        
        <div className="mb-4 relative">
          <div className="border-2 border-blue-500 rounded-lg p-2 bg-white min-h-[50px]">
            {currentSelection && currentSelection.words.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {currentSelection.words.map((word: TimeStamp, index: number) => (
                  <span 
                    key={index} 
                    className="bg-blue-100 px-2 py-1 rounded text-sm font-medium"
                  >
                    {word.word}
                  </span>
                      ))}
                    </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 italic">
                No words selected
                  </div>
                )}
              </div>
        </div>
        
        {/* Audio controls section */}
        <div className="mb-4">
          <div className="flex space-x-4 mb-4 items-center">
            {/* Microphone selection */}
            <div className="mr-4">
              <label className="flex items-center text-sm font-medium">
                <span className="mr-2">Microphone:</span>
                <select 
                  className="border rounded p-1"
                  value={selectedDevice}
                  onChange={(e) => {
                    debug.log(`Microphone changed to ${e.target.value}`);
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
          
            {/* Record button */}
              <button
              className={`${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white px-4 py-2 rounded-lg transition-colors`}
              onClick={() => {
                debug.log(`Record button clicked, current state: ${isRecording ? 'recording' : 'not recording'}`);
                if (isRecording) {
                  stopRecording();
                } else {
                  startRecording();
                }
              }}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
            </div>
          
          {/* Playback controls */}
          <div className="flex space-x-4 mb-4">
            <button 
              className={`text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center ${currentSelection ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-300 cursor-not-allowed'}`}
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
            
            {/* Recording playback button - only show when audioURL exists */}
            {audioURL && (
              <button 
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
                onClick={handleRecordingPlayback}
                onMouseEnter={() => setIsHoveringRecordButton(true)}
                onMouseLeave={() => setIsHoveringRecordButton(false)}
                onTouchStart={() => setIsHoveringRecordButton(true)}
                onTouchEnd={() => setIsHoveringRecordButton(false)}
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
            )}
          </div>
        </div>
        
        {/* Audio Waveform Visualization */}
        <div className="mt-4 mb-4">
          <h3 className="text-lg font-medium mb-2">Real-time Waveform</h3>
          {/* Render the waveform component with explicit element determination */}
          {(() => {
            // Determine which audio element to use
            const audioElement = determineAudioSource();
            
            debug.log(`==== AUDIO SOURCE DETAILS ====`);
            debug.log(`Main audio: ${audioElement ? (audioElement.src ? audioElement.src.substring(0, 30) : 'no src') : 'null'}`);
            
            // Determine if audio is playing
            const isAudioPlaying = isTargetPlaying || isRecordingPlaying || isPlaying;
            
            // Determine the color based on playing state and hover state
            const waveformColor = isTargetPlaying 
              ? '#4CAF50'  // Green for sample audio
              : isRecordingPlaying || isHoveringRecordButton 
                ? '#2196F3'  // Blue for recording or when hovering over recording button
                : '#4CAF50';  // Default to green when idle
            
            // Determine the background color based on state
            const waveformBackgroundColor = isRecordingPlaying || isHoveringRecordButton
              ? '#e6f5ff'  // Light blue for recording mode
              : '#f8f9fa';  // Default light gray
            
            // Log what we're passing to the waveform
            debug.log(`Rendering waveform with: ${audioElement ? 'Audio element' : 'No audio'}, 
              Playing: ${isAudioPlaying}`);
            
            // If we have a persistent audio element but activeAudioElement is null, log this important state
            if (!audioElement && persistentAudioElement) {
              debug.log(`🔄 Using persistent audio element for waveform even though playback is stopped`);
            }
            
            return (
              <AudioWaveform 
                audioElement={audioElement}
                isPlaying={isAudioPlaying}
                color={waveformColor}
                backgroundColor={waveformBackgroundColor}
                height={150}
              />
            );
          })()}
          </div>

          {error && (
          <p className="text-red-600 mt-2">{error.message}</p>
        )}
          
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
        
        {/* Hide target visualizer but keep it in the DOM for audio functionality */}
        <div style={{ display: 'none', height: 0, overflow: 'hidden' }}>
          <AudioVisualizer
            ref={targetVisualizerRef}
            audioUrl="/samples/mr_freeman.wav"
            timestamps={currentSelection ? currentSelection.words : []}
            isPlaying={isTargetPlaying}
            currentTime={selectionPlayheadTime}
            onTimestampClick={handleWordClick}
            onPlayingChange={(playing) => {
              // This is called when the target audio ends naturally
              // We only update isTargetPlaying, NOT the main isPlaying state
              if (!playing && isTargetPlaying) {
                debug.log('Target audio ended naturally, keeping main audio state unchanged');
                setIsTargetPlaying(false);
              }
            }}
            readOnly={true}
            debugName="selection-visualizer"
          />
        </div>
      </div>
    </div>
  );
}