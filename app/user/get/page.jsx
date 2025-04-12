'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import VideoPlayer from '../../../components/VideoPlayer';
import { formatCurrency } from '../../../lib/utils';

export default function UserMoviesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [processingPayments, setProcessingPayments] = useState({});
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [movieStates, setMovieStates] = useState({});

  const fetchMovies = async () => {
    try {
      console.log('Fetching movies...');
      const response = await fetch('/api/user/movies');
      if (!response.ok) throw new Error('Failed to fetch movies');
      const data = await response.json();
      console.log('Movies fetched:', data);
      
      // Initialize movie states based on fee
      const initialMovieStates = {};
      data.forEach(movie => {
        console.log(`Initializing state for movie ${movie._id} with fee ${movie.fee}`);
        initialMovieStates[movie._id] = {
          isLocked: movie.fee > 0,
          isBlurred: movie.fee > 0
        };
      });
      console.log('Initial movie states:', initialMovieStates);
      
      setMovieStates(initialMovieStates);
      setMovies(data);
      setFilteredMovies(data);
    } catch (err) {
      console.error('Error fetching movies:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovieStates = async () => {
    try {
      console.log('Fetching movie states...');
      const response = await fetch('/api/user/movie-states');
      if (!response.ok) throw new Error('Failed to fetch movie states');
      const data = await response.json();
      console.log('Movie states fetched:', data);
      
      // Update movie states
      setMovieStates(prev => {
        console.log('Previous states before update:', prev);
        const newStates = { ...prev };
        Object.keys(data).forEach(movieId => {
          if (prev[movieId]?.isLocked === false && prev[movieId]?.isBlurred === false) {
            // Skip updating if the movie is already unlocked and unblurred
            return;
          }
          newStates[movieId] = data[movieId];
        });
        console.log('New states after update:', newStates);
        return newStates;
      });
    } catch (err) {
      console.error('Error fetching movie states:', err);
      setError(err.message);
    }
  };

  const updateMovieState = async (movieId, isLocked, isBlurred) => {
    try {
      const response = await fetch('/api/user/movie-states', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movieId,
          isLocked,
          isBlurred,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update movie state');
      }

      const data = await response.json();
      setMovieStates(prev => ({
        ...prev,
        [movieId]: {
          isLocked: data.isLocked,
          isBlurred: data.isBlurred
        }
      }));
    } catch (err) {
      console.error('Error updating movie state:', err);
      setError(err.message);
    }
  };

  const handlePayment = async (movieId) => {
    try {
      setProcessingPayments(prev => ({ ...prev, [movieId]: true }));
      const movie = movies.find(m => m._id === movieId);
      if (!movie) throw new Error('Movie not found');
      
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId, amount: movie.fee }),
      });

      if (!response.ok) throw new Error('Payment failed');
      const data = await response.json();
      window.location.href = data.paymentUrl;
    } catch (err) {
      setError(err.message);
      setProcessingPayments(prev => ({ ...prev, [movieId]: false }));
    }
  };

  useEffect(() => {
    console.log('Session changed:', session);
    if (session) {
      fetchMovies();
      fetchMovieStates();
    }
  }, [session]);

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const movieId = searchParams.get('movieId');
    
    console.log('URL params:', { paymentStatus, movieId });
    console.log('Current movie states:', movieStates);
    
    if (paymentStatus === 'success' && movieId) {
      console.log('Payment success detected for movie:', movieId);
      
      // Immediately update local state to unlocked and unblurred
      setMovieStates(prev => {
        console.log('Previous movie states:', prev);
        const newStates = {
          ...prev,
          [movieId]: {
            isLocked: false,
            isBlurred: false
          }
        };
        console.log('New movie states:', newStates);
        return newStates;
      });
      
      // Show success message
      setPaymentSuccess(true);
      
      // Fetch latest movie states from API
      const updateStates = async () => {
        try {
          const response = await fetch('/api/user/movie-states');
          if (!response.ok) throw new Error('Failed to fetch movie states');
          const data = await response.json();
          console.log('Fresh movie states fetched:', data);
          
          setMovieStates(prev => {
            const newStates = { ...prev, ...data };
            console.log('Updated movie states:', newStates);
            return newStates;
          });
          
          // Force a re-render of the movies
          setMovies(prevMovies => {
            console.log('Forcing movie list re-render');
            return [...prevMovies];
          });
        } catch (err) {
          console.error('Error updating movie states:', err);
        }
      };
      
      updateStates();
      
      // Clear URL parameters after a short delay to ensure state updates are processed
      setTimeout(() => {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('payment');
        newUrl.searchParams.delete('movieId');
        window.history.replaceState({}, '', newUrl.toString());
      }, 1000);
    }
  }, [searchParams]);

  useEffect(() => {
    const filtered = movies.filter(movie =>
      movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMovies(filtered);
  }, [searchQuery, movies]);

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p className="text-xl font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        {paymentSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            Payment successful! You can now watch the movie.
          </div>
        )}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Movies Library</h1>
          <div className="relative">
            <input
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredMovies.map((movie) => {
            const movieIdStr = movie._id.toString();
            const movieState = movieStates[movieIdStr] || { isLocked: true, isBlurred: true };
            const isProcessing = processingPayments[movie._id];
            
            console.log(`Rendering movie ${movieIdStr}:`, movieState);
            
            return (
              <div
                key={movie._id}
                className={`bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 ${
                  movieState.isLocked ? 'relative' : ''
                }`}
              >
                {movieState.isLocked && (
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4">
                    <div className="bg-white/90 rounded-lg p-6 shadow-lg max-w-sm w-full">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Premium Content</h3>
                      <p className="text-gray-600 mb-4">
                        Pay ${movie.fee} to unlock this movie and enjoy unlimited streaming
                      </p>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-500">Price:</span>
                        <span className="text-lg font-bold text-blue-600">${movie.fee}</span>
                      </div>
                      <button
                        onClick={() => handlePayment(movie._id)}
                        disabled={isProcessing}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Unlock Movie
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                <div className="relative h-64">
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                    alt={movie.title}
                    fill
                    className={`object-cover ${movieState.isBlurred ? 'blur-[2px]' : ''}`}
                  />
                  <div className="absolute top-2 right-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-sm font-semibold">
                    {movie.voteAverage.toFixed(1)}
                  </div>
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2 text-gray-800">{movie.title}</h2>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{movie.description}</p>
                  
                  {/* Video Player Section */}
                  {!movieState.isLocked && movie.videoUrl && (
                    <div className="mb-4">
                      <VideoPlayer url={movie.videoUrl} />
                    </div>
                  )}
                  
                  {/* Trailer Section */}
                  {movie.trailerUrl && (
                    <div className="mb-4">
                      <iframe
                        src={movie.trailerUrl}
                        title={`${movie.title} Trailer`}
                        className="w-full aspect-video rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                  
                  {/* Video Info */}
                  {!movieState.isLocked && (movie.videoUrl || movie.trailerUrl) && (
                    <div className="mb-4 text-sm text-gray-500">
                      <p>Quality: {movie.videoQuality}</p>
                      <p>Format: {movie.videoFormat}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {movie.genres.map((genre, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{movie.releaseDate}</span>
                    <span>{movie.runtime} min</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredMovies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No movies found</p>
          </div>
        )}
      </div>
    </div>
  );
} 