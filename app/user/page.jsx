'use client'
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Sidebar from '../../components/sidebarUser';
import UserNavbar from '../../components/UserNavbar';
import { useTheme } from '../../context/ThemeContext';
import { PlayIcon, StarIcon, ClockIcon, TrendingUpIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import VideoPlayer from '../../components/VideoPlayer';

const MovieModal = ({ movie, onClose, isDarkMode }) => {
  const [videoError, setVideoError] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const videoRef = useRef(null);

  const getEmbedUrl = (url) => {
    if (!url) return null;
    // Convert YouTube watch URL to embed URL with parameters for better appearance
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=0&modestbranding=1&rel=0&showinfo=1&color=white`;
    }
    return url;
  };

  const isYouTubeUrl = (url) => {
    return url && (url.includes('youtube.com') || url.includes('youtu.be'));
  };

  const handleVideoError = (e) => {
    setVideoError('Error loading video. Please try again.');
    setIsVideoLoading(false);
  };

  const handleVideoLoad = () => {
    setIsVideoLoading(false);
    setVideoError(null);
  };

  if (!movie) return null;

  const embedVideoUrl = getEmbedUrl(movie.videoUrl);
  const embedTrailerUrl = getEmbedUrl(movie.trailerUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Content */}
      <div className={`relative w-full max-w-5xl mx-4 ${isDarkMode ? 'bg-gray-900/95' : 'bg-white/95'} rounded-xl shadow-2xl overflow-hidden backdrop-blur-md`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-all duration-200 hover:scale-110"
        >
          <X className="h-6 w-6 text-white" />
        </button>

        <div className="flex flex-col">
          {/* Video Section with 16:9 Aspect Ratio */}
          <div className="relative w-full pt-[56.25%] bg-black">
            {isVideoLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-400/20 border-t-white"></div>
              </div>
            )}
            
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-lg backdrop-blur-sm">
                  <p>{videoError}</p>
                </div>
              </div>
            )}

            {movie.videoUrl ? (
              isYouTubeUrl(movie.videoUrl) ? (
                <iframe
                  src={embedVideoUrl}
                  title={`${movie.title} Video`}
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={handleVideoLoad}
                  onError={handleVideoError}
                />
              ) : (
                <video
                  ref={videoRef}
                  className="absolute top-0 left-0 w-full h-full object-contain bg-black"
                  controls
                  poster={movie.posterPath ? `https://image.tmdb.org/t/p/w500${movie.posterPath}` : undefined}
                  onLoadedData={handleVideoLoad}
                  onError={handleVideoError}
                  preload="auto"
                  playsInline
                >
                  <source src={movie.videoUrl} type="video/mp4" />
                  <source src={movie.videoUrl} type="video/webm" />
                  Your browser does not support the video tag.
                </video>
              )
            ) : movie.trailerUrl ? (
              <iframe
                src={embedTrailerUrl}
                title={`${movie.title} Trailer`}
                className="absolute top-0 left-0 w-full h-full"
                style={{ border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => setIsVideoLoading(false)}
                onError={handleVideoError}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                <p className="text-gray-400 text-lg">No video available</p>
              </div>
            )}
          </div>

          {/* Movie Details with Gradient Overlay */}
          <div className={`p-6 ${isDarkMode ? 'bg-gradient-to-t from-gray-900 via-gray-900/95 to-gray-900/90' : 'bg-gradient-to-t from-white via-white/95 to-white/90'}`}>
            <h2 className={`text-2xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {movie.title}
            </h2>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center">
                <StarIcon className="h-5 w-5 text-yellow-500 mr-1" />
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-medium`}>
                  {movie.voteAverage || 'N/A'}
                </span>
              </div>
              {movie.runtime && (
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                </span>
              )}
              {movie.releaseDate && (
                <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {new Date(movie.releaseDate).getFullYear()}
                </span>
              )}
            </div>

            <p className={`text-base mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {movie.description}
            </p>

            <div className="flex flex-wrap gap-2">
              {movie.genres?.map((genre, index) => (
                <span
                  key={index}
                  className={`px-3 py-1 rounded-full text-sm ${
                    isDarkMode 
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } transition-colors duration-200`}
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MovieRow = ({ title, movies, isDarkMode }) => {
  const rowRef = useRef(null);
  const [isMoved, setIsMoved] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);

  const handleClick = (direction) => {
    setIsMoved(true);
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const handleMovieClick = (movie) => {
    setSelectedMovie(movie);
  };

  return (
    <>
      <div className="space-y-0.5 md:space-y-2 mb-8">
        <h2 className="text-2xl font-semibold mb-4">{title}</h2>
        <div className="group relative md:-ml-2">
          <ChevronLeft
            className={`absolute top-0 bottom-0 left-2 z-40 m-auto h-9 w-9 cursor-pointer opacity-0 transition hover:scale-125 group-hover:opacity-100 ${
              !isMoved && 'hidden'
            }`}
            onClick={() => handleClick('left')}
          />
          <div
            ref={rowRef}
            className="flex items-center space-x-2 overflow-x-scroll scrollbar-hide md:p-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {movies.map((movie) => (
              <div
                key={movie._id}
                className="relative h-36 min-w-[260px] cursor-pointer transition duration-200 ease-out hover:scale-105"
                onClick={() => handleMovieClick(movie)}
              >
                <Image
                  src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                  alt={movie.title}
                  fill
                  className="rounded-lg object-cover"
                />
                <div className={`absolute bottom-0 left-0 right-0 p-3 ${isDarkMode ? 'bg-black/70' : 'bg-white/70'} backdrop-blur-sm rounded-b-lg`}>
                  <h3 className="font-medium text-sm truncate">{movie.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <StarIcon className="h-4 w-4 text-yellow-500" />
                    <span className="text-xs">{movie.voteAverage || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <ChevronRight
            className="absolute top-0 bottom-0 right-2 z-40 m-auto h-9 w-9 cursor-pointer opacity-0 transition hover:scale-125 group-hover:opacity-100"
            onClick={() => handleClick('right')}
          />
        </div>
      </div>

      {/* Movie Modal */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          isDarkMode={isDarkMode}
        />
      )}
    </>
  );
};

const UserDashboard = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDarkMode } = useTheme();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [userData, setUserData] = useState(null);
  const [freeMovies, setFreeMovies] = useState([]);
  const [purchasedMovies, setPurchasedMovies] = useState([]);
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

        // Fetch all movies
        const moviesResponse = await fetch('/api/user/movies');
        if (moviesResponse.ok) {
          const moviesData = await moviesResponse.json();
          
          // Filter free movies
          const free = moviesData.filter(movie => movie.fee === 0);
          setFreeMovies(free);

          // Get purchased movies
          if (userData.purchasedMovies?.length > 0) {
            const purchased = moviesData.filter(movie => 
              userData.purchasedMovies.includes(movie._id)
            );
            setPurchasedMovies(purchased);
          }
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
      {/* Navbar with hamburger menu handler */}
      <UserNavbar onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

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
              Discover new movies and continue watching your favorites
            </p>
          </div>

          {/* Free Movies Section */}
          {freeMovies.length > 0 && (
            <MovieRow title="Free Movies" movies={freeMovies} isDarkMode={isDarkMode} />
          )}

          {/* Purchased Movies Section */}
          {purchasedMovies.length > 0 && (
            <MovieRow title="My Movies" movies={purchasedMovies} isDarkMode={isDarkMode} />
          )}

          {/* Trending Movies Section */}
          {trendingMovies.length > 0 && (
            <MovieRow title="Trending Now" movies={trendingMovies} isDarkMode={isDarkMode} />
          )}
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
