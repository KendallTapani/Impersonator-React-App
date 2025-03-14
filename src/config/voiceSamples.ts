export interface VoiceSample {
  id: string
  name: string
  description: string
  audioFile: string
}

export const voiceSamples: VoiceSample[] = [
  {
    id: 'freeman',
    name: 'Gordon Freeman',
    description: 'The iconic character from Half-Life series',
    audioFile: '/samples/mr_freeman.wav'
  },
  // More samples can be added here
]