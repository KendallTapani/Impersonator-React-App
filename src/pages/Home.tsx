import { Link } from 'react-router-dom'
import { voiceSamples } from '../config/voiceSamples'

export function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Voice Impersonator</h2>
        <p className="text-xl text-gray-600">Train your voice to sound like {voiceSamples[0].name}!</p>
      </div>
      
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h3 className="text-2xl font-semibold mb-4">Start Training</h3>
        <p className="text-gray-600 mb-6">
          Begin your voice training journey with our interactive tools. 
          Practice matching the iconic voice of {voiceSamples[0].name} using our 
          real-time voice analysis technology.
        </p>
        <Link 
          to="/training"
          className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
        >
          Start Training Now
        </Link>
      </div>
    </div>
  )
} 