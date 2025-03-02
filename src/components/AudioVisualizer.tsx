import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'

interface AudioVisualizerProps {
  audioUrl: string;
  playbackRate?: number;
  onPlaybackRateChange?: (rate: number) => void;
  onTimeUpdate?: (time: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export interface AudioVisualizerHandle {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  togglePlayback: () => void;
}

export const AudioVisualizer = forwardRef<AudioVisualizerHandle, AudioVisualizerProps>(({
  audioUrl,
  playbackRate = 1.0,
  onPlaybackRateChange,
  onTimeUpdate,
  onPlayingChange
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [audioContext] = useState(() => new AudioContext())
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null)
  const [startTime, setStartTime] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const currentPlaybackRate = useRef(playbackRate)
  const bufferRef = useRef<AudioBuffer | null>(null)

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
      
      setIsLoading(true)
      console.log('Starting audio load:', audioUrl)
      
      try {
        const response = await fetch(audioUrl)
        if (!isMounted) return
        
        const arrayBuffer = await response.arrayBuffer()
        if (!isMounted) return
        
        console.log('Audio fetched, decoding...')
        const buffer = await audioContext.decodeAudioData(arrayBuffer)
        if (!isMounted) return
        
        console.log('Audio decoded, duration:', buffer.duration)
        
        // Update both ref and state
        bufferRef.current = buffer
        setAudioBuffer(buffer)
        setDuration(buffer.duration)
        setCurrentTime(0)
        console.log('States updated, buffer available:', !!bufferRef.current)
      } catch (error) {
        console.error('Error loading audio:', error)
        bufferRef.current = null
      } finally {
        if (isMounted) {
          setIsLoading(false)
          console.log('Audio loading complete')
        }
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
      setIsLoading(false)
    }
  }, [audioUrl, audioContext])

  // Handle playback
  const playAudio = () => {
    if (isLoading) {
      console.log('Playback prevented: still loading')
      return
    }

    const buffer = bufferRef.current
    if (!buffer) {
      console.log('Playback prevented: no buffer available')
      return
    }

    if (isPlaying) {
      console.log('Playback prevented: already playing')
      return
    }

    console.log('Starting playback from:', currentTime, 'buffer:', !!buffer)
    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(audioContext.destination)
    source.playbackRate.value = currentPlaybackRate.current
    
    source.start(0, currentTime)
    setAudioSource(source)
    setIsPlaying(true)
    setStartTime(audioContext.currentTime - currentTime)

    source.onended = () => {
      console.log('Playback ended')
      setIsPlaying(false)
      setAudioSource(null)
      setCurrentTime(0)
      onPlayingChange?.(false)
    }

    onPlayingChange?.(true)
  }

  const stopAudio = () => {
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

  const togglePlayback = () => {
    if (isPlaying) {
      stopAudio()
    } else {
      playAudio()
    }
  }

  // Expose controls via ref
  useImperativeHandle(ref, () => ({
    play: playAudio,
    pause: stopAudio,
    seek,
    setPlaybackRate: (rate: number) => {
      currentPlaybackRate.current = rate
      if (audioSource) {
        audioSource.playbackRate.value = rate
      }
      onPlaybackRateChange?.(rate)
    },
    togglePlayback
  }), [isPlaying, currentTime, audioSource])

  // Update current time during playback
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      const newTime = audioContext.currentTime - startTime
      if (newTime >= duration) {
        setCurrentTime(duration)
        setIsPlaying(false)
        clearInterval(interval)
      } else {
        setCurrentTime(newTime)
      }
      onTimeUpdate?.(newTime)
    }, 16)

    return () => clearInterval(interval)
  }, [isPlaying, startTime, duration, audioContext, onTimeUpdate])

  // Handle mouse interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = (x / rect.width) * duration
    setHoverTime(time)
  }

  const handleMouseLeave = () => {
    setHoverTime(null)
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !audioBuffer) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = (x / rect.width) * duration
    seek(time)
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

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-32 bg-white rounded-lg shadow-sm cursor-pointer"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
      <div className="absolute inset-0">
        {/* Red playhead - always visible */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-red-500"
          style={{ 
            left: `${(currentTime / duration) * 100}%`,
            transition: isPlaying ? 'left 0.1s linear' : 'none'
          }}
        />
        
        {hoverTime !== null && (
          <>
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-green-500 opacity-50"
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
    </div>
  )
}) 