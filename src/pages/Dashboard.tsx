import { Link } from 'react-router-dom'
import { useState } from 'react'
import { voiceLibraries, VoiceLibrary, Character } from '../config/voiceLibraries.ts'

export function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLibraries = voiceLibraries.map(library => ({
    ...library,
    characters: library.characters.filter(character =>
      character.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(library => library.characters.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <span className="material-icons text-blue-600 text-3xl mr-2">record_voice_over</span>
                <span className="text-xl font-semibold text-gray-900">Voice Impersonator</span>
              </Link>
              <div className="hidden md:flex items-center ml-10 space-x-8">
                <Link 
                  to="/dashboard" 
                  className="text-blue-600 font-medium"
                >
                  Library
                </Link>
                <Link 
                  to="/training" 
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Training
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Search Bar */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
            <span className="material-icons text-gray-400">search</span>
          </span>
          <input
            type="text"
            placeholder="Search characters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {filteredLibraries.map((library: VoiceLibrary) => (
          <div key={library.id} className="mb-12">
            <h2 className="text-2xl font-bold mb-6">{library.name}</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {library.characters.map((character: Character, index: number) => (
                  <Link 
                    key={index}
                    to={`/training?audio=${encodeURIComponent(character.audioFile)}&transcript=${encodeURIComponent(character.transcriptFile)}`}
                    className="flex items-center p-3 border rounded hover:bg-gray-50"
                  >
                    <span className="material-icons text-blue-600 mr-3">person</span>
                    <span className="text-gray-700">{character.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
} 