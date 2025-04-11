'use client'
import { useState } from 'react';
import Sidebar from '../../components/sidebarUser';
import UserNavbar from '../../components/UserNavbar';
import { useTheme } from '../../context/ThemeContext';
import { PlayIcon, StarIcon, ClockIcon, TrendingUpIcon } from 'lucide-react';

const UserDashboard = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDarkMode } = useTheme();

  // Sample featured movies data
  const featuredMovies = [
    { id: 1, title: 'The Dark Knight', genre: 'Action', rating: 4.8, duration: '2h 32m' },
    { id: 2, title: 'Inception', genre: 'Sci-Fi', rating: 4.7, duration: '2h 28m' },
    { id: 3, title: 'Interstellar', genre: 'Sci-Fi', rating: 4.9, duration: '2h 49m' },
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Top Navbar */}
      <UserNavbar />

      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className={`fixed top-4 left-4 z-50 md:hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-600'} p-2 rounded-md text-white`}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out z-40`}>
        <Sidebar />
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="md:ml-64 min-h-screen">
        <div className={`p-4 md:p-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {/* Welcome Section */}
          <div className="mb-8 mt-20">
            <h1 className="text-3xl font-bold mb-2">Welcome user!</h1>
            <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Discover new movies and continue watching your favorites
            </p>
          </div>

         
          {/* Continue Watching Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Continue Watching</h2>
            <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <div className="flex items-center gap-4">
                <div className="h-24 w-40 bg-gray-700 rounded-lg flex items-center justify-center">
                  <PlayIcon className="h-8 w-8 text-white opacity-50" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">The Matrix</h3>
                  <div className="flex items-center gap-4 text-sm mb-4">
                    <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <StarIcon className="h-4 w-4 text-yellow-500" />
                      4.6
                    </span>
                    <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Sci-Fi
                    </span>
                    <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <ClockIcon className="h-4 w-4" />
                      2h 16m
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    45% watched
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trending Section */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUpIcon className="h-6 w-6 text-blue-500" />
              <h2 className="text-2xl font-semibold">Trending Now</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className={`rounded-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}
                >
                  <div className="h-32 bg-gray-700"></div>
                  <div className="p-3">
                    <h3 className="font-medium mb-1">Movie Title {item}</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Action • 2023
                    </p>
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

export default UserDashboard;
