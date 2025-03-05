import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AudioVisualizer, TimeStamp, SelectionRange, AudioVisualizerHandle } from '../components/AudioVisualizer';
import { parseTimestampsCSV } from '../utils/parseTimestamps';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { logger, createTimer, trackRender } from '../utils/debug';

interface AudioDevice {
  deviceId: string;
  label: string;
}

export function Training() {
  // Create a unique debug ID for this instance
  const debugId = useRef(`training-${Math.floor(Math.random() * 10000)}`);
  const debug = logger.training;
  
  debug.log(`Initializing Training component: ${debugId.current}`);
  trackRender(`Training ${debugId.current}`);

  // URL params
  const [searchParams] = useSearchParams();

  // Audio state
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [currentSelection, setCurrentSelection] = useState<SelectionRange | null>(null);
  const [selectionPlayheadTime, setSelectionPlayheadTime] = useState<number>(0);
  const [isTargetPlaying, setIsTargetPlaying] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [timestamps, setTimestamps] = useState<TimeStamp[]>([]);
  const [isRecordingPlaying, setIsRecordingPlaying] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [transcriptFile, setTranscriptFile] = useState(
    searchParams.get('transcript') || '/data/timestamps.csv'
  );

  // Refs
  const visualizerRef = useRef<AudioVisualizerHandle | null>(null);
  const targetVisualizerRef = useRef<AudioVisualizerHandle | null>(null);
  const recordingAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Recording state
  const { audioURL, isRecording, startRecording, stopRecording } = useVoiceRecorder();
  
  // Timing references
  const playbackStartTimeRef = useRef<number>(0);
  const playheadStartPositionRef = useRef<number>(0);
  
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

  // Handle main play button click
  const handleMainPlayButton = () => {
    debug.log('Main play button clicked');
    
    if (isPlaying) {
      debug.log('Stopping playback');
      setIsPlaying(false);
      if (visualizerRef.current) {
        visualizerRef.current.pause();
      }
    } else {
      debug.log('Starting playback');
      setIsPlaying(true);
      if (visualizerRef.current) {
        visualizerRef.current.play();
      }
    }
  };

  // Handle target audio play button click
  const handleTargetPlayButton = () => {
    debug.log('Target play button clicked');
    
    if (isTargetPlaying) {
      debug.log('Stopping target playback');
      setIsTargetPlaying(false);
      if (targetVisualizerRef.current) {
        targetVisualizerRef.current.pause();
      }
    } else if (currentSelection && targetVisualizerRef.current) {
      debug.log(`Starting target playback from ${currentSelection.startTime.toFixed(2)}s to ${currentSelection.endTime.toFixed(2)}s`);
      
      // Set starting position for accurate tracking
      setSelectionPlayheadTime(currentSelection.startTime);
      targetVisualizerRef.current.seek(currentSelection.startTime);
      playheadStartPositionRef.current = currentSelection.startTime;
      playbackStartTimeRef.current = performance.now();
      
      setIsTargetPlaying(true);
      targetVisualizerRef.current.play();
    } else {
      debug.warn('Cannot play target: No selection or visualizer reference');
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
    if (!isTargetPlaying || !currentSelection || !visualizerRef.current) {
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
        
        // Small delay to ensure the UI updates before stopping
        setTimeout(() => {
          setIsTargetPlaying(false);
          
          // Reset playhead position after a brief pause
          setTimeout(() => {
            debug.log('Resetting playhead position to start');
            setSelectionPlayheadTime(currentSelection.startTime);
          }, 300);
        }, 50);
        
        clearInterval(interval);
      }
    }, 16); // ~60fps updates
    
    return () => {
      debug.log('Cleaning up target audio tracking');
      clearInterval(interval);
    };
  }, [isTargetPlaying, currentSelection, playbackRate]);

  const handleRecordingPlayback = () => {
    debug.log(`Recording playback button clicked, current state: ${isRecordingPlaying ? 'playing' : 'paused'}`);
    setIsRecordingPlaying(!isRecordingPlaying);
    
    if (recordingAudioRef.current) {
      if (isRecordingPlaying) {
        recordingAudioRef.current.pause();
      } else {
        recordingAudioRef.current.play().catch(err => {
          debug.error('Error playing recording:', err);
          setIsRecordingPlaying(false);
        });
      }
    }
  };

  // Update recording playback rate
  useEffect(() => {
    if (recordingAudioRef.current) {
      debug.log(`Setting recording playback rate to ${playbackRate}x`);
      recordingAudioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Set up event handler for recording playback end
  useEffect(() => {
    const handlePlaybackEnd = () => {
      debug.log('Recording playback ended');
      setIsRecordingPlaying(false);
    };
    
    // Add event listener for recording playback end
    if (recordingAudioRef.current) {
      recordingAudioRef.current.addEventListener('ended', handlePlaybackEnd);
      
      return () => {
        if (recordingAudioRef.current) {
          recordingAudioRef.current.removeEventListener('ended', handlePlaybackEnd);
        }
      };
    }
    
    return undefined;
  }, [recordingAudioRef.current]);

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

  // Debug rendering
  debug.log('Rendering Training component');

  return (
    <div className="container mx-auto p-4 bg-white">
      <h1 className="text-3xl font-bold mb-4">Voice Training</h1>
      
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
            onPlayingChange={setIsPlaying}
            isPlaying={isPlaying}
            debugName="main-visualizer"
          />
        </div>
        
        <div className="flex space-x-4 mb-4">
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            onClick={handleMainPlayButton}
          >
            {isTargetPlaying ? 'Pause' : 'Play'}
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Playback Rate:</span>
            <select 
              className="border rounded p-1"
              value={playbackRate}
              onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Selected audio section */}
      {currentSelection && (
        <div className="mb-8 p-4 bg-slate-100 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Selected Audio</h2>
          
          <div className="mb-4 relative">
            <div className="border-2 border-blue-500 rounded-lg p-2 bg-white">
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
            </div>
          </div>
          
          <div className="flex space-x-4 mb-4">
            <button 
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              onClick={handleTargetPlayButton}
              disabled={!currentSelection}
            >
              {isTargetPlaying ? 'Stop' : 'Play Selection'}
            </button>
            
            {/* Hidden div to render timestamp boxes for clicking */}
            <div style={{ display: 'none' }}>
              {timestamps.map((timestamp, index) => (
                <div 
                  key={index}
                  onClick={() => handleWordClick(timestamp, index)}
                >
                  {timestamp.word}
                </div>
              ))}
            </div>
          </div>
          
          {/* Show target visualizer for selected portion */}
          <div className="mt-4">
            <AudioVisualizer
              ref={targetVisualizerRef}
              audioUrl="/samples/mr_freeman.wav"
              timestamps={currentSelection.words}
              isPlaying={isTargetPlaying}
              currentTime={selectionPlayheadTime}
              onTimestampClick={handleWordClick}
              readOnly={true}
              debugName="selection-visualizer"
            />
          </div>
        </div>
      )}
      
      {/* Recording section */}
      <div className="mb-8 p-4 bg-slate-100 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Record Your Voice</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Microphone:
            <select 
              className="ml-2 border rounded p-1"
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
        
        <div className="flex space-x-4 mb-4">
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
        
        {audioURL && (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Your Recording</h3>
            <audio 
              ref={recordingAudioRef}
              controls 
              src={audioURL}
              className="w-full mb-2"
              onPlay={() => {
                debug.log('Recording audio playback started');
                setIsRecordingPlaying(true);
              }}
              onPause={() => {
                debug.log('Recording audio playback paused');
                setIsRecordingPlaying(false);
              }}
              onEnded={() => {
                debug.log('Recording audio playback ended');
                setIsRecordingPlaying(false);
              }}
            />
            
            <button 
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              onClick={handleRecordingPlayback}
            >
              {isRecordingPlaying ? 'Pause' : 'Play Recording'}
            </button>
          </div>
        )}
        
        {error && (
          <p className="text-red-600 mt-4">{error.message}</p>
        )}
      </div>
    </div>
  );
}