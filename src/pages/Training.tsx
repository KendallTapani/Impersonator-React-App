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
  
  // Playback controls
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showSpeedControl, setShowSpeedControl] = useState(false);
  const [isTargetPlaying, setIsTargetPlaying] = useState(false);
  const [isRecordingPlaying, setIsRecordingPlaying] = useState(false);
  const visualizerRef = useRef<AudioVisualizerHandle>(null);
  const recordingVisualizerRef = useRef<AudioVisualizerHandle>(null);

  // Recording controls
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const { isRecording, audioURL, error, startRecording, stopRecording } = useVoiceRecorder({
    deviceId: selectedDevice
  });

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
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Target Voice Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Target Voice</h2>
          <div className="flex items-center gap-4 mb-4">
            <button
              className="px-6 py-2 bg-[#6B7AFF] text-white rounded-lg hover:bg-blue-600 text-base font-medium flex items-center gap-2"
              onClick={() => visualizerRef.current?.togglePlayback()}
            >
              <span className="material-icons">
                {isTargetPlaying ? 'pause' : 'play_arrow'}
              </span>
              {isTargetPlaying ? 'Pause' : 'Play'}
            </button>

            {currentSelection && (
              <button
                className="px-2 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-xs flex items-center gap-1"
                onClick={() => {
                  visualizerRef.current?.clearSelection();
                }}
              >
                <span className="material-icons text-sm">close</span>
                Clear
              </button>
            )}

            <div className="relative ml-auto">
              <button
                onClick={() => setShowSpeedControl(!showSpeedControl)}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm flex items-center gap-1"
              >
                <span className="material-icons text-base">speed</span>
                {playbackRate}x
              </button>
              {showSpeedControl && (
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
          />
        </div>

        {/* Recording Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-semibold text-gray-900">Your Recording</h3>
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm flex items-center gap-2"
                >
                  <span className="material-icons text-base">mic</span>
                  {audioDevices.find(d => d.deviceId === selectedDevice)?.label.slice(0, 20) || 'Select Microphone'}
                </button>
                {showDeviceSelector && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg p-2 min-w-[200px] z-10">
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
                className={`px-6 py-2 rounded-lg text-white font-medium text-base ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-[#6B7AFF] hover:bg-blue-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="material-icons">{isRecording ? 'stop' : 'mic'}</span>
                  {isRecording ? 'Stop Recording' : currentSelection ? 
                    (currentSelection.words.length === 1 ? 'Record Word' : 'Record Phrase') : 
                    'Select text to record'}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-600 mb-4">{error}</p>
          )}
          
          {audioURL && (
            <div>
              <AudioVisualizer 
                ref={recordingVisualizerRef}
                audioUrl={audioURL}
                playbackRate={playbackRate}
                onPlayingChange={setIsRecordingPlaying}
              />
              <div className="flex items-center justify-between mt-4">
                <button
                  className="px-6 py-2 bg-[#6B7AFF] text-white rounded-lg hover:bg-blue-600 text-base font-medium flex items-center gap-2"
                  onClick={() => recordingVisualizerRef.current?.togglePlayback()}
                >
                  <span className="material-icons">
                    {isRecordingPlaying ? 'pause' : 'play_arrow'}
                  </span>
                  {isRecordingPlaying ? 'Pause' : 'Play'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}