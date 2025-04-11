import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  VideoIcon,
  UsersIcon,
  CreditCardIcon,
  LogOutIcon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Sidebar = () => {
  const { data: session } = useTheme();
  const { isDarkMode } = useTheme();

  return (
    <div className={`flex h-screen border border-white w-64 flex-col justify-between border-r ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-slate-400 text-gray-800'}`}>
      <div className="px-4 py-6">
        <div className="mb-8">
          <span className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>User Panel</span>
        </div>

        <nav className="space-y-1">
          <Link
            href="/user/get"
            className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium ${isDarkMode ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <VideoIcon className="h-5 w-5" />
            <span>Watch movie</span>
          </Link>

          <Link
            href="/admin/users"
            className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium ${isDarkMode ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <UsersIcon className="h-5 w-5" />
            <span>setting</span>
          </Link>

          <Link
            href="/admin/payments"
            className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium ${isDarkMode ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <CreditCardIcon className="h-5 w-5" />
            <span>subscription</span>
          </Link>
        </nav>
      </div>

      <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} p-4`}>
        {/* User Info */}
        <div className="flex items-center gap-3 mb-20">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || 'User'}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-600'}`}>
              <span className="text-lg font-medium text-white">
                {session?.user?.name?.[0] || session?.user?.email?.[0] || 'U'}
              </span>
            </div>
          )}

          <div className="flex-1">
            <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {session?.user?.name || 'User'}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {session?.user?.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
