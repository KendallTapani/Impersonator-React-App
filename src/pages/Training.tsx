import { useState, useRef, useEffect } from 'react'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { voiceSamples } from '../config/voiceSamples'
import { AudioVisualizer, AudioVisualizerHandle } from '../components/AudioVisualizer'
import { parseTimestampsCSV, TimeStamp } from '../utils/parseTimestamps'

interface AudioDevice {
  deviceId: string
  label: string
  kind: MediaDeviceKind
}

export function Training() {
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])
  const [showDeviceSelector, setShowDeviceSelector] = useState(false)
  const [selectedSample, setSelectedSample] = useState(voiceSamples[0])
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [timestamps, setTimestamps] = useState<TimeStamp[]>([])
  const [isAudioLoaded, setIsAudioLoaded] = useState(false)
  const [showSpeedControl, setShowSpeedControl] = useState(false)
  const [isTargetPlaying, setIsTargetPlaying] = useState(false)
  const [isRecordingPlaying, setIsRecordingPlaying] = useState(false)
  const { isRecording, audioURL, error, startRecording, stopRecording } = useVoiceRecorder({
    deviceId: selectedDevice
  })
  const visualizerRef = useRef<AudioVisualizerHandle>(null)
  const recordingVisualizerRef = useRef<AudioVisualizerHandle>(null)

  useEffect(() => {
    // Request permission and get devices
    async function getAudioDevices() {
      try {
        // First request permission
        await navigator.mediaDevices.getUserMedia({ audio: true })
        
        // Then enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`,
            kind: device.kind
          }))
        
        setAudioDevices(audioInputs)
        if (audioInputs.length > 0 && !selectedDevice) {
          setSelectedDevice(audioInputs[0].deviceId)
        }
      } catch (err) {
        console.error('Error accessing audio devices:', err)
      }
    }

    getAudioDevices()

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', getAudioDevices)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getAudioDevices)
    }
  }, [])

  useEffect(() => {
    // Load timestamps
    parseTimestampsCSV('/data/timestamps.csv').then(parsedTimestamps => {
      setTimestamps(parsedTimestamps);
    }).catch(error => {
      console.error('Error loading timestamps:', error);
    });
  }, []);

  const handlePlayPauseClick = () => {
    visualizerRef.current?.togglePlayback()
  }

  const handleRecordingPlayPauseClick = () => {
    recordingVisualizerRef.current?.togglePlayback()
  }

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate)
    visualizerRef.current?.setPlaybackRate(rate)
    recordingVisualizerRef.current?.setPlaybackRate(rate)
  }

  return (
    <div className="min-h-screen w-screen">
      {/* Target Voice Section */}
      <div className="w-screen bg-white mt-8">
        <div className="px-8">
          <h2 className="text-2xl font-semibold text-gray-900">Target Voice: {selectedSample.name}</h2>
        </div>
        <div className="px-8 py-4">
          <AudioVisualizer 
            ref={visualizerRef}
            audioUrl={selectedSample.audioFile}
            playbackRate={playbackRate}
            onPlaybackRateChange={handlePlaybackRateChange}
            onPlayingChange={setIsTargetPlaying}
            timestamps={timestamps}
          />
          <div className="flex items-center justify-between mt-4">
            <button
              className="px-6 py-2 bg-[#6B7AFF] text-white rounded-lg hover:bg-blue-600 text-base font-medium flex items-center gap-2"
              onClick={handlePlayPauseClick}
            >
              <span className="material-icons">
                {isTargetPlaying ? 'pause' : 'play_arrow'}
              </span>
              {isTargetPlaying ? 'Pause' : 'Play'}
            </button>
            <div className="relative">
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
        </div>
      </div>

      {/* Recording Section */}
      <div className="w-screen bg-white mt-4">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
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
                            setSelectedDevice(device.deviceId)
                            setShowDeviceSelector(false)
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
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-600 mt-4">{error}</p>
          )}
          
          {audioURL && (
            <div className="mt-4">
              <AudioVisualizer 
                ref={recordingVisualizerRef}
                audioUrl={audioURL}
                playbackRate={playbackRate}
                onPlayingChange={setIsRecordingPlaying}
              />
              <div className="flex items-center justify-between mt-4">
                <button
                  className="px-6 py-2 bg-[#6B7AFF] text-white rounded-lg hover:bg-blue-600 text-base font-medium flex items-center gap-2"
                  onClick={handleRecordingPlayPauseClick}
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
  )
}