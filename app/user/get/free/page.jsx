'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import VideoPlayer from '../../../../components/VideoPlayer';
import { formatCurrency } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';
import { Input } from "../../../../components/ui/input";

// Define movie categories based on purchase status
const MOVIE_CATEGORIES = [
  { id: 'free', name: 'Free Movies', icon: '🎬', description: 'Movies available for free streaming' },
  { id: 'purchased', name: 'My Purchases', icon: '✅', description: 'Movies you have purchased' },
  { id: 'buy', name: 'Premium Movies', icon: '💎', description: 'Movies available for purchase' },
  { id: 'all', name: 'All Movies', icon: '📽️', description: 'Browse all available movies' }
];

export default function FreeMoviesPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieStates, setMovieStates] = useState({});
  const [purchasedMovies, setPurchasedMovies] = useState([]);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [categorizedMovies, setCategorizedMovies] = useState({});

  // Function to fetch purchased movies details
  const fetchPurchasedMovies = async () => {
    try {
      // Fetch user profile
      const userResponse = await fetch('/api/user/profile');
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }
      const userData = await userResponse.json();
      
      // If user has purchased movies, fetch their details
      if (userData.purchasedMovies && userData.purchasedMovies.length > 0) {
        const moviePromises = userData.purchasedMovies.map(async movieId => {
          try {
            const movieResponse = await fetch(`/api/movies/${movieId}`);
            if (!movieResponse.ok) {
              console.warn(`Movie ${movieId} not found or inaccessible`);
              return null;
            }
            return movieResponse.json();
          } catch (movieError) {
            console.warn(`Error fetching movie ${movieId}:`, movieError);
            return null;
          }
        });
        
        const movies = (await Promise.all(moviePromises)).filter(movie => movie !== null);
        console.log('Fetched purchased movies:', movies);
        return movies;
      }
      return [];
    } catch (error) {
      console.error('Error fetching purchased movies:', error);
      return [];
    }
  };

  const fetchMovies = async () => {
    try {
      setLoading(true);
      
      // First fetch purchased movies
      const purchasedMoviesList = await fetchPurchasedMovies();
      setPurchasedMovies(purchasedMoviesList);
      console.log('Purchased movies set:', purchasedMoviesList);
      
      // Then fetch all movies
      const response = await fetch('/api/user/movies');
      if (!response.ok) throw new Error('Failed to fetch movies');
      const data = await response.json();
      
      // Initialize movie states
      const initialMovieStates = {};
      data.forEach(movie => {
        const movieIdStr = movie._id.toString();
        const isPurchased = purchasedMoviesList.some(pm => pm._id === movieIdStr);
        
        initialMovieStates[movieIdStr] = {
          isLocked: movie.fee > 0 && !isPurchased,
          isBlurred: movie.fee > 0 && !isPurchased
        };
      });
      
      setMovieStates(initialMovieStates);
      setMovies(data);
      
      // Categorize movies
      const categorized = {
        free: data.filter(movie => movie.fee === 0),
        purchased: purchasedMoviesList,
        buy: data.filter(movie => {
          const isPurchased = purchasedMoviesList.some(pm => pm._id === movie._id.toString());
          return movie.fee > 0 && !isPurchased;
        }),
        all: data
      };

      // Sort each category
      Object.keys(categorized).forEach(category => {
        categorized[category].sort((a, b) => {
          if (b.voteAverage !== a.voteAverage) {
            return b.voteAverage - a.voteAverage;
          }
          return b.popularity - a.popularity;
        });
      });

      console.log('Categorized movies:', {
        free: categorized.free.length,
        purchased: categorized.purchased.length,
        buy: categorized.buy.length,
        all: categorized.all.length
      });

      setCategorizedMovies(categorized);
      setFilteredMovies(categorized[activeCategory]);
    } catch (err) {
      console.error('Error fetching movies:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (movieId) => {
    if (!session?.user) {
      router.push('/');
      return;
    }

    try {
      setPaymentProcessing(true);
      
      // Find the movie to get its fee
      const movie = movies.find(m => m._id === movieId);
      if (!movie) {
        throw new Error('Movie not found');
      }
      
      console.log('Initiating payment for movie:', movieId, 'with fee:', movie.fee);
      
      // Create payment session
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movieId,
          amount: movie.fee,
          email: session.user.email,
          type: 'movie',
          userEmail: session.user.email
        }),
      });

      const data = await response.json();
      console.log('Payment initiation response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment session');
      }
      
      // Verify the payment session was created successfully
      if (!data.checkoutUrl) {
        console.error('Invalid payment response:', data);
        throw new Error('Invalid payment session response: Missing checkout URL');
      }

      // Ensure we have a transaction reference
      const tx_ref = data.tx_ref || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store payment intent in session storage
      sessionStorage.setItem('pendingPaymentMovieId', movieId);
      sessionStorage.setItem('pendingPaymentTxRef', tx_ref);
      sessionStorage.setItem('paymentStartTime', Date.now().toString());

      console.log('Redirecting to payment URL:', data.checkoutUrl);
      // Redirect to Chapa checkout
      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-full">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold">Payment Failed</p>
            <p className="text-sm">{error.message || 'Failed to initiate payment. Please try again.'}</p>
          </div>
        </div>,
        {
          duration: 4000,
          position: 'top-right',
          style: {
            background: '#EF4444',
            color: 'white',
            padding: '1rem',
            borderRadius: '0.5rem',
          },
        }
      );
      
      // Clean up session storage on error
      sessionStorage.removeItem('pendingPaymentMovieId');
      sessionStorage.removeItem('pendingPaymentTxRef');
      sessionStorage.removeItem('paymentStartTime');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const checkPendingPayment = async () => {
    const pendingMovieId = sessionStorage.getItem('pendingPaymentMovieId');
    const pendingTxRef = sessionStorage.getItem('pendingPaymentTxRef');
    const paymentStartTime = parseInt(sessionStorage.getItem('paymentStartTime') || '0');
    
    // Clear expired payment attempts (older than 1 hour)
    if (Date.now() - paymentStartTime > 3600000) {
      sessionStorage.removeItem('pendingPaymentMovieId');
      sessionStorage.removeItem('pendingPaymentTxRef');
      sessionStorage.removeItem('paymentStartTime');
      return;
    }
    
    if (!pendingMovieId || !pendingTxRef) return;
    
    try {
      setPaymentProcessing(true);
      
      // Check payment status with retry mechanism
      let paymentStatus = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries && !paymentStatus) {
        try {
          const response = await fetch(`/api/payment/status?movieId=${pendingMovieId}&tx_ref=${pendingTxRef}`);
          if (!response.ok) throw new Error('Failed to check payment status');
          
          const data = await response.json();
          paymentStatus = data.status;
          
          if (paymentStatus === 'success') {
            console.log('Payment successful, updating movie states for:', pendingMovieId);
            
            // Find the movie details
            const movie = movies.find(m => m._id === pendingMovieId);
            
            // Show success notification with movie details
            toast.success(
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12">
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                    alt={movie.title}
                    fill
                    className="object-cover rounded"
                  />
                </div>
                <div>
                  <p className="font-semibold">Movie Unlocked!</p>
                  <p className="text-sm text-gray-600">{movie.title} is now available to watch</p>
                </div>
              </div>,
              {
                duration: 4000,
                position: 'top-right',
                style: {
                  background: '#10B981',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                },
              }
            );
            
            // Update movie states
            setMovieStates(prevStates => {
              const newStates = {
                ...prevStates,
                [pendingMovieId]: {
                  isLocked: false,
                  isBlurred: false
                }
              };
              console.log('Updated movie states:', newStates);
              return newStates;
            });

            // Update purchased movies list
            setPurchasedMovies(prev => {
              const updated = [...new Set([...prev, pendingMovieId])];
              console.log('Updated purchased movies:', updated);
              return updated;
            });
            
            // Clear payment data from session storage
            sessionStorage.removeItem('pendingPaymentMovieId');
            sessionStorage.removeItem('pendingPaymentTxRef');
            sessionStorage.removeItem('paymentStartTime');
            
            // Fetch updated movies data
            await fetchMovies();
            return;
          } else if (paymentStatus === 'failed') {
            throw new Error('Payment failed');
          }
        } catch (error) {
          retryCount++;
          if (retryCount === maxRetries) {
            throw error;
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
      
      if (paymentStatus === 'failed') {
        toast.error(
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-full">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Payment Failed</p>
              <p className="text-sm">Please try again</p>
            </div>
          </div>,
          {
            duration: 4000,
            position: 'top-right',
            style: {
              background: '#EF4444',
              color: 'white',
              padding: '1rem',
              borderRadius: '0.5rem',
            },
          }
        );
        sessionStorage.removeItem('pendingPaymentMovieId');
        sessionStorage.removeItem('pendingPaymentTxRef');
        sessionStorage.removeItem('paymentStartTime');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast.error(
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-full">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">There was an error checking your payment status. Please refresh the page.</p>
          </div>
        </div>,
        {
          duration: 4000,
          position: 'top-right',
          style: {
            background: '#EF4444',
            color: 'white',
            padding: '1rem',
            borderRadius: '0.5rem',
          },
        }
      );
    } finally {
      setPaymentProcessing(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else {
      fetchMovies();
    }
  }, [status]);

  // Add new useEffect for payment verification
  useEffect(() => {
    const verifyPayment = async () => {
      const { searchParams } = new URL(window.location.href);
      const tx_ref = searchParams.get('tx_ref');
      
      if (tx_ref) {
        try {
          console.log('Verifying payment with tx_ref:', tx_ref);
          const response = await fetch(`/api/payment/verify?tx_ref=${tx_ref}`);
          const data = await response.json();
          
          if (data.success) {
            console.log('Payment verified successfully:', data);
            toast.success('Payment verified successfully!');
            // Refresh movies to update locked status
            fetchMovies();
          } else {
            console.error('Payment verification failed:', data);
            toast.error('Failed to verify payment');
          }
        } catch (error) {
          console.error('Error verifying payment:', error);
          toast.error('Error verifying payment');
        }
      }
    };

    verifyPayment();
  }, []);

  useEffect(() => {
    if (session) {
      checkPendingPayment();
    }
  }, [session]);

  // Update useEffect for search and category filtering
  useEffect(() => {
    if (searchQuery) {
      const filtered = movies.filter(movie =>
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMovies(filtered);
    } else {
      setFilteredMovies(categorizedMovies[activeCategory] || []);
    }
  }, [searchQuery, activeCategory, categorizedMovies, movies]);

  if (status === 'loading' || paymentProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Movies</h1>
          <div className="relative">
            <Input
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

        {/* Category Tabs */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex space-x-4 pb-4">
            {MOVIE_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  activeCategory === category.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{category.icon}</span>
                <div className="text-left">
                  <span className="font-medium">{category.name}</span>
                  <p className="text-xs opacity-75">{category.description}</p>
                </div>
                <span className="text-sm opacity-75">
                  ({categorizedMovies[category.id]?.length || 0})
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredMovies.map((movie) => {
            const movieIdStr = movie._id.toString();
            const movieState = movieStates[movieIdStr] || { isLocked: true, isBlurred: true };
            
            return (
              <div
                key={movie._id}
                className={`bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 ${
                  movieState.isLocked ? 'relative' : ''
                }`}
              >
                {/* Lock Overlay */}
                {movieState.isLocked && (
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4">
                    <div className="bg-white/90 rounded-lg p-6 shadow-lg max-w-sm w-full">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Premium Content</h3>
                      <p className="text-gray-600 mb-4">
                        Pay {formatCurrency(movie.fee)} to unlock this movie and enjoy unlimited streaming
                      </p>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-500">Price:</span>
                        <span className="text-lg font-bold text-blue-600">{formatCurrency(movie.fee)}</span>
                      </div>
                      <button
                        onClick={() => handlePayment(movie._id)}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Unlock Movie
                      </button>
                    </div>
                  </div>
                )}

                {/* Movie Info Section */}
                <div className="flex flex-col h-full">
                  {/* Poster and Basic Info */}
                  <div>
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
                      <p className="text-gray-600 text-sm mb-4">{movie.description}</p>
                      
                      {/* Movie Details */}
                      <div className="mb-4 text-sm text-gray-500">
                        <p><span className="font-semibold">Release Date:</span> {movie.releaseDate}</p>
                        <p><span className="font-semibold">Runtime:</span> {movie.runtime} minutes</p>
                        <p><span className="font-semibold">Status:</span> {movie.fee === 0 ? 'Free' : 'Premium'}</p>
                        {movie.fee > 0 && <p><span className="font-semibold">Price:</span> {formatCurrency(movie.fee)}</p>}
                      </div>

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
                    </div>
                  </div>

                  {/* Video Section - Only show if unlocked and has video content */}
                  {!movieState.isLocked && (movie.videoUrl || movie.trailerUrl) && (
                    <div className="border-t border-gray-200 mt-auto">
                      {movie.trailerUrl && (
                        <div className="p-4">
                          <h3 className="text-lg font-semibold mb-2">Watch Trailer</h3>
                          <iframe
                            src={movie.trailerUrl}
                            title={`${movie.title} Trailer`}
                            className="w-full aspect-video rounded-lg"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredMovies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No movies found in this category</p>
          </div>
        )}
      </div>
    </div>
  );
} 