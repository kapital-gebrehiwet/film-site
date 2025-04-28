"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format, isValid } from "date-fns";
import { Input } from "../../../components/ui/input";

const MAIN_ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    isAdmin: false,
    isBlocked: false
  });
  const [isMobile, setIsMobile] = useState(false);

  // Helper to check if current user is the main admin
  const isMainAdmin = session?.user?.email?.toLowerCase() === MAIN_ADMIN_EMAIL;

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.isAdmin) {
      fetchUsers();
    }
  }, [status, session]);

  useEffect(() => {
    const filtered = users.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }

      const createdUser = await response.json();
      setUsers(prev => [createdUser, ...prev]);
      setShowCreateForm(false);
      setNewUser({ name: '', email: '', isAdmin: false, isBlocked: false });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUser),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
      }

      const updatedUser = await response.json();
      setUsers(prev => prev.map(user => 
        user._id === updatedUser._id ? updatedUser : user
      ));
      setEditingUser(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBlockUser = async (userId, isBlocked) => {
    try {
      // Find the user in the current state
      const userToUpdate = users.find(user => user._id === userId);
      if (!userToUpdate) {
        throw new Error("User not found");
      }

      // Create updated user object
      const updatedUserData = {
        ...userToUpdate,
        isBlocked: isBlocked
      };

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedUserData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user status");
      }

      const updatedUser = await response.json();
      setUsers(prev => prev.map(user => 
        user._id === userId ? updatedUser : user
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }

      setUsers(prev => prev.filter(user => user._id !== userId));
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return isValid(date) ? format(date, "MMM d, yyyy") : "Invalid date";
  };

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
    <div className="min-h-screen bg-gray-100 py-4 md:py-8">
      <div className="container mx-auto px-2 md:px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-8 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">User Management</h1>
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-auto">
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-slate-600 text-black pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full md:w-auto bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add User
            </button>
          </div>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50   flex items-center justify-center p-4 z-50">
            <div className="bg-black rounded-lg p-4 md:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-bold mb-4">Create New User</h2>
              <form onSubmit={handleCreateUser} className=' text-white'>
                <div className="mb-4 ">
                  <label className="block text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newUser.isAdmin}
                      onChange={(e) => setNewUser(prev => ({ ...prev, isAdmin: e.target.checked }))}
                      className="mr-2"
                    />
                    <span>Is Admin</span>
                  </label>
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newUser.isBlocked}
                      onChange={(e) => setNewUser(prev => ({ ...prev, isBlocked: e.target.checked }))}
                      className="mr-2"
                    />
                    <span>Is Blocked</span>
                  </label>
                </div>
                <div className="flex flex-col md:flex-row justify-end gap-2 md:gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="w-full md:w-auto px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full md:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Form */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-black text-white rounded-lg p-4 md:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-bold mb-4">Edit User</h2>
              <form onSubmit={handleUpdateUser}>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg bg-gray-800 text-white"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg bg-gray-800 text-white"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingUser.isAdmin}
                      onChange={(e) => setEditingUser(prev => ({ ...prev, isAdmin: e.target.checked }))}
                      className="mr-2"
                    />
                    <span>Is Admin</span>
                  </label>
                </div>
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingUser.isBlocked}
                      onChange={(e) => setEditingUser(prev => ({ ...prev, isBlocked: e.target.checked }))}
                      className="mr-2"
                    />
                    <span>Is Blocked</span>
                  </label>
                </div>
                <div className="flex flex-col md:flex-row justify-end gap-2 md:gap-4">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="w-full md:w-auto px-4 py-2 text-gray-300 hover:text-white border border-gray-600 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-full md:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Update User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users List - Desktop View */}
        {!isMobile && (
          <div className="bg-white rounded-lg shadow overflow-hidden hidden md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {user.image ? (
                          <Image
                            src={user.image}
                            alt={user.name}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xl font-medium text-gray-600">
                              {user.name[0]}
                            </span>
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isAdmin
                          ? (user.email.toLowerCase() === MAIN_ADMIN_EMAIL ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800')
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.isAdmin
                          ? (user.email.toLowerCase() === MAIN_ADMIN_EMAIL ? 'Superadmin' : 'Admin')
                          : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {user.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isMainAdmin && (
                        <>
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleBlockUser(user._id, !user.isBlocked)}
                            className={`${
                              user.isBlocked
                                ? "text-green-600 hover:text-green-900"
                                : "text-red-600 hover:text-red-900"
                            } mr-4`}
                          >
                            {user.isBlocked ? "Unblock" : "Block"}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Users List - Mobile View */}
        {isMobile && (
          <div className="bg-white rounded-lg shadow overflow-hidden md:hidden">
            <div className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <div key={user._id} className="p-4">
                  <div className="flex items-center mb-2">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xl font-medium text-gray-600">
                          {user.name[0]}
                        </span>
                      </div>
                    )}
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.isAdmin
                        ? (user.email.toLowerCase() === MAIN_ADMIN_EMAIL ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800')
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.isAdmin
                        ? (user.email.toLowerCase() === MAIN_ADMIN_EMAIL ? 'Superadmin' : 'Admin')
                        : 'User'}
                    </span>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {user.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      Joined: {formatDate(user.createdAt)}
                    </span>
                  </div>
                  {isMainAdmin && (
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="px-3 py-1 text-xs text-indigo-600 hover:text-indigo-900 border border-indigo-300 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleBlockUser(user._id, !user.isBlocked)}
                        className={`px-3 py-1 text-xs border rounded ${
                          user.isBlocked
                            ? "text-green-600 hover:text-green-900 border-green-300"
                            : "text-red-600 hover:text-red-900 border-red-300"
                        }`}
                      >
                        {user.isBlocked ? "Unblock" : "Block"}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        className="px-3 py-1 text-xs text-red-600 hover:text-red-900 border border-red-300 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
} 