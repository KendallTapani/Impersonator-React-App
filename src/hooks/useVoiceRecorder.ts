import { useState, useCallback } from 'react'

interface VoiceRecorderState {
  isRecording: boolean
  audioURL: string | null
  error: string | null
}

interface VoiceRecorderOptions {
  deviceId?: string
}

export function useVoiceRecorder(options: VoiceRecorderOptions = {}) {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    audioURL: null,
    error: null,
  })
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          deviceId: options.deviceId ? { exact: options.deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      })
      const recorder = new MediaRecorder(stream)
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setState(prev => ({ ...prev, audioURL: url, isRecording: false }))
      }

      recorder.start()
      setMediaRecorder(recorder)
      setState(prev => ({ ...prev, isRecording: true, error: null }))
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to access microphone. Please check permissions.',
        isRecording: false 
      }))
    }
  }, [options.deviceId])

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
    }
  }, [mediaRecorder])

  return {
    ...state,
    startRecording,
    stopRecording,
  }
} 