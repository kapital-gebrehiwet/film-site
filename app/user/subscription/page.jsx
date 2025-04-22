'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../../context/ThemeContext';
import Sidebar from '../../../components/sidebarUser';
import UserNavbar from '../../../components/UserNavbar';
import { CreditCardIcon, CheckCircleIcon, XCircleIcon, ClockIcon, StarIcon } from 'lucide-react';
import Image from 'next/image';

const UserSubscriptionPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDarkMode } = useTheme();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [subscription, setSubscription] = useState(null);
  const [purchasedMovies, setPurchasedMovies] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (status !== 'authenticated') return;

      try {
        setLoading(true);
        setError(null);

        // Fetch user profile
        const response = await fetch('/api/user/profile');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch user data' }));
          throw new Error(errorData.error || 'Failed to fetch user data');
        }
        
        const data = await response.json();
        
        // Set subscription data
        setSubscription(data.subscription || {
          plan: 'free',
          status: 'inactive',
          startDate: null,
          endDate: null,
          autoRenew: false
        });
        
        // Fetch purchased movies details
        if (data.purchasedMovies && data.purchasedMovies.length > 0) {
          try {
            const moviePromises = data.purchasedMovies.map(async movieId => {
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
            setPurchasedMovies(movies);
          } catch (movieError) {
            console.error('Error in movie fetching process:', movieError);
            setPurchasedMovies([]);
          }
        }

        // Fetch payment history with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            const paymentResponse = await fetch('/api/user/payments');
            if (!paymentResponse.ok) {
              const errorData = await paymentResponse.json().catch(() => ({ error: 'Failed to fetch payment history' }));
              throw new Error(errorData.error || 'Failed to fetch payment history');
            }
            const paymentData = await paymentResponse.json();
            setPaymentHistory(paymentData);
            break;
          } catch (paymentError) {
            console.error(`Payment history fetch attempt ${retryCount + 1} failed:`, paymentError);
            retryCount++;
            if (retryCount === maxRetries) {
              console.error('All payment history fetch attempts failed');
              setPaymentHistory([]);
            } else {
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            }
          }
        }

      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.message || 'Failed to load subscription information');
        setPurchasedMovies([]);
        setPaymentHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [status]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSubscriptionStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-500';
      case 'inactive':
        return 'text-red-500';
      case 'expired':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getSubscriptionPlanColor = (plan) => {
    switch (plan) {
      case 'premium':
        return 'text-purple-500';
      case 'vip':
        return 'text-yellow-500';
      case 'basic':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
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

  if (error) {
    return (
      <div className={`min-h-screen user-dashboard ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <UserNavbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-red-500 text-center">
            <p className="text-xl font-bold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen user-dashboard ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
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
          {/* Subscription Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 mt-20">Your Subscription</h1>
            <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Manage your subscription and view your purchased movies
            </p>
          </div>

          {/* Purchased Movies Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Purchased Movies</h2>
            
            {purchasedMovies.length === 0 ? (
              <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg text-center`}>
                <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  You haven't purchased any movies yet.
                </p>
                <button 
                  onClick={() => router.push('/user/get/free')}
                  className={`mt-4 px-4 py-2 rounded-lg ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
                >
                  Browse Movies
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {purchasedMovies.map((movie) => (
                  <div 
                    key={movie._id} 
                    className={`rounded-xl overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}
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
                        <div className={`h-full w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center`}>
                          <span className="text-4xl text-gray-400">🎬</span>
                        </div>
                      )}
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-900' : 'bg-white'} text-xs font-medium`}>
                        ${movie.fee || 0}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-lg mb-1">{movie.title}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {movie.genre}
                        </span>
                        <span className="text-gray-300">•</span>
                        <div className="flex items-center">
                          <StarIcon className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-sm">{movie.rating || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-green-500">Purchased</span>
                        </div>
                        <button 
                          onClick={() => router.push(`/user/movies/${movie._id}`)}
                          className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}
                        >
                          Watch Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment History Section */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Payment History</h2>
            
            {paymentHistory.length > 0 ? (
              <div className={`rounded-xl overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <table className="w-full">
                  <thead>
                    <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <th className="text-left py-3 px-4">Movie</th>
                      <th className="text-left py-3 px-4">Amount</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment) => {
                      const movie = purchasedMovies.find(m => m._id === payment.movieId);
                      return (
                        <tr key={payment.tx_ref} className={`${isDarkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
                          <td className="py-3 px-4">
                            {movie ? movie.title : 'Unknown Movie'}
                          </td>
                          <td className="py-3 px-4">
                            ${payment.amount || 0}
                          </td>
                          <td className="py-3 px-4">
                            {formatDate(payment.paymentDate)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              payment.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : payment.status === 'pending' 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs font-mono">
                            {payment.tx_ref || 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg text-center`}>
                <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  No payment history available.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSubscriptionPage; 