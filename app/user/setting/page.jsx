'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../../context/ThemeContext';
import { UserIcon, BellIcon, CameraIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    image: '',
    notifications: {
      email: true,
      push: true,
      marketing: false,
      newMovies: true,
      movieNotifications: []
    }
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    const fetchProfileData = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (!response.ok) throw new Error('Failed to fetch profile data');
        const data = await response.json();
        setProfile(data);
        
        // Mark all notifications as read when viewed
        if (data.notifications?.movieNotifications?.some(notification => !notification.isRead)) {
          const updatedNotifications = data.notifications.movieNotifications.map(notification => ({
            ...notification,
            isRead: true
          }));

          await fetch('/api/user/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              notifications: {
                ...data.notifications,
                movieNotifications: updatedNotifications
              }
            }),
          });

          setProfile(prev => ({
            ...prev,
            notifications: {
              ...prev.notifications,
              movieNotifications: updatedNotifications
            }
          }));
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchProfileData();
    }
  }, [session, status, router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNotificationChange = (type) => {
    setProfile(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [type]: !prev.notifications[type]
      }
    }));
  };

  const handleMarkAsRead = async (movieId) => {
    try {
      const updatedNotifications = profile.notifications.movieNotifications.map(notification => 
        notification.movieId === movieId ? { ...notification, isRead: true } : notification
      );

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notifications: {
            ...profile.notifications,
            movieNotifications: updatedNotifications
          }
        }),
      });

      if (response.ok) {
        setProfile(prev => ({
          ...prev,
          notifications: {
            ...prev.notifications,
            movieNotifications: updatedNotifications
          }
        }));
        toast.success('Notification marked as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({
          ...prev,
          imagePreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', profile.name);
      formData.append('email', profile.email);
      
      // Create a notifications object that preserves lastPurchase
      const notificationsToUpdate = {
        ...profile.notifications,
        lastPurchase: profile.notifications.lastPurchase || null
      };
      
      // Properly stringify the notifications object
      formData.append('notifications', JSON.stringify(notificationsToUpdate));
      
      if (fileInputRef.current?.files?.[0]) {
        formData.append('image', fileInputRef.current.files[0]);
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update local state with the response data
        setProfile(prev => ({
          ...prev,
          name: data.profile.name,
          email: data.profile.email,
          image: data.profile.image,
          notifications: data.profile.notifications
        }));

        toast.success('Profile updated successfully! 🎉', {
          duration: 4000,
          position: 'top-center',
          style: {
            background: isDarkMode ? '#1F2937' : '#fff',
            color: isDarkMode ? '#fff' : '#000',
            border: '1px solid',
            borderColor: isDarkMode ? '#374151' : '#E5E7EB',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
          icon: '✨',
        });

        // Force a revalidation of the page data
        router.refresh();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update settings', {
          duration: 4000,
          position: 'top-center',
          style: {
            background: isDarkMode ? '#1F2937' : '#fff',
            color: isDarkMode ? '#fff' : '#000',
            border: '1px solid',
            borderColor: isDarkMode ? '#374151' : '#E5E7EB',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Error updating settings', {
        duration: 4000,
        position: 'top-center',
        style: {
          background: isDarkMode ? '#1F2937' : '#fff',
          color: isDarkMode ? '#fff' : '#000',
          border: '1px solid',
          borderColor: isDarkMode ? '#374151' : '#E5E7EB',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
      });
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon }
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} py-8`}>
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64">
            <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg p-4`}>
              <nav className="space-y-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? isDarkMode
                          ? 'bg-primary text-white'
                          : 'bg-primary text-white'
                        : isDarkMode
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg p-6`}>
              <form onSubmit={handleSubmit}>
                {/* Profile Section */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold mb-6">Profile Information</h2>
                    
                    {/* Profile Picture */}
                    <div className="flex flex-col items-center mb-6">
                      <div className="relative">
                        {profile.image || profile.imagePreview ? (
                          <Image
                            src={profile.imagePreview || profile.image}
                            alt="Profile"
                            width={120}
                            height={120}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-30 h-30 rounded-full flex items-center justify-center ${
                            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                          }`}>
                            <UserIcon className="w-16 h-16" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={handleImageClick}
                          className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full hover:bg-primary/90 transition-colors"
                        >
                          <CameraIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <p className="text-sm text-gray-500 mt-2">Click to change profile picture</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Full Name</label>
                        <input
                          type="text"
                          name="name"
                          value={profile.name}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={profile.email}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-2 rounded-lg border ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Section */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold mb-6">Notification Preferences</h2>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">New Movie Notifications</h3>
                          <p className="text-sm text-gray-500">Get notified when new movies are added</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profile.notifications.newMovies}
                            onChange={() => handleNotificationChange('newMovies')}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer ${
                            profile.notifications.newMovies
                              ? 'bg-primary'
                              : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                          }`}></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Email Notifications</h3>
                          <p className="text-sm text-gray-500">Receive updates via email</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profile.notifications.email}
                            onChange={() => handleNotificationChange('email')}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer ${
                            profile.notifications.email
                              ? 'bg-primary'
                              : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                          }`}></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Push Notifications</h3>
                          <p className="text-sm text-gray-500">Receive push notifications</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profile.notifications.push}
                            onChange={() => handleNotificationChange('push')}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer ${
                            profile.notifications.push
                              ? 'bg-primary'
                              : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                          }`}></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">Marketing Emails</h3>
                          <p className="text-sm text-gray-500">Receive marketing and promotional emails</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={profile.notifications.marketing}
                            onChange={() => handleNotificationChange('marketing')}
                            className="sr-only peer"
                          />
                          <div className={`w-11 h-6 rounded-full peer ${
                            profile.notifications.marketing
                              ? 'bg-primary'
                              : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                          }`}></div>
                        </label>
                      </div>
                    </div>

                    {/* Movie Notifications List */}
                    <div className="mt-8">
                      <h3 className="text-xl font-semibold mb-4">Recent Movie Notifications</h3>
                      <div className="space-y-4">
                        {profile.notifications.movieNotifications?.length > 0 ? (
                          profile.notifications.movieNotifications.map((notification) => (
                            <div
                              key={notification.movieId}
                              className={`p-4 rounded-lg ${
                                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                              } ${!notification.isRead ? 'border-l-4 border-primary' : ''}`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium">{notification.title}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-sm text-gray-500">
                                      Added on {new Date(notification.addedAt).toLocaleDateString()}
                                    </p>
                                    <span className="text-sm font-medium text-primary">
                                      {notification.fee === 0 ? 'Free' : `$${notification.fee}`}
                                    </span>
                                  </div>
                                </div>
                                {!notification.isRead && (
                                  <button
                                    onClick={() => handleMarkAsRead(notification.movieId)}
                                    className="text-sm text-primary hover:text-primary/80"
                                  >
                                    Mark as read
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-center py-4">No movie notifications yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex justify-end">
                  <button
                    type="submit"
                    className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}