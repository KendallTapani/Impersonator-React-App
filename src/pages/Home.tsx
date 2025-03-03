import { Link } from 'react-router-dom'
import { voiceSamples } from '../config/voiceSamples'
import { useState } from 'react'

interface VoiceLibrary {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  sampleCount: number;
  characters: string[];
}

const voiceLibraries: VoiceLibrary[] = [
  {
    id: 'game-characters',
    name: 'Game Characters',
    category: 'Gaming',
    description: 'Master the voices of iconic video game characters',
    imageUrl: '/images/game-characters.jpg',
    sampleCount: 25,
    characters: [
      'Gordon Freeman - Half-Life',
      'Mario - Super Mario',
      'Master Chief - Halo',
      'Solid Snake - Metal Gear Solid',
      'GLaDOS - Portal'
    ]
  },
  {
    id: 'movie-stars',
    name: 'Movie Stars',
    category: 'Film',
    description: 'Learn to sound like Hollywood\'s biggest stars',
    imageUrl: '/images/movie-stars.jpg',
    sampleCount: 30,
    characters: [
      'Morgan Freeman',
      'Arnold Schwarzenegger',
      'Samuel L. Jackson',
      'Christopher Walken',
      'James Earl Jones'
    ]
  },
  {
    id: 'cartoon-voices',
    name: 'Cartoon Voices',
    category: 'Animation',
    description: 'Perfect for aspiring voice actors and enthusiasts',
    imageUrl: '/images/cartoon-voices.jpg',
    sampleCount: 20,
    characters: [
      'SpongeBob SquarePants',
      'Homer Simpson',
      'Mickey Mouse',
      'Bugs Bunny',
      'Rick Sanchez'
    ]
  },
  {
    id: 'celebrity-impressions',
    name: 'Celebrity Impressions',
    category: 'Entertainment',
    description: 'Popular celebrity voices and impressions',
    imageUrl: '/images/celebrity-impressions.jpg',
    sampleCount: 15,
    characters: [
      'David Attenborough',
      'Snoop Dogg',
      'Barack Obama',
      'Joe Rogan',
      'Donald Trump'
    ]
  }
]

export function Home() {
  const [expandedLibrary, setExpandedLibrary] = useState<string | null>(null);

  const toggleLibrary = (libraryId: string) => {
    setExpandedLibrary(expandedLibrary === libraryId ? null : libraryId);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-6">Master Any Voice with AI</h1>
            <p className="text-xl mb-8 text-blue-100">
              Transform your voice in real-time with our advanced AI technology.
              Perfect for content creators, voice actors, and enthusiasts.
            </p>
            <Link 
              to="/dashboard"
              className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 transition-colors text-lg font-medium shadow-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Voice Impersonator?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <span className="material-icons text-3xl">psychology</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Learning</h3>
              <p className="text-gray-600">Real-time feedback and analysis to perfect your voice impressions</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <span className="material-icons text-3xl">library_music</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Extensive Library</h3>
              <p className="text-gray-600">Access to hundreds of voice samples from various categories</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 mb-4">
                <span className="material-icons text-3xl">trending_up</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
              <p className="text-gray-600">Monitor your improvement with detailed analytics and scoring</p>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Library Catalog */}
      <div className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Explore Voice Libraries</h2>
          <p className="text-gray-600 text-center mb-12">Choose from our growing collection of voice libraries</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {voiceLibraries.map(library => (
              <div 
                key={library.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 ${
                  expandedLibrary === library.id ? 'h-auto' : 'h-[380px]'
                }`}
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => toggleLibrary(library.id)}
                >
                  <div className="h-48 bg-gray-200">
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                      <span className="material-icons text-5xl text-blue-600">record_voice_over</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-sm text-blue-600 font-medium mb-1">{library.category}</div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold mb-2">{library.name}</h3>
                      <span className="material-icons text-gray-400">
                        {expandedLibrary === library.id ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{library.description}</p>
                    <div className="flex items-center text-gray-500 text-sm">
                      <span className="material-icons text-sm mr-1">mic</span>
                      {library.sampleCount} voice samples
                    </div>
                  </div>
                </div>

                <div 
                  className={`border-t border-gray-200 bg-gray-50 transition-all duration-200 ${
                    expandedLibrary === library.id ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                  }`}
                >
                  <div className="p-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Popular Characters:</h4>
                    <ul className="space-y-3">
                      {library.characters.map((character, index) => (
                        <li 
                          key={index}
                          className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer flex items-center"
                        >
                          <span className="material-icons text-sm mr-2">person</span>
                          {character}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Voice?</h2>
          <p className="text-lg text-gray-300 mb-8">
            Join thousands of users who are already mastering new voices with our platform.
          </p>
          <Link 
            to="/dashboard"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
          >
            Get Started Now
          </Link>
        </div>
      </div>
    </div>
  )
} 