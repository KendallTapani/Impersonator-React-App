import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

interface Person {
  id: string;
  name: string;
  title: string;
  featuredImage: string;
  sampleCount: number;
  difficulty: string;
  popular: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string;
  people: Person[];
}

export function Home() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch people data from index.json
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/persons/index.json')
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.status}`)
        }
        
        const data = await response.json()
        setCategories(data.categories)
        setIsLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate total personalities and samples
  const getTotalPersonalities = () => {
    return categories.reduce((sum, category) => sum + category.people.length, 0)
  }

  const getTotalSamples = () => {
    return categories.reduce((sum, category) => 
      sum + category.people.reduce((count, person) => count + person.sampleCount, 0), 0)
  }

  // Helper function to get category by ID
  const getCategoryById = (id: string) => {
    return categories.find(category => category.id === id)
  }

  // Helper function to get featured people from a category
  const getFeaturedPeople = (categoryId: string, count: number = 8) => {
    const category = getCategoryById(categoryId);
    if (!category) return [];
    
    // First get popular ones
    const popular = category.people.filter(person => person.popular);
    
    // Then add others until we reach the count
    if (popular.length >= count) {
      return popular.slice(0, count);
    } else {
      const others = category.people
        .filter(person => !person.popular)
        .slice(0, count - popular.length);
      return [...popular, ...others];
    }
  };

  // Get total sample count for a category
  const getCategorySampleCount = (categoryId: string) => {
    const category = getCategoryById(categoryId);
    if (!category) return 0;
    
    return category.people.reduce((total, person) => total + person.sampleCount, 0);
  };
  
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  
  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col items-center">
          <div className="mb-4">
            <div className="h-[64px] w-[64px] rounded-full bg-white flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3">Voice Impersonation Library</h1>
          <p className="text-center text-white/90 max-w-2xl mb-6 text-sm md:text-base">
            Master the art of voice mimicry with our extensive collection of personalities.
            Practice with real audio samples and perfect your impressions.
          </p>
          <Link
            to="/dashboard"
            className="inline-block px-7 py-2.5 bg-white text-blue-600 rounded-full font-medium hover:bg-blue-50 transition-colors mb-1"
          >
            Explore Voice Library
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Practice Voice Impersonation With Ease</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-blue-50 p-6 rounded-xl shadow-sm border border-blue-100">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">High-Quality Samples</h3>
              <p className="text-gray-600">Listen to carefully selected voice samples from a wide range of personalities</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-xl shadow-sm border border-blue-100">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Extensive Library</h3>
              <p className="text-gray-600">Access to {!isLoading ? getTotalPersonalities() : '...'} personalities with {!isLoading ? getTotalSamples() : '...'} voice samples</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-xl shadow-sm border border-blue-100">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Compare & Practice</h3>
              <p className="text-gray-600">Record your voice and compare it directly with the original samples</p>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Library Catalog */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading voice libraries...</p>
        </div>
      ) : error ? (
        <div className="py-20 text-center">
          <div className="max-w-md mx-auto bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-red-700">Error: {error}</p>
          </div>
        </div>
      ) : (
        <div className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-4">Explore Voice Collections</h2>
            <p className="text-gray-600 text-center mb-12">Choose from our growing collection of voice categories</p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Politicians Category */}
              <div 
                className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 ${
                  expandedCategory === 'politicians' ? 'h-auto' : 'h-[340px]'
                }`}
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => toggleCategory('politicians')}
                >
                  <div className="h-40 bg-blue-50">
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-sm text-blue-600 font-medium mb-1">Politics</div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold mb-2">Politicians</h3>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-400 transform transition-transform ${expandedCategory === 'politicians' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{getCategoryById('politicians')?.description || 'Practice imitating the voices of notable political figures from around the world'}</p>
                    <div className="flex items-center text-gray-500 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      {getCategorySampleCount('politicians')} voice samples
                    </div>
                  </div>
                </div>

                <div 
                  className={`border-t border-gray-200 bg-gray-50 transition-all duration-300 ${
                    expandedCategory === 'politicians' ? 'max-h-[400px] opacity-100 overflow-y-auto' : 'max-h-0 opacity-0 overflow-hidden'
                  }`}
                >
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Featured Personalities:</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {getFeaturedPeople('politicians', 6).map(person => (
                        <Link 
                          key={person.id}
                          to={`/person/${person.id}`}
                          className="flex items-center p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2 flex-shrink-0">
                            <img 
                              src={`/persons/politicians/${person.id}/profile.png`}
                              alt={person.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-profile.png';
                              }}
                            />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium text-gray-800 truncate">{person.name}</p>
                            <p className="text-xs text-blue-600">{person.sampleCount} sample{person.sampleCount !== 1 ? 's' : ''}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Link to="/dashboard" className="block text-center mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View All
                    </Link>
                  </div>
                </div>
              </div>

              {/* Celebrities Category */}
              <div 
                className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 ${
                  expandedCategory === 'celebrities' ? 'h-auto' : 'h-[340px]'
                }`}
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => toggleCategory('celebrities')}
                >
                  <div className="h-40 bg-purple-50">
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-sm text-purple-600 font-medium mb-1">Entertainment</div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold mb-2">Celebrities</h3>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-400 transform transition-transform ${expandedCategory === 'celebrities' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{getCategoryById('celebrities')?.description || 'Famous personalities from entertainment and media'}</p>
                    <div className="flex items-center text-gray-500 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      {getCategorySampleCount('celebrities')} voice samples
                    </div>
                  </div>
                </div>

                <div 
                  className={`border-t border-gray-200 bg-gray-50 transition-all duration-300 ${
                    expandedCategory === 'celebrities' ? 'max-h-[400px] opacity-100 overflow-y-auto' : 'max-h-0 opacity-0 overflow-hidden'
                  }`}
                >
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Featured Personalities:</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {getFeaturedPeople('celebrities', 6).map(person => (
                        <Link 
                          key={person.id}
                          to={`/person/${person.id}`}
                          className="flex items-center p-2 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2 flex-shrink-0">
                            <img 
                              src={`/persons/celebrities/${person.id}/profile.png`}
                              alt={person.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-profile.png';
                              }}
                            />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium text-gray-800 truncate">{person.name}</p>
                            <p className="text-xs text-purple-600">{person.sampleCount} sample{person.sampleCount !== 1 ? 's' : ''}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Link to="/dashboard" className="block text-center mt-3 text-sm text-purple-600 hover:text-purple-800 font-medium">
                      View All
                    </Link>
                  </div>
                </div>
              </div>

              {/* Podcasters Category */}
              <div 
                className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 ${
                  expandedCategory === 'podcasters' ? 'h-auto' : 'h-[340px]'
                }`}
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => toggleCategory('podcasters')}
                >
                  <div className="h-40 bg-green-50">
                    <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-sm text-green-600 font-medium mb-1">Audio</div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold mb-2">Podcasters</h3>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-400 transform transition-transform ${expandedCategory === 'podcasters' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{getCategoryById('podcasters')?.description || 'Popular podcast hosts and personalities'}</p>
                    <div className="flex items-center text-gray-500 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      {getCategorySampleCount('podcasters')} voice samples
                    </div>
                  </div>
                </div>

                <div 
                  className={`border-t border-gray-200 bg-gray-50 transition-all duration-300 ${
                    expandedCategory === 'podcasters' ? 'max-h-[400px] opacity-100 overflow-y-auto' : 'max-h-0 opacity-0 overflow-hidden'
                  }`}
                >
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Featured Personalities:</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {getFeaturedPeople('podcasters', 6).map(person => (
                        <Link 
                          key={person.id}
                          to={`/person/${person.id}`}
                          className="flex items-center p-2 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2 flex-shrink-0">
                            <img 
                              src={`/persons/podcasters/${person.id}/profile.png`}
                              alt={person.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-profile.png';
                              }}
                            />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium text-gray-800 truncate">{person.name}</p>
                            <p className="text-xs text-green-600">{person.sampleCount} sample{person.sampleCount !== 1 ? 's' : ''}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Link to="/dashboard" className="block text-center mt-3 text-sm text-green-600 hover:text-green-800 font-medium">
                      View All
                    </Link>
                  </div>
                </div>
              </div>

              {/* YouTubers Category */}
              <div 
                className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 ${
                  expandedCategory === 'youtubers' ? 'h-auto' : 'h-[340px]'
                }`}
              >
                <div 
                  className="cursor-pointer"
                  onClick={() => toggleCategory('youtubers')}
                >
                  <div className="h-40 bg-red-50">
                    <div className="w-full h-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-sm text-red-600 font-medium mb-1">Content Creators</div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold mb-2">YouTubers</h3>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-400 transform transition-transform ${expandedCategory === 'youtubers' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{getCategoryById('youtubers')?.description || 'Content creators from the YouTube platform'}</p>
                    <div className="flex items-center text-gray-500 text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      {getCategorySampleCount('youtubers')} voice samples
                    </div>
                  </div>
                </div>

                <div 
                  className={`border-t border-gray-200 bg-gray-50 transition-all duration-300 ${
                    expandedCategory === 'youtubers' ? 'max-h-[400px] opacity-100 overflow-y-auto' : 'max-h-0 opacity-0 overflow-hidden'
                  }`}
                >
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Featured Personalities:</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {getFeaturedPeople('youtubers', 6).map(person => (
                        <Link 
                          key={person.id}
                          to={`/person/${person.id}`}
                          className="flex items-center p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2 flex-shrink-0">
                            <img 
                              src={`/persons/youtubers/${person.id}/profile.png`}
                              alt={person.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-profile.png';
                              }}
                            />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium text-gray-800 truncate">{person.name}</p>
                            <p className="text-xs text-red-600">{person.sampleCount} sample{person.sampleCount !== 1 ? 's' : ''}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Link to="/dashboard" className="block text-center mt-3 text-sm text-red-600 hover:text-red-800 font-medium">
                      View All
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Testimonials Section */}
      <div className="py-16 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold mb-4">What Our Users Are Saying</h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              With a little practice, you'll be amazing your friends with spot-on impersonations
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-full">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl mr-4">
                  JS
                </div>
                <div>
                  <h3 className="font-semibold text-lg">James S.</h3>
                  <p className="text-gray-500 text-sm">Comedy Club Host</p>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex text-yellow-400 mb-2">
                  {Array(5).fill(0).map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700">
                  "After just two weeks of practice with the Donald Trump samples, I had my friends convinced I was him on the phone. The detailed tips for mimicking his unique cadence were incredibly helpful."
                </p>
              </div>
              <div className="text-blue-600 font-medium text-sm mt-auto">
                Started with 0 impersonation experience
              </div>
            </div>
            
            {/* Testimonial 2 */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-full">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xl mr-4">
                  AL
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Amanda L.</h3>
                  <p className="text-gray-500 text-sm">Voice Actor</p>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex text-yellow-400 mb-2">
                  {Array(5).fill(0).map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700">
                  "I've been working on my Barack Obama impression for a podcast intro. After a month with these samples, my friends couldn't tell if it was a recording of him or me! The recording comparison feature was key."
                </p>
              </div>
              <div className="text-purple-600 font-medium text-sm mt-auto">
                Now uses impressions professionally
              </div>
            </div>
            
            {/* Testimonial 3 */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 h-full">
              <div className="flex items-center mb-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-xl mr-4">
                  MK
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Michael K.</h3>
                  <p className="text-gray-500 text-sm">Content Creator</p>
                </div>
              </div>
              <div className="mb-4">
                <div className="flex text-yellow-400 mb-2">
                  {Array(5).fill(0).map((_, i) => (
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700">
                  "I mastered Joe Rogan's voice in about 3 weeks of practice. At our last party, I called a friend on speaker and everyone thought it was actually him! The variety of samples really helps capture those unique speech patterns."
                </p>
              </div>
              <div className="text-green-600 font-medium text-sm mt-auto">
                Practiced just 15 minutes daily
              </div>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <Link 
              to="/dashboard"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-colors font-medium text-lg"
            >
              Start Practicing Today →
            </Link>
            <p className="text-sm text-gray-500 mt-2">No special equipment needed - just your voice and practice</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-800 to-blue-800 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Perfect Your Voice Impressions?</h2>
          <p className="text-lg text-blue-100 mb-8">
            Our extensive library of voice samples will help you master the art of voice impressions.
            Explore the collection and start practicing today.
          </p>
          <Link 
            to="/dashboard"
            className="inline-block bg-white text-blue-700 px-8 py-4 rounded-full hover:bg-blue-50 transition-colors text-lg font-medium shadow-lg"
          >
            Get Started Now
          </Link>
        </div>
      </div>
    </div>
  )
} 