'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '../../../components/sidebarAdmin';
import AdminNavbar from '../../../components/AdminNavbar';
import { useTheme } from '../../../context/ThemeContext';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  Download,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Input } from '../../../components/ui/input'

// Helper for ISO week comparison
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return [d.getFullYear(), weekNo];
}

function isSameWeek(date1, date2) {
  const [y1, w1] = getISOWeek(date1);
  const [y2, w2] = getISOWeek(date2);
  return y1 === y2 && w1 === w2;
}

function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

function isSameMonth(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
}

function isSameYear(date1, date2) {
  return date1.getFullYear() === date2.getFullYear();
}

const AdminPaymentsPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDarkMode } = useTheme();
  const { data: session, status } = useSession();
  const router = useRouter();

  // State for payments data
  const [payments, setPayments] = useState([]);
  const [statistics, setStatistics] = useState({
    totalRevenue: 0,
    totalUsers: 0,
    totalPurchases: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const paymentsPerPage = 10;

  // Search and filter state
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchPaymentsData = async () => {
      if (status !== 'authenticated') return;

      try {
        setLoading(true);
        setError(null);

        const queryParams = new URLSearchParams({
          page: currentPage,
          limit: paymentsPerPage,
          search: searchQuery,
          dateFilter
        });

        const response = await fetch(`/api/admin/payments/stats?${queryParams}`);

        if (!response.ok) {
          throw new Error('Failed to fetch payments data');
        }

        const data = await response.json();
        setPayments(data.payments);
        setStatistics(data.stats);
        setTotalPages(data.pagination.pages);
      } catch (err) {
        console.error('Error fetching payments data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentsData();
  }, [status, currentPage, searchQuery]);

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/admin/payments/export');
      if (!response.ok) throw new Error('Failed to export data');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting data:', err);
      setError(err.message);
    }
  };

  const formatCurrency = (amount) => {
    return `ETB ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Filter payments by date
  const filterPaymentsByDate = (payments) => {
    if (dateFilter === 'all') return payments;
    const now = new Date();
    return payments.map(user => ({
      ...user,
      purchases: user.purchases.filter(purchase => {
        const purchaseDate = new Date(purchase.purchaseDate);
        if (dateFilter === 'today') return isSameDay(purchaseDate, now);
        if (dateFilter === 'week') return isSameWeek(purchaseDate, now);
        if (dateFilter === 'month') return isSameMonth(purchaseDate, now);
        if (dateFilter === 'year') return isSameYear(purchaseDate, now);
        return true;
      })
    })).filter(user => user.purchases.length > 0);
  };

  // Filter payments by search
  const filterPaymentsBySearch = (payments) => {
    if (!searchQuery) return payments;
    return payments.filter(user =>
      user.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Compose filters
  const filteredPayments = filterPaymentsBySearch(filterPaymentsByDate(payments));

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <AdminNavbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <AdminNavbar onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out z-40`}>
        <AdminSidebar />
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
          {/* Header */}
          <div className="mb-8 mt-20">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Payment Management</h1>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-5 w-5" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(statistics.totalRevenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Users</p>
                  <p className="text-2xl font-bold">{statistics.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Purchases</p>
                  <p className="text-2xl font-bold">{statistics.totalPurchases}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <form onSubmit={e => { e.preventDefault(); setSearchQuery(searchInput); }}>
                  <Input
                    type="text"
                    placeholder="Search by user email..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-gray-800 text-white placeholder-gray-400' 
                        : 'bg-white text-gray-900 placeholder-gray-500'
                    } border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </form>
              </div>
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode 
                  ? 'bg-gray-800 text-white border-gray-700' 
                  : 'bg-white text-gray-900 border-gray-300'
              } border`}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>

          {/* Payments Table for md+ screens */}
          <div className={`rounded-xl overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Movie</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Purchase Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">User Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayments.map((user) => (
                    user.purchases.map((purchase, index) => (
                      <tr key={`${user.user.email}-${purchase.movieId}-${index}`} 
                          className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
                        {index === 0 && (
                          <td className="px-6 py-4" rowSpan={user.purchases.length}>
                            <div className="flex items-center">
                              {user.user.image && (
                                <img
                                  src={user.user.image}
                                  alt={user.user.name}
                                  className="h-10 w-10 rounded-full mr-3"
                                />
                              )}
                              <div>
                                <div className="font-medium">{user.user.name}</div>
                                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {user.user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {purchase.poster && (
                              <img
                                src={purchase.poster}
                                alt={purchase.title}
                                className="h-8 w-8 rounded mr-2 object-cover"
                              />
                            )}
                            <span className="font-medium">{purchase.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium">{formatCurrency(purchase.price)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatDate(purchase.purchaseDate)}
                          </span>
                        </td>
                        {index === 0 && (
                          <td className="px-6 py-4" rowSpan={user.purchases.length}>
                            <span className="font-medium text-green-600">
                              {formatCurrency(user.totalSpent)}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card/List Layout */}
            <div className="md:hidden space-y-4">
              {filteredPayments.map((user) => (
                <div key={user.user.email} className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
                  <div className="flex items-center mb-2">
                    {user.user.image && (
                      <img
                        src={user.user.image}
                        alt={user.user.name}
                        className="h-10 w-10 rounded-full mr-3"
                      />
                    )}
                    <div>
                      <div className="font-medium">{user.user.name}</div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user.user.email}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {user.purchases.map((purchase, idx) => (
                      <div key={purchase.movieId + idx} className="flex items-center justify-between border-t pt-2">
                        <div className="flex items-center">
                          {purchase.poster && (
                            <img
                              src={purchase.poster}
                              alt={purchase.title}
                              className="h-8 w-8 rounded mr-2 object-cover"
                            />
                          )}
                          <span className="font-medium">{purchase.title}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(purchase.price)}</div>
                          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatDate(purchase.purchaseDate)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-green-600 font-semibold">Total: {formatCurrency(user.totalSpent)}</div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Showing {((currentPage - 1) * paymentsPerPage) + 1} to {Math.min(currentPage * paymentsPerPage, payments.length)} of {payments.length} users
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  } ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-lg ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  } ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPaymentsPage; 