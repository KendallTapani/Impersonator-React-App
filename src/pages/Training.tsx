import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { AudioVisualizer, AudioVisualizerHandle } from '../components/AudioVisualizer';
import { parseTimestampsCSV, TimeStamp } from '../utils/parseTimestamps';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface SelectionRange {
  words: TimeStamp[];
  startTime: number;
  endTime: number;
}

export function Training() {
  const [searchParams] = useSearchParams();
  const [timestamps, setTimestamps] = useState<TimeStamp[]>([]);
  const [currentSelection, setCurrentSelection] = useState<SelectionRange | null>(null);
  const audioUrl = searchParams.get('audio') || '/samples/mr_freeman.wav';
  const transcriptFile = searchParams.get('transcript') || '/data/timestamps.csv';
  
  // Audio context and timing
  const [audioContext] = useState(() => new AudioContext());
  const [startTime, setStartTime] = useState(0);
  
  // Playback controls
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showMainSpeedControl, setShowMainSpeedControl] = useState(false);
  const [showTargetSpeedControl, setShowTargetSpeedControl] = useState(false);
  const [showRecordingSpeedControl, setShowRecordingSpeedControl] = useState(false);
  const [isTargetPlaying, setIsTargetPlaying] = useState(false);
  const [isRecordingPlaying, setIsRecordingPlaying] = useState(false);
  const visualizerRef = useRef<AudioVisualizerHandle>(null);
  const recordingVisualizerRef = useRef<AudioVisualizerHandle>(null);

  // Recording controls
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const recordingAudioRef = useRef<HTMLAudioElement>(null);
  const { isRecording, audioURL, error, startRecording, stopRecording } = useVoiceRecorder({
    deviceId: selectedDevice
  });

  // Add near the top with other refs
  const selectionCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load timestamps
  useEffect(() => {
    parseTimestampsCSV(transcriptFile).then(parsedTimestamps => {
      setTimestamps(parsedTimestamps);
    }).catch(error => {
      console.error('Error loading timestamps:', error);
    });
  }, [transcriptFile]);

  // Load audio devices
  useEffect(() => {
    async function getAudioDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`,
            kind: device.kind
          }));
        
        setAudioDevices(audioInputs);
        if (audioInputs.length > 0 && !selectedDevice) {
          setSelectedDevice(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Error accessing audio devices:', err);
      }
    }

    getAudioDevices();
    navigator.mediaDevices.addEventListener('devicechange', getAudioDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getAudioDevices);
    };
  }, []);

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    visualizerRef.current?.setPlaybackRate(rate);
    recordingVisualizerRef.current?.setPlaybackRate(rate);
  };

  const handleSelectionChange = (selection: SelectionRange | null) => {
    setCurrentSelection(selection);
    // Move crosshair to start of selection
    if (selection) {
      setSelectionPlayheadTime(selection.startTime);
      visualizerRef.current?.seek(selection.startTime);
    }
  };

  const handleRecordingPlayback = () => {
    if (recordingAudioRef.current) {
      if (isRecordingPlaying) {
        recordingAudioRef.current.pause();
      } else {
        recordingAudioRef.current.playbackRate = playbackRate;
        recordingAudioRef.current.play();
      }
      setIsRecordingPlaying(!isRecordingPlaying);
    }
  };

  useEffect(() => {
    if (recordingAudioRef.current) {
      recordingAudioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Add onEnded handler for recording playback
  useEffect(() => {
    const audioElement = recordingAudioRef.current;
    if (audioElement) {
      const handleEnded = () => setIsRecordingPlaying(false);
      audioElement.addEventListener('ended', handleEnded);
      return () => audioElement.removeEventListener('ended', handleEnded);
    }
  }, []);

  // Add this effect to handle drawing the selection waveform
  useEffect(() => {
    if (!currentSelection || !selectionCanvasRef.current || !visualizerRef.current) return;

    const canvas = selectionCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Get audio data from the visualizer
    visualizerRef.current.getAudioBuffer().then(buffer => {
      if (!buffer) return;

      // Use exact timestamps from the CSV
      const startTime = currentSelection.words[0].start;
      const endTime = currentSelection.words[currentSelection.words.length - 1].stop;
      
      const startSample = Math.floor(startTime * buffer.sampleRate);
      const endSample = Math.floor(endTime * buffer.sampleRate);
      const data = buffer.getChannelData(0).slice(startSample, endSample);

      // Draw waveform
      const step = Math.ceil(data.length / rect.width);
      const amp = rect.height / 2;

      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.beginPath();
      ctx.moveTo(0, amp);

      for (let i = 0; i < rect.width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
          const datum = data[i * step + j] || 0;
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
        ctx.lineTo(i, amp + min * amp * 0.8);
        ctx.lineTo(i, amp + max * amp * 0.8);
      }

      ctx.strokeStyle = '#6B7AFF';
      ctx.stroke();
    });
  }, [currentSelection]);

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [selectionPlayheadTime, setSelectionPlayheadTime] = useState<number | null>(null);

  // Update this effect to only track playback position - improved version
  useEffect(() => {
    if (!isTargetPlaying || !currentSelection || !visualizerRef.current) return;
    
    // Store the playback start values for accurate tracking
    const playbackStartTime = audioContext.currentTime;
    const playheadStartPosition = selectionPlayheadTime || currentSelection.words[0].start;
    
    const interval = setInterval(() => {
      const startTime = currentSelection.words[0].start;
      const endTime = currentSelection.words[currentSelection.words.length - 1].stop;
      
      // Calculate elapsed time and current position
      const elapsedTime = (audioContext.currentTime - playbackStartTime) * playbackRate;
      const currentPosition = playheadStartPosition + elapsedTime;
      
      // Check if we've reached or passed the end
      if (currentPosition >= endTime - 0.01) { // Slightly reduced threshold to ensure we get close to the end
        // We've reached the end of the selection - stop tracking
        clearInterval(interval);
        
        // Force position to exact end since we've naturally reached it
        setSelectionPlayheadTime(endTime);
        
        // Stop playback after a delay to ensure the UI visibly shows the end position
        setTimeout(() => {
          visualizerRef.current?.togglePlayback();
          setIsTargetPlaying(false);
          
          // Reset to beginning after a delay
          setTimeout(() => {
            setSelectionPlayheadTime(startTime);
            visualizerRef.current?.seek(startTime);
          }, 300);
        }, 300);
      } else {
        // Update position of selection visualizer crosshair
        setSelectionPlayheadTime(currentPosition);
      }
    }, 16);
    
    // When effect is cleaned up (e.g. on manual stop), don't modify the position
    return () => clearInterval(interval);
  }, [isTargetPlaying, currentSelection, playbackRate, audioContext, selectionPlayheadTime]);

  // Handle clicks in the selection visualizer
  const handleSelectionVisualizerClick = (e: React.MouseEvent) => {
    if (!selectionCanvasRef.current || !currentSelection) return;
    
    const rect = selectionCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Get exact timestamps from the selection
    const startTime = currentSelection.words[0].start;
    const endTime = currentSelection.words[currentSelection.words.length - 1].stop;
    
    // Calculate the exact time based on click position
    const time = startTime + (x / rect.width) * (endTime - startTime);
    
    // Update both crosshairs
    setSelectionPlayheadTime(time);
    visualizerRef.current?.seek(time);
  };

  // Handle word clicks
  const handleWordClick = (timestamp: TimeStamp) => {
    if (!currentSelection) return;
    
    // Update both crosshairs to the clicked word's exact start time
    const clickTime = timestamp.start;
    setSelectionPlayheadTime(clickTime);
    visualizerRef.current?.seek(clickTime);
  };

  // Modified calculatePlayheadPosition to precisely position at 100% when at end
  const calculatePlayheadPosition = (time: number, startTime: number, endTime: number) => {
    // If we're at the end time or very close to it, force position to 100%
    if (Math.abs(time - endTime) < 0.02) {
      return 100;
    }
    
    // Otherwise normal calculation but clamped to 0-100%
    return Math.min(100, Math.max(0, ((time - startTime) / (endTime - startTime)) * 100));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Target Voice Section with AudioVisualizer */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Target Voice</h2>
          <div className="flex items-center gap-4 mb-4">
            <button
              className="px-6 py-2 bg-[#6B7AFF] text-white rounded-lg hover:bg-blue-600 text-base font-medium flex items-center gap-2"
              onClick={() => {
                if (currentSelection && selectionPlayheadTime !== null) {
                  // If there's a valid selection and playhead position, seek to it
                  visualizerRef.current?.seek(selectionPlayheadTime);
                }
                visualizerRef.current?.togglePlayback();
              }}
            >
              <span className="material-icons">
                {isTargetPlaying ? 'pause' : 'play_arrow'}
              </span>
              {isTargetPlaying ? 'Pause' : 'Play'}
            </button>

            <div className="relative ml-auto">
              <button
                onClick={() => setShowMainSpeedControl(!showMainSpeedControl)}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm flex items-center gap-1"
              >
                <span className="material-icons text-base">speed</span>
                {playbackRate}x
              </button>
              {showMainSpeedControl && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg p-3 min-w-[160px] z-10">
                  <div className="flex flex-col gap-2">
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={playbackRate}
                      onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0.5x</span>
                      <span>2x</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <AudioVisualizer 
            ref={visualizerRef}
            audioUrl={audioUrl}
            timestamps={timestamps}
            playbackRate={playbackRate}
            onPlayingChange={setIsTargetPlaying}
            onSelectionChange={handleSelectionChange}
            onTimeUpdate={(time) => {
              // Keep the selection visualizer crosshair in sync with the main one
              if (isTargetPlaying && currentSelection) {
                const startTime = currentSelection.words[0].start;
                const endTime = currentSelection.words[currentSelection.words.length - 1].stop;
                
                // Only update if time is within our selection range
                if (time >= startTime && time <= endTime) {
                  setSelectionPlayheadTime(time);
                }
              }
            }}
          />
        </div>

        {/* Add a direct word click handler for the timestamp boxes */}
        <div className="hidden">
          {timestamps.map((timestamp, index) => (
            <span 
              key={index} 
              onClick={() => handleWordClick(timestamp)} 
            />
          ))}
        </div>

        {/* Comparison Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-6">
            {/* Target Audio Side */}
            <div className="flex-1 border-r border-gray-200 pr-6">
              <h4 className="text-lg font-medium text-gray-700 mb-3">Target Audio</h4>
              <div className="flex justify-end items-center gap-2 mb-4">
                <div className="relative">
                  <button
                    onClick={() => setShowTargetSpeedControl(!showTargetSpeedControl)}
                    className="px-2 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm flex items-center gap-1"
                  >
                    <span className="material-icons text-sm">speed</span>
                    {playbackRate}x
                  </button>
                  {showTargetSpeedControl && (
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg p-3 min-w-[160px] z-10">
                      <div className="flex flex-col gap-2">
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={playbackRate}
                          onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>0.5x</span>
                          <span>2x</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  className={`px-4 py-2 rounded-lg text-white font-medium text-sm flex items-center gap-2 ${
                    currentSelection 
                      ? 'bg-[#6B7AFF] hover:bg-blue-600' 
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (!currentSelection) return;
                    
                    if (isTargetPlaying) {
                      // When pausing, just stop playback without modifying position
                      visualizerRef.current?.togglePlayback();
                      setIsTargetPlaying(false);
                      return;
                    }
                    
                    // Get exact timestamps from the selection
                    const startTime = currentSelection.words[0].start;
                    const endTime = currentSelection.words[currentSelection.words.length - 1].stop;
                    
                    // Reset to start if at or near the end
                    const resetPosition = selectionPlayheadTime === null || 
                                       selectionPlayheadTime >= endTime - 0.05 || 
                                       selectionPlayheadTime < startTime;
                    
                    // Calculate the position to start playback from
                    const playPosition = resetPosition ? startTime : selectionPlayheadTime;
                    
                    // Update UI position first
                    setSelectionPlayheadTime(playPosition);
                    
                    // Then seek and play
                    visualizerRef.current?.seek(playPosition);
                    visualizerRef.current?.togglePlayback();
                    setIsTargetPlaying(true);
                  }}
                  disabled={!currentSelection}
                >
                  <span className="material-icons text-sm">
                    {isTargetPlaying ? 'pause' : 'play_arrow'}
                  </span>
                  {isTargetPlaying ? 'Pause' : 'Play Selection'}
                </button>
              </div>

              {currentSelection && (
                <div 
                  className="h-24 bg-white rounded border-2 border-black relative mb-4"
                  onMouseMove={(e) => {
                    if (!selectionCanvasRef.current) return;
                    const rect = selectionCanvasRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const startTime = currentSelection.words[0].start;
                    const endTime = currentSelection.words[currentSelection.words.length - 1].stop;
                    const time = startTime + (x / rect.width) * (endTime - startTime);
                    setHoverTime(time);
                  }}
                  onMouseLeave={() => setHoverTime(null)}
                  onClick={handleSelectionVisualizerClick}
                >
                  <canvas 
                    ref={selectionCanvasRef}
                    className="w-full h-full"
                  />
                  {/* Hover time indicator */}
                  {hoverTime !== null && hoverTime >= currentSelection.words[0].start && 
                   hoverTime <= currentSelection.words[currentSelection.words.length - 1].stop && (
                    <>
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-blue-500 opacity-50"
                        style={{ 
                          left: `${calculatePlayheadPosition(
                            hoverTime, 
                            currentSelection.words[0].start, 
                            currentSelection.words[currentSelection.words.length - 1].stop
                          )}%` 
                        }}
                      />
                      <div 
                        className="absolute top-0 px-2 py-1 text-xs bg-black text-white rounded transform -translate-x-1/2"
                        style={{ 
                          left: `${calculatePlayheadPosition(
                            hoverTime, 
                            currentSelection.words[0].start, 
                            currentSelection.words[currentSelection.words.length - 1].stop
                          )}%` 
                        }}
                      >
                        {hoverTime.toFixed(2)}s
                      </div>
                    </>
                  )}
                  {/* Red playhead - ensure it's always visible within the selection */}
                  {selectionPlayheadTime !== null && (
                    <div 
                      className="absolute top-0 h-full w-0.5 bg-red-500"
                      style={{ 
                        left: `${calculatePlayheadPosition(
                          selectionPlayheadTime, 
                          currentSelection.words[0].start, 
                          currentSelection.words[currentSelection.words.length - 1].stop
                        )}%`,
                        transition: isTargetPlaying ? 'left 0.1s linear' : 'none'
                      }}
                    />
                  )}
                </div>
              )}

              <div>
                {currentSelection ? (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Selected words:</p>
                    <p className="font-medium">
                      {currentSelection.words.map(w => w.word).join(' ')}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No words selected</p>
                )}
              </div>
            </div>

            {/* Your Recording Side */}
            <div className="flex-1 pl-6">
              <h4 className="text-lg font-medium text-gray-700 mb-3">Your Recording</h4>
              <audio ref={recordingAudioRef} src={audioURL || ''} />
              <div className="flex items-center gap-2 mb-4">
                <button
                  className={`px-4 py-2 rounded-lg text-white font-medium text-sm flex items-center gap-2 ${
                    audioURL 
                      ? 'bg-[#6B7AFF] hover:bg-blue-600' 
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                  onClick={handleRecordingPlayback}
                  disabled={!audioURL}
                >
                  <span className="material-icons text-sm">
                    {isRecordingPlaying ? 'pause' : 'play_arrow'}
                  </span>
                  {isRecordingPlaying ? 'Pause' : 'Play Recording'}
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowRecordingSpeedControl(!showRecordingSpeedControl)}
                    className="px-2 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm flex items-center gap-1"
                  >
                    <span className="material-icons text-sm">speed</span>
                    {playbackRate}x
                  </button>
                  {showRecordingSpeedControl && (
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg p-3 min-w-[160px] z-10">
                      <div className="flex flex-col gap-2">
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={playbackRate}
                          onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>0.5x</span>
                          <span>2x</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <button
                    onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm flex items-center gap-2"
                  >
                    <span className="material-icons text-base">mic</span>
                    {audioDevices.find(d => d.deviceId === selectedDevice)?.label.slice(0, 20) || 'Select Microphone'}
                  </button>
                  {showDeviceSelector && (
                    <div className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-lg p-2 min-w-[200px] z-10">
                      <div className="flex flex-col gap-1">
                        {audioDevices.map(device => (
                          <button
                            key={device.deviceId}
                            onClick={() => {
                              setSelectedDevice(device.deviceId);
                              setShowDeviceSelector(false);
                            }}
                            className={`px-3 py-2 text-left rounded text-sm hover:bg-gray-100 ${
                              selectedDevice === device.deviceId ? 'bg-gray-100' : ''
                            }`}
                          >
                            {device.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`px-4 py-2 rounded-lg text-white font-medium text-sm flex items-center gap-2 ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-[#6B7AFF] hover:bg-blue-600'
                  }`}
                  disabled={!currentSelection}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-icons text-sm">{isRecording ? 'stop' : 'mic'}</span>
                    {isRecording ? 'Stop Recording' : 'Record'}
                  </span>
                </button>
              </div>

              {error && (
                <p className="text-red-600 mt-4">{error}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}