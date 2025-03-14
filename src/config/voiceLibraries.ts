export interface Character {
  name: string;
  audioFile: string;
  transcriptFile: string;
}

export interface VoiceLibrary {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  sampleCount: number;
  characters: Character[];
}

export const voiceLibraries: VoiceLibrary[] = [
  {
    id: 'half-life',
    name: 'Half-Life Series',
    category: 'Video Games',
    description: 'Characters from the iconic Half-Life series',
    imageUrl: '/images/half-life.jpg',
    sampleCount: 2,
    characters: [
      {
        name: 'Gordon Freeman',
        audioFile: '/samples/mr_freeman.wav',
        transcriptFile: '/data/timestamps.csv'
      },
      {
        name: 'G-Man',
        audioFile: '/samples/mr_freeman.wav',
        transcriptFile: '/data/timestamps.csv'
      }
    ]
  },
  {
    id: 'portal',
    name: 'Portal Series',
    category: 'Video Games',
    description: 'Characters from the Portal game series',
    imageUrl: '/images/portal.jpg',
    sampleCount: 2,
    characters: [
      {
        name: 'GLaDOS',
        audioFile: '/samples/mr_freeman.wav',
        transcriptFile: '/data/timestamps.csv'
      },
      {
        name: 'Wheatley',
        audioFile: '/samples/mr_freeman.wav',
        transcriptFile: '/data/timestamps.csv'
      }
    ]
  }
]; 