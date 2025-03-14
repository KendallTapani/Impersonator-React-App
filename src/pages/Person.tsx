import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

// Define interfaces for person data
interface Sample {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration: number;
  audioFile: string;
  transcriptFile: string;
  fullText: string;
  tags: string[];
  tips: string[];
}

interface Person {
  id: string;
  name: string;
  title: string;
  summary: string;
  bio: string;
  images: {
    profile: string;
  };
  voiceCharacteristics: string[];
  difficulty: string;
  samples: Sample[];
}

export function Person() {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  
  const [person, setPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});
  const [audioRefs, setAudioRefs] = useState<Record<string, HTMLAudioElement>>({});
  const [basePath, setBasePath] = useState<string>('');

  // Fetch person data
  useEffect(() => {
    const fetchPerson = async () => {
      if (!personId) return;
      
      console.log(`Starting to fetch person with ID: ${personId}`);
      
      try {
        setIsLoading(true);
        
        // Try each category folder to find the profile
        const categories = ['politicians', 'podcasters', 'youtubers', 'celebrities'];
        let response;
        let foundInCategory = '';
        let profileData = null;
        
        // Try each category
        for (const category of categories) {
          // Try with both relative and absolute paths
          const paths = [
            `./persons/${category}/${personId}/profile.json`,
            `/persons/${category}/${personId}/profile.json`
          ];
          
          for (const url of paths) {
            console.log(`Trying to fetch from: ${url}`);
            
            try {
              response = await fetch(url);
              console.log(`Response from ${url}: ${response.status}`);
              
              if (response.ok) {
                console.log(`Successfully found profile in category: ${category} with path: ${url}`);
                foundInCategory = category;
                
                try {
                  // Try parsing the JSON immediately to catch any issues
                  profileData = await response.json();
                  console.log('Successfully parsed JSON for:', personId);
                  
                  // Exit both loops
                  break;
                } catch (jsonError) {
                  console.error('Error parsing JSON from', url, jsonError);
                  continue;
                }
              }
            } catch (e) {
              console.log(`Error fetching from ${url}:`, e);
            }
          }
          
          if (profileData) break; // Exit category loop if we found data
        }
        
        // If we have profile data, use it
        if (profileData) {
          setPerson(profileData);
          
          // Determine the base path based on where we found the profile
          const newBasePath = foundInCategory 
            ? `/persons/${foundInCategory}/${personId}/` 
            : `/persons/${personId}/`;
          
          console.log(`Setting base path to: ${newBasePath}`);
          setBasePath(newBasePath);
          
          // Initialize audio elements for each sample
          const refs: Record<string, HTMLAudioElement> = {};
          
          console.log(`Person has ${profileData.samples.length} audio samples`);
          
          profileData.samples.forEach((sample: Sample) => {
            const audioUrl = `${newBasePath}${sample.audioFile}`;
            console.log(`Creating audio element for: ${audioUrl}`);
            
            refs[sample.id] = new Audio(audioUrl);
            refs[sample.id].addEventListener('ended', () => {
              setIsPlaying(prev => ({...prev, [sample.id]: false}));
            });
          });
          setAudioRefs(refs);
          setIsLoading(false);
        } else {
          // We couldn't find the profile in any category
          throw new Error(`Could not find profile for ${personId} in any category`);
        }
      } catch (err) {
        console.error('Error in fetchPerson:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setIsLoading(false);
      }
    };

    fetchPerson();
    
    // Clean up audio elements
    return () => {
      Object.values(audioRefs).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [personId]);

  // Handle audio playback
  const togglePlayback = (sampleId: string) => {
    Object.entries(audioRefs).forEach(([id, audio]) => {
      if (id !== sampleId && audio.played.length > 0) {
        audio.pause();
        setIsPlaying(prev => ({...prev, [id]: false}));
      }
    });
    
    if (isPlaying[sampleId]) {
      audioRefs[sampleId].pause();
    } else {
      audioRefs[sampleId].play();
    }
    
    setIsPlaying(prev => ({...prev, [sampleId]: !prev[sampleId]}));
  };

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-12">
          <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-12">
          <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg mx-auto max-w-md">
            <p>Error: {error || 'Person not found'}</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-3 bg-white">
        {/* Person Profile Header - Updated to match Training.tsx */}
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg overflow-hidden shadow-md">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center">
              {/* Profile Image */}
              <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                <img 
                  src={`${basePath}${person.images.profile}`} 
                  alt={person.name}
                  className="h-24 w-24 rounded-full border-4 border-white shadow-lg object-cover bg-white"
                  onError={(e) => {
                    // Fallback for missing images - display initials
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    
                    // Create a div to display person's initials
                    const parent = target.parentNode as HTMLElement;
                    const initialsDiv = document.createElement('div');
                    initialsDiv.className = "h-24 w-24 rounded-full border-4 border-white shadow-lg bg-indigo-600 flex items-center justify-center";
                    
                    // Get initials from name
                    const initials = person.name
                      .split(' ')
                      .map(word => word.charAt(0))
                      .join('')
                      .toUpperCase()
                      .substring(0, 2);
                    
                    // Create text content with person's initials
                    const textContent = document.createElement('span');
                    textContent.className = "text-2xl font-bold text-white";
                    textContent.textContent = initials;
                    
                    initialsDiv.appendChild(textContent);
                    parent.appendChild(initialsDiv);
                  }}
                />
              </div>
              
              {/* Person Info */}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{person.name}</h1>
                <p className="text-blue-100 text-lg mb-2">{person.title}</p>
                
                <div className="flex items-center mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    person.difficulty === 'easy' 
                      ? 'bg-green-500 text-white' 
                      : person.difficulty === 'medium'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-red-500 text-white'
                  }`}>
                    {person.difficulty.toUpperCase()} DIFFICULTY
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Info Bar - Summary */}
          <div className="bg-indigo-900 py-3 px-6">
            <div className="flex items-center">
              <p className="text-indigo-200 text-left text-base">{person.summary}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="md:flex md:gap-8">
          {/* Left Column - About */}
          <div className="md:w-1/3 pb-6 md:pb-0">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">About {person.name}</h2>
              <div className="prose">
                <p className="mb-4 text-gray-700">{person.bio}</p>
              </div>
            </div>
            
            {/* Voice Characteristics */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Voice Characteristics</h2>
              <ul className="space-y-2">
                {person.voiceCharacteristics.map((characteristic, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-flex items-center justify-center bg-blue-100 text-blue-500 w-6 h-6 rounded-full mr-2 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-gray-700">{characteristic}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Right Column - Samples */}
          <div className="md:w-2/3">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Practice Samples</h2>
            <div className="space-y-6">
              {person.samples.map((sample) => (
                <div key={sample.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-semibold text-gray-800">{sample.title}</h3>
                          <button
                            className={`${isPlaying[sample.id] ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-500 hover:bg-gray-600'} text-white p-1.5 rounded-full focus:outline-none transition-colors flex items-center justify-center w-7 h-7`}
                            onClick={() => togglePlayback(sample.id)}
                            aria-label={isPlaying[sample.id] ? 'Pause' : 'Play'}
                          >
                            {isPlaying[sample.id] ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" />
                                <rect x="14" y="4" width="4" height="16" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        <p className="text-gray-600 mt-1">{sample.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            sample.difficulty === 'easy' 
                              ? 'bg-green-100 text-green-800' 
                              : sample.difficulty === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}>
                            {sample.difficulty.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 sm:mt-0 flex justify-end">
                      <Link 
                        to={`/training?person=${person.id}&sample=${sample.id}`}
                        className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg focus:outline-none transition-all duration-200 shadow-md hover:shadow-lg font-semibold text-sm transform hover:scale-105 hover:-translate-y-0.5"
                      >
                        Practice
                      </Link>
                    </div>
                  </div>
                  
                  {/* Sample text preview */}
                  <div className="mt-3 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <p className="text-gray-800 italic text-sm leading-relaxed">&ldquo;{sample.fullText}&rdquo;</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 