'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/sidebarAdmin';
import AdminNavbar from '../../components/AdminNavbar';
import { useTheme } from '../../context/ThemeContext';
import { UsersIcon, VideoIcon, DollarSignIcon, TrendingUpIcon, ActivityIcon, SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const AdminDashboard = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDarkMode } = useTheme();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userCount, setUserCount] = useState(0);
  const [movieCount, setMovieCount] = useState(0);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState({
    users: true,
    movies: true,
    list: true
  });
  const [feeUpdates, setFeeUpdates] = useState({});

  // Sample recent activity data
  const recentActivity = [
    {
      id: 1,
      user: 'John Doe',
      action: 'watched',
      movie: 'The Dark Knight',
      time: '2 hours ago'
    },
    {
      id: 2,
      user: 'Jane Smith',
      action: 'added',
      movie: 'Inception',
      time: '4 hours ago'
    },
    {
      id: 3,
      user: 'Mike Johnson',
      action: 'rated',
      movie: 'Interstellar',
      time: '6 hours ago'
    }
  ];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !session?.user?.isAdmin) {
      router.push('/user');
    }
  }, [status, session, router]);

  useEffect(() => {
    const fetchCounts = async () => {
      if (status !== 'authenticated' || !session?.user?.isAdmin) return;

      try {
        // Fetch user count
        const userResponse = await fetch('/api/admin/users/count', {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserCount(userData.count);
        }
        setLoading(prev => ({ ...prev, users: false }));

        // Fetch movie count
        const movieResponse = await fetch('/api/admin/movies/count', {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (movieResponse.ok) {
          const movieData = await movieResponse.json();
          setMovieCount(movieData.count);
        }
        setLoading(prev => ({ ...prev, movies: false }));
      } catch (error) {
        console.error('Error fetching counts:', error);
        setLoading(prev => ({ ...prev, users: false, movies: false }));
      }
    };

    if (status === 'authenticated' && session?.user?.isAdmin) {
      fetchCounts();
    }
  }, [status, session]);

  useEffect(() => {
    const fetchMovies = async () => {
      if (status !== 'authenticated' || !session?.user?.isAdmin) return;

      try {
        const response = await fetch('/api/admin/get', {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setMovies(data);
          // Initialize feeUpdates with actual fees from database
          const initialFees = {};
          data.forEach(movie => {
            initialFees[movie._id] = movie.fee !== undefined ? movie.fee : 0;
          });
          setFeeUpdates(initialFees);
        }
        setLoading(prev => ({ ...prev, list: false }));
      } catch (error) {
        console.error('Error fetching movies:', error);
        setLoading(prev => ({ ...prev, list: false }));
      }
    };

    if (status === 'authenticated' && session?.user?.isAdmin) {
      fetchMovies();
    }
  }, [status, session]);

  const handleFeeChange = (movieId, value) => {
    setFeeUpdates(prev => ({
      ...prev,
      [movieId]: value === '' ? 0 : parseFloat(value)
    }));
  };

  const handleFeeUpdate = async (movieId) => {
    const newFee = feeUpdates[movieId];
    if (newFee === undefined || newFee === null) return;

    try {
      const response = await fetch(`/api/admin/movies/${movieId}/fee`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fee: newFee }),
      });

      if (response.ok) {
        // Update the local state with the new fee
        setMovies(movies.map(movie => 
          movie._id === movieId ? { ...movie, fee: newFee } : movie
        ));
      }
    } catch (error) {
      console.error('Error updating fee:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return null;
  }

  const statistics = [
    {
      title: 'Total Users',
      value: loading.users ? '...' : userCount.toLocaleString(),
      icon: UsersIcon,
      trend: '+12%',
      trendColor: 'text-green-500',
    },
    {
      title: 'Total Movies',
      value: loading.movies ? '...' : movieCount.toLocaleString(),
      icon: VideoIcon,
      trend: '+5%',
      trendColor: 'text-green-500',
    },
    
  ];
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Mobile menu button */}
      <AdminNavbar/>
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
          <div className="mb-8">
            <h1 className="mt-20 text-3xl font-bold mb-2">Welcome, Admin!</h1>
            <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Here's what's happening with your platform today
            </p>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statistics.map((stat, index) => (
              <div
                key={index}
                className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <stat.icon className={`h-6 w-6 ${isDarkMode ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {stat.trend}
                  </span>
                </div>
                <h3 className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                  {stat.title}
                </h3>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          

          {/* Quick Actions */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
               <h1 className="text-lg font-semibold mb-4">Add New Movie</h1>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                  Upload a new movie to your streaming platform
                </p>
                <Link href="/admin/movies/add"> <button className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}>
                  Add Movie
                </button></Link>
              </div>
              <div className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className="text-lg font-semibold mb-4">Manage Users</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                  View and manage user accounts and subscriptions
                </p>
                <Link href="/admin/users"><button className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}>
                  Manage Users
                </button></Link>
              </div>
            </div>
          </div>

          {/* Movie Fee Management Section */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Movie Fee Management</h2>
              <Link href="/admin/movies/add">
                <button className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} transition-colors`}>
                  Add New Movie
                </button>
              </Link>
            </div>
            
            {loading.list ? (
              <div className="text-center">Loading movies...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} border-b`}>
                      <th className="text-left py-3 px-4">Movie Title</th>
                      <th className="text-left py-3 px-4">Genre</th>
                      <th className="text-left py-3 px-4">Current Fee</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movies.map((movie) => (
                      <tr key={movie._id} className={`${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} border-b`}>
                        <td className="py-3 px-4">{movie.title}</td>
                        <td className="py-3 px-4">{movie.genre}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span>$</span>
                            <input
                              type="number"
                              value={feeUpdates[movie._id] ?? movie.fee ?? 0}
                              onChange={(e) => handleFeeChange(movie._id, e.target.value)}
                              className={`w-20 px-2 py-1 rounded ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'} border border-gray-300`}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleFeeUpdate(movie._id)}
                            disabled={feeUpdates[movie._id] === undefined || feeUpdates[movie._id] === movie.fee}
                            className={`px-3 py-1 rounded ${feeUpdates[movie._id] === undefined || feeUpdates[movie._id] === movie.fee ? 
                              (isDarkMode ? 'bg-gray-600' : 'bg-gray-300') : 
                              (isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600')
                            } text-white`}
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard; 