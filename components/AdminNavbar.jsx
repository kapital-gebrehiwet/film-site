import React from 'react';
import { signOut } from 'next-auth/react';
import { LogOutIcon, SunIcon, MoonIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Link from 'next/link';

const AdminNavbar = ({ onMenuClick }) => {
    const { isDarkMode, toggleTheme } = useTheme();
    const handleLogout = async () => {
        await signOut({ callbackUrl: '/' });
    };

    return (
        <header className="bg-slate-600 border border-white text-white fixed top-0 left-0 right-0 z-50 dark:bg-gray-900 flex justify-between items-center h-16 px-4 sm:px-6 lg:px-8 overflow-x-auto whitespace-nowrap">
            <div className="flex items-center gap-4 min-w-0">
                {/* Hamburger menu for mobile */}
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-white"
                    aria-label="Open sidebar menu"
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                {/* Admin Home Link */}
                <Link href="/admin" className="text-lg font-semibold hover:text-gray-200 transition-colors truncate">
                    Admin Home
                </Link>
            </div>

            <div className="flex items-center gap-4 min-w-0">
                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Toggle theme"
                >
                    {isDarkMode ? (
                        <SunIcon className="h-5 w-5 text-white" />
                    ) : (
                        <MoonIcon className="h-5 w-5 text-white" />
                    )}
                </button>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                    style={{ minWidth: '100px' }}
                >
                    <LogOutIcon className="h-5 w-5" />
                    <span>Logout</span>
                </button>
            </div>
        </header>
    );
}

export default AdminNavbar;
