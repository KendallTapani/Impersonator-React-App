import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Define interfaces for person data
interface Person {
  id: string;
  name: string;
  title: string;
  featuredImage: string;
  sampleCount: number;
  difficulty: string;
  popular: boolean;
}

// Define the categories
interface Category {
  id: string;
  name: string;
  description?: string;
  people: Person[];
  isOpen: boolean;
}

// Define the data structure for index.json
interface CategorizedPeopleList {
  categories: Category[];
}

export function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch people data
  useEffect(() => {
    const fetchPeople = async () => {
      try {
        setIsLoading(true);
        let data: CategorizedPeopleList;
        
        try {
          // Try with relative path first
          const response = await fetch('./persons/index.json');
          if (!response.ok) {
            throw new Error(`Failed with relative path: ${response.status}`);
          }
          data = await response.json();
        } catch (e) {
          // Fall back to absolute path
          console.log("Trying alternate path for index.json");
          const altResponse = await fetch('/persons/index.json');
          if (!altResponse.ok) {
            throw new Error(`Failed to load people: ${altResponse.status}`);
          }
          data = await altResponse.json();
        }
        
        // Set up categories with isOpen state
        const categoriesWithState = data.categories.map((category) => ({
          ...category,
          isOpen: false // All categories start closed
        }));
        
        setCategories(categoriesWithState);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setIsLoading(false);
      }
    };

    fetchPeople();
  }, []);

  // Toggle category open/closed
  const toggleCategory = (categoryId: string) => {
    setCategories(prev => 
      prev.map(category => 
        category.id === categoryId 
          ? { ...category, isOpen: !category.isOpen } 
          : category
      )
    );
  };

  // Helper function to get the category directory from a person ID
  const getCategoryFromId = (personId: string): string => {
    // Look up the category from the actual categories list if possible
    const category = categories.find(cat => 
      cat.people.some(p => p.id === personId)
    );
    
    if (category) {
      return category.id;
    }
    
    // Fallback to the previous logic
    if (personId.includes('-')) {
      const categoryPart = personId.split('-')[0];
      // Handle special cases or pluralization
      return categoryPart + 's'; // e.g., 'politician' -> 'politicians'
    }
    
    // Default fallback
    return 'politicians';
  };

  // Filter people based on search query
  const getFilteredCategories = () => {
    // If no search query, return categories as is
    if (!searchQuery) return categories;

    // When searching, filter people and auto-expand categories with matches
    return categories.map(category => {
      // Filter people based on search query
      const filteredPeople = category.people.filter(person => 
        person.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      // If we have matching people, make sure the category is open
      if (filteredPeople.length > 0) {
        return {
          ...category,
          isOpen: true, // Auto-open categories with matches
          people: filteredPeople
        };
      }
      
      // No matches, just return filtered (empty) category
      return {
        ...category,
        people: filteredPeople
      };
    }).filter(category => category.people.length > 0); // Remove empty categories
  };

  // Get featured people from all categories (prioritizing popular ones)
  const getFeaturedPeople = () => {
    // Collect popular people first
    const popularPeople: Person[] = [];
    
    // Take the top people from each category (max 6 per category)
    categories.forEach(category => {
      // First add popular ones
      const popular = category.people
        .filter(person => person.popular)
        .slice(0, 6);
      
      popularPeople.push(...popular);
      
      // If we still need more, add regular ones to reach 6 from the category
      const regularNeeded = Math.min(6, category.people.length) - popular.length;
      if (regularNeeded > 0) {
        const regular = category.people
          .filter(person => !person.popular)
          .slice(0, regularNeeded);
        popularPeople.push(...regular);
      }
    });
    
    // Eliminate duplicates (if any)
    return [...new Map(popularPeople.map(person => [person.id, person])).values()];
  };

  const filteredCategories = getFilteredCategories();
  const featuredPeople = getFeaturedPeople();

  // Debug featured people image paths
  useEffect(() => {
    if (featuredPeople.length > 0) {
      console.log('Featured people:', featuredPeople);
      featuredPeople.slice(0, 2).forEach(person => {
        console.log(`Profile image path for ${person.name}: /persons/${getCategoryFromId(person.id)}/${person.id}/profile.png`);
      });
    }
  }, [featuredPeople]);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero section - Streamlined design */}
      <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center mb-2">
            <div className="mr-3 bg-white p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-700" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Voice Impersonation Library</h1>
          </div>
          <p className="text-xl text-blue-100 ml-[52px]">Master the art of voice mimicry with our extensive collection of personalities.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search personalities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-28 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button 
              className="absolute inset-y-1.5 right-2 px-2 py-1 flex items-center text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear searches
            </button>
          )}
        </div>
      </div>

      {/* Featured Profiles */}
      {!isLoading && !error && featuredPeople.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-6 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Featured Personalities</h2>
          <div className="overflow-x-auto pb-4">
            <div className="flex space-x-4 min-w-max">
              {featuredPeople.map(person => (
                <div 
                  key={person.id}
                  className="flex flex-col items-center cursor-pointer transition-transform hover:scale-105"
                  onClick={() => setSearchQuery(person.name)}
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 relative">
                    <div className={`absolute inset-0 rounded-full shadow-md ${
                      searchQuery && person.name.toLowerCase().includes(searchQuery.toLowerCase())
                      ? 'bg-blue-100 border-[5px] border-blue-500'
                      : 'border-2 border-black'
                    }`}></div>
                    <div className={`absolute rounded-full overflow-hidden ${
                      searchQuery && person.name.toLowerCase().includes(searchQuery.toLowerCase())
                      ? 'inset-[5px]'
                      : 'inset-[2px]'
                    }`}>
                      <img 
                        src={`${window.location.origin}/persons/${getCategoryFromId(person.id)}/${person.id}/profile.png`}
                        alt={person.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          console.error(`Failed to load image: ${target.src}`);
                          
                          // Create a placeholder with initials
                          target.style.display = 'none';
                          const parent = target.parentNode as HTMLElement;
                          
                          // Only create the placeholder if it doesn't exist yet
                          if (!parent.querySelector('.placeholder-initials')) {
                            const initialsDiv = document.createElement('div');
                            initialsDiv.className = "placeholder-initials w-full h-full bg-blue-600 flex items-center justify-center";
                            
                            const initials = person.name
                              .split(' ')
                              .map(word => word.charAt(0))
                              .join('')
                              .toUpperCase()
                              .substring(0, 2);
                            
                            const textSpan = document.createElement('span');
                            textSpan.className = "text-white font-bold";
                            textSpan.textContent = initials;
                            
                            initialsDiv.appendChild(textSpan);
                            parent.appendChild(initialsDiv);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="text-center py-12">
            <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-gray-600">Loading personalities...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg mx-auto max-w-md">
              <p>Error: {error}</p>
              <p className="mt-2 text-sm">Please try refreshing the page.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {filteredCategories.map((category) => (
              <div key={category.id} className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-gray-200 transition-all duration-300 hover:shadow-lg">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-5 flex justify-between items-center cursor-pointer transition-all duration-300 hover:from-blue-700 hover:to-blue-900 border-b-4 border-blue-900"
                  onClick={() => toggleCategory(category.id)}
                >
                  <h2 className="text-xl font-bold text-white">{category.name}</h2>
                  <div className="text-white bg-blue-500 bg-opacity-30 p-2 rounded-full">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-6 w-6 transform transition-transform duration-300 ${category.isOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {category.isOpen && (
                  <div className="p-6">
                    {category.people.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No personalities available in this category yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {category.people.map((person) => (
                          <Link 
                            key={person.id} 
                            to={`/person/${person.id}`}
                            data-category={category.id}
                            onClick={() => console.log(`Navigating to person: ${person.id} in category: ${category.id}`)}
                            className="group bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                              <img 
                                src={person.featuredImage || `${window.location.origin}/persons/${getCategoryFromId(person.id)}/${person.id}/banner.png`}
                                alt={person.name}
                                className="object-cover w-full h-48"
                                onError={(e) => {
                                  // Fallback for missing images - display name instead
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  
                                  // Create a div to hold the text
                                  const parent = target.parentNode as HTMLElement;
                                  const textDiv = document.createElement('div');
                                  textDiv.className = "w-full h-48 flex items-center justify-center bg-blue-100";
                                  
                                  // Create text content with person's name
                                  const textContent = document.createElement('span');
                                  textContent.className = "text-xl font-bold text-blue-800 text-center px-4";
                                  textContent.textContent = person.name;
                                  
                                  textDiv.appendChild(textContent);
                                  parent.appendChild(textDiv);
                                }}
                              />
                            </div>
                            <div className="p-4">
                              <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600">{person.name}</h3>
                              <p className="text-gray-600 text-sm">{person.title}</p>
                              <div className="mt-2 flex items-center">
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                  {person.sampleCount} {person.sampleCount === 1 ? 'sample' : 'samples'}
                                </span>
                                <span className="ml-2 bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full capitalize">
                                  {person.difficulty} difficulty
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No results found for "{searchQuery}"</p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-4 text-blue-600 hover:text-blue-800"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Voice Impersonator. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
} 