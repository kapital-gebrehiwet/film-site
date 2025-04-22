'use client'
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Sidebar from '../../components/sidebarUser';
import UserNavbar from '../../components/UserNavbar';
import { useTheme } from '../../context/ThemeContext';
import { PlayIcon, StarIcon, ClockIcon, TrendingUpIcon } from 'lucide-react';

const UserDashboard = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDarkMode } = useTheme();
  const { data: session, status } = useSession();
  const router = useRouter();

  // State for real data
  const [userData, setUserData] = useState(null);
  const [continueWatching, setContinueWatching] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (status !== 'authenticated') return;

      try {
        setLoading(true);
        setError(null);

        // Fetch user profile data
        const userResponse = await fetch('/api/user/profile');
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user data');
        }
        const userData = await userResponse.json();
        setUserData(userData);

        // Fetch continue watching data
        const watchingResponse = await fetch('/api/user/watching/current');
        if (watchingResponse.ok) {
          const watchingData = await watchingResponse.json();
          setContinueWatching(watchingData);
        }

        // Fetch trending movies
        const trendingResponse = await fetch('/api/movies/trending');
        if (trendingResponse.ok) {
          const trendingData = await trendingResponse.json();
          setTrendingMovies(trendingData);
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [status]);

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <div className={`min-h-screen user-dashboard ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <UserNavbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen user-dashboard ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
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
            <h1 className="text-3xl font-bold mb-2">
              Welcome {userData?.name || session?.user?.name || 'User'}!
            </h1>
            <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {userData?.subscription?.plan === 'free' 
                ? 'Upgrade your plan to unlock premium content'
                : 'Discover new movies and continue watching your favorites'}
            </p>
          </div>

          {/* Continue Watching Section */}
          {continueWatching.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-semibold mb-6">Continue Watching</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {continueWatching.map((movie) => (
                  <div
                    key={movie._id}
                    className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg cursor-pointer`}
                    onClick={() => router.push(`/user/watch/${movie._id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative h-24 w-40 bg-gray-700 rounded-lg overflow-hidden">
                        {movie.poster ? (
                          <Image
                            src={movie.poster}
                            alt={movie.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <PlayIcon className="h-8 w-8 text-white opacity-50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{movie.title}</h3>
                        <div className="flex items-center gap-4 text-sm mb-4">
                          <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <StarIcon className="h-4 w-4 text-yellow-500" />
                            {movie.rating || 'N/A'}
                          </span>
                          <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {movie.genre}
                          </span>
                          <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <ClockIcon className="h-4 w-4" />
                            {formatDuration(movie.duration)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(movie.watchProgress || 0) * 100}%` }}
                          ></div>
                        </div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {Math.round((movie.watchProgress || 0) * 100)}% watched
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trending Section */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUpIcon className="h-6 w-6 text-blue-500" />
              <h2 className="text-2xl font-semibold">Trending Now</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trendingMovies.map((movie) => (
                <div
                  key={movie._id}
                  className={`rounded-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md cursor-pointer`}
                  onClick={() => router.push(`/user/movies/${movie._id}`)}
                >
                  <div className="relative h-48">
                    {movie.poster ? (
                      <Image
                        src={movie.poster}
                        alt={movie.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full bg-gray-700 flex items-center justify-center">
                        <PlayIcon className="h-8 w-8 text-white opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium mb-1">{movie.title}</h3>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {movie.genre}
                      </p>
                      <div className="flex items-center gap-1">
                        <StarIcon className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">{movie.rating || 'N/A'}</span>
                      </div>
                    </div>
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
