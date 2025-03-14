import { useState, useCallback, useEffect } from 'react'

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
  const [isIOS, setIsIOS] = useState(false)
  
  // Detect iOS on mount
  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);
    console.log(`Device detected: ${iOS ? 'iOS' : 'non-iOS'}`);
  }, [])

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
      
      // Try different mimeTypes for better iOS compatibility
      let recorder: MediaRecorder;
      const mimeTypes = isIOS 
        ? ['audio/mp4', 'audio/aac', 'audio/x-m4a', ''] // iOS preferred formats
        : ['audio/webm', 'audio/ogg', '']; // Other browsers
      
      // Try formats in order until one works
      let usedMimeType = '';
      for (const mimeType of mimeTypes) {
        try {
          if (mimeType && MediaRecorder.isTypeSupported(mimeType)) {
            recorder = new MediaRecorder(stream, { mimeType });
            usedMimeType = mimeType;
            console.log(`Using supported mimeType: ${mimeType}`);
            break;
          } else if (!mimeType) {
            // Last resort - let browser choose format
            recorder = new MediaRecorder(stream);
            console.log('Using default MediaRecorder without mimeType');
            break;
          }
        } catch (e) {
          console.log(`MimeType ${mimeType} not supported, trying next...`);
          continue;
        }
      }
      
      if (!recorder!) {
        // Fallback if all else fails
        recorder = new MediaRecorder(stream);
        console.log('Fallback: using default MediaRecorder');
      }
      
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
          console.log(`Recording chunk received: ${e.data.size} bytes`);
        }
      }
      
      recorder.onstop = () => {
        // Choose blob type based on platform
        const blobType = isIOS ? 'audio/mp4' : 'audio/webm';
        console.log(`Creating blob with type: ${blobType}`);
        
        try {
          const blob = new Blob(chunks, { type: blobType })
          const url = URL.createObjectURL(blob)
          console.log(`Blob created, size: ${blob.size} bytes, URL: ${url.slice(0, 30)}...`);
          setState(prev => ({ ...prev, audioURL: url, isRecording: false }))
        } catch (e) {
          console.error('Error creating blob:', e);
          setState(prev => ({ 
            ...prev, 
            error: `Failed to process recording: ${e instanceof Error ? e.message : 'Unknown error'}`,
            isRecording: false 
          }))
        }
      }

      recorder.start()
      console.log('MediaRecorder started');
      setMediaRecorder(recorder)
      setState(prev => ({ ...prev, isRecording: true, error: null }))
    } catch (error) {
      console.error('Recording error:', error);
      setState(prev => ({ 
        ...prev, 
        error: `Failed to access microphone: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isRecording: false 
      }))
    }
  }, [options.deviceId, isIOS])

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      console.log('MediaRecorder stopped');
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
    }
  }, [mediaRecorder])

  return {
    ...state,
    startRecording,
    stopRecording,
    isIOS
  }
} 