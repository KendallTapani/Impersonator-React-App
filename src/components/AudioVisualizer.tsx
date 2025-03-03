import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'

interface TimeStamp {
  start: number;
  stop: number;
  word: string;
}

interface SelectionRange {
  words: TimeStamp[];
  startTime: number;
  endTime: number;
}

interface AudioVisualizerProps {
  audioUrl: string;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  onTimeUpdate?: (time: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  timestamps?: TimeStamp[];
  onSelectionChange?: (selection: SelectionRange | null) => void;
}

export interface AudioVisualizerHandle {
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  togglePlayback: () => void;
  clearSelection: () => void;
}

export const AudioVisualizer = forwardRef<AudioVisualizerHandle, AudioVisualizerProps>(({
  audioUrl,
  playbackRate = 1.0,
  onPlaybackRateChange,
  onTimeUpdate,
  onPlayingChange,
  timestamps = [],
  onSelectionChange
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [audioContext] = useState(() => new AudioContext())
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null)
  const [startTime, setStartTime] = useState<number>(0)
  const currentPlaybackRate = useRef(playbackRate)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const stopTimeoutRef = useRef<number | null>(null)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [selectedWords, setSelectedWords] = useState<TimeStamp[]>([])

  // Update playback rate when prop changes
  useEffect(() => {
    currentPlaybackRate.current = playbackRate
    if (audioSource) {
      audioSource.playbackRate.value = playbackRate
    }
  }, [playbackRate])

  // Load and decode audio file
  useEffect(() => {
    let isMounted = true
    
    async function loadAudio() {
      if (!audioUrl) return
      
      try {
        const response = await fetch(audioUrl)
        if (!isMounted) return
        
        const arrayBuffer = await response.arrayBuffer()
        if (!isMounted) return
        
        const buffer = await audioContext.decodeAudioData(arrayBuffer)
        if (!isMounted) return
        
        bufferRef.current = buffer
        setAudioBuffer(buffer)
        setDuration(buffer.duration)
        setCurrentTime(0)
      } catch (error) {
        console.error('Error loading audio:', error)
        bufferRef.current = null
      }
    }

    loadAudio()
    
    return () => {
      isMounted = false
      if (audioSource) {
        audioSource.stop()
        audioSource.disconnect()
      }
      bufferRef.current = null
      setAudioBuffer(null)
      setIsPlaying(false)
      setAudioSource(null)
      setCurrentTime(0)
    }
  }, [audioUrl, audioContext])

  // Update current time during playback
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      const newTime = audioContext.currentTime - startTime
      const endTime = selectedWords.length > 0
        ? Math.max(...selectedWords.map(w => w.stop))
        : duration;
      
      if (newTime >= endTime) {
        setCurrentTime(endTime)
        setIsPlaying(false)
        clearInterval(interval)
      } else {
        setCurrentTime(newTime)
      }
      onTimeUpdate?.(newTime)
    }, 16)

    return () => clearInterval(interval)
  }, [isPlaying, startTime, duration, audioContext, onTimeUpdate, selectedWords])

  const playAudio = () => {
    const buffer = bufferRef.current
    if (!buffer || isPlaying) return

    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(audioContext.destination)
    source.playbackRate.value = currentPlaybackRate.current
    
    // Calculate the correct start and end times
    const playStartTime = selectedWords.length > 0 
      ? Math.min(...selectedWords.map(w => w.start))
      : currentTime;
    
    const playEndTime = selectedWords.length > 0
      ? Math.max(...selectedWords.map(w => w.stop))
      : buffer.duration;
    
    const playDuration = (playEndTime - playStartTime) / playbackRate;
    
    // Start the audio from the correct position
    source.start(0, playStartTime, playDuration);
    setAudioSource(source)
    setIsPlaying(true)
    setStartTime(audioContext.currentTime - playStartTime)
    setCurrentTime(playStartTime)

    source.onended = () => {
      setIsPlaying(false)
      setAudioSource(null)
      setCurrentTime(playEndTime)
      onPlayingChange?.(false)
      
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current)
        stopTimeoutRef.current = null
      }
    }

    onPlayingChange?.(true)
  }

  const stopAudio = () => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    
    if (audioSource) {
      audioSource.stop()
      audioSource.disconnect()
    }
    setIsPlaying(false)
    setAudioSource(null)
    onPlayingChange?.(false)
  }

  const seek = (time: number) => {
    const clampedTime = Math.max(0, Math.min(time, duration))
    if (isPlaying) {
      stopAudio()
      setCurrentTime(clampedTime)
      playAudio()
    } else {
      setCurrentTime(clampedTime)
    }
  }

  const handleTimestampClick = (timestamp: TimeStamp, event: React.MouseEvent) => {
    event.stopPropagation();
    
    setSelectedWords(prev => {
      let newSelection: TimeStamp[];
      
      if (event.shiftKey && prev.length > 0) {
        // If shift is held and we have a previous selection, select range
        const firstWordIndex = timestamps.findIndex(t => t === prev[0]);
        const currentWordIndex = timestamps.findIndex(t => t === timestamp);
        const start = Math.min(firstWordIndex, currentWordIndex);
        const end = Math.max(firstWordIndex, currentWordIndex);
        
        // Get the range of words
        const rangeSelection = timestamps.slice(start, end + 1);
        
        // If all words in range are selected, deselect them
        const allSelected = rangeSelection.every(word => prev.includes(word));
        newSelection = allSelected 
          ? prev.filter(word => !rangeSelection.includes(word))
          : [...new Set([...prev, ...rangeSelection])];
      } else {
        // Toggle single word selection
        newSelection = prev.includes(timestamp)
          ? prev.filter(word => word !== timestamp)
          : [...prev, timestamp];
      }

      // Calculate time range and notify parent
      if (newSelection.length > 0) {
        const startTime = Math.min(...newSelection.map(w => w.start));
        const endTime = Math.max(...newSelection.map(w => w.stop));
        onSelectionChange?.({
          words: newSelection,
          startTime,
          endTime
        });
      } else {
        onSelectionChange?.(null);
      }

      return newSelection;
    });
  }

  const clearSelection = () => {
    setSelectedWords([]);
    onSelectionChange?.(null);
  }

  // Draw waveform
  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const data = audioBuffer.getChannelData(0)
    const step = Math.ceil(data.length / rect.width)
    const amp = rect.height / 2

    ctx.clearRect(0, 0, rect.width, rect.height)
    ctx.beginPath()
    ctx.moveTo(0, amp)

    for (let i = 0; i < rect.width; i++) {
      let min = 1.0
      let max = -1.0
      for (let j = 0; j < step; j++) {
        const datum = data[i * step + j]
        if (datum < min) min = datum
        if (datum > max) max = datum
      }
      ctx.lineTo(i, amp + min * amp)
      ctx.lineTo(i, amp + max * amp)
    }

    ctx.strokeStyle = '#6B7AFF'
    ctx.stroke()
  }, [audioBuffer])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !audioBuffer) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = (x / rect.width) * duration
    seek(time)
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const time = (x / rect.width) * duration
    setHoverTime(time)
  }

  const handleMouseLeave = () => {
    setHoverTime(null)
  }

  // Expose controls via ref
  useImperativeHandle(ref, () => ({
    seek,
    setPlaybackRate: (rate: number) => {
      currentPlaybackRate.current = rate
      if (audioSource) {
        audioSource.playbackRate.value = rate
      }
      onPlaybackRateChange?.(rate)
    },
    togglePlayback: () => {
      if (isPlaying) {
        stopAudio();
      } else {
        if (selectedWords.length > 0) {
          const startTime = Math.min(...selectedWords.map(w => w.start));
          setCurrentTime(startTime);
        }
        playAudio();
      }
    },
    clearSelection
  }), [isPlaying, currentTime, audioSource, selectedWords, playbackRate]);

  return (
    <div ref={containerRef} className="relative w-full bg-white">
      <div 
        className="relative w-full h-32 border-2 border-black rounded-lg"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />
        
        {/* Selection overlay */}
        {selectedWords.length > 0 && (
          <div
            className="absolute top-0 h-full bg-yellow-200 opacity-20"
            style={{
              left: `${(Math.min(...selectedWords.map(w => w.start)) / duration) * 100}%`,
              width: `${((Math.max(...selectedWords.map(w => w.stop)) - Math.min(...selectedWords.map(w => w.start))) / duration) * 100}%`,
            }}
          />
        )}
        
        {/* Timestamp indicator lines */}
        {timestamps.map((timestamp, index) => (
          <React.Fragment key={`lines-${index}`}>
            <div 
              className="absolute top-0 h-full w-px bg-gray-300"
              style={{ left: `${(timestamp.start / duration) * 100}%` }}
            />
            <div 
              className="absolute top-0 h-full w-px bg-gray-300"
              style={{ left: `${(timestamp.stop / duration) * 100}%` }}
            />
          </React.Fragment>
        ))}

        {/* Red playhead */}
        <div 
          className="absolute top-0 h-32 w-0.5 bg-red-500"
          style={{ 
            left: `${(currentTime / duration) * 100}%`,
            transition: isPlaying ? 'left 0.1s linear' : 'none'
          }}
        />
        
        {/* Hover time indicator */}
        {hoverTime !== null && (
          <>
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 opacity-50"
              style={{ left: `${(hoverTime / duration) * 100}%` }}
            />
            <div 
              className="absolute top-0 px-2 py-1 text-xs bg-black text-white rounded transform -translate-x-1/2"
              style={{ left: `${(hoverTime / duration) * 100}%` }}
            >
              {hoverTime.toFixed(2)}s
            </div>
          </>
        )}
      </div>
      
      {/* Timestamp boxes section */}
      {timestamps.length > 0 && (
        <div className="relative w-full h-12 mt-1">
          {timestamps.map((timestamp, index) => (
            <div 
              key={index} 
              className={`absolute h-full border-2 ${
                selectedWords.includes(timestamp)
                  ? 'bg-yellow-100 border-yellow-500'
                  : 'bg-blue-100 border-black'
              } rounded-xs flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors`}
              style={{ 
                left: `${(timestamp.start / duration) * 100}%`,
                width: `${((timestamp.stop - timestamp.start) / duration) * 100}%`,
              }}
              onClick={(e) => handleTimestampClick(timestamp, e)}
            >
              <span className="text-xs font-medium text-blue-700 select-none">{timestamp.word}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}) 