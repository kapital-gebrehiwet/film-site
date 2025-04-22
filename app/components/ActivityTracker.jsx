'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ActivityTracker() {
  const { data: session } = useSession();
  
  useEffect(() => {
    if (!session) return;
    
    // Function to update activity
    const updateActivity = async () => {
      try {
        await fetch('/api/auth/activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Error updating activity:', error);
      }
    };
    
    // Update activity every 5 minutes
    const interval = setInterval(updateActivity, 5 * 60 * 1000);
    
    // Update activity on user interaction
    const handleUserActivity = () => {
      updateActivity();
    };
    
    // Add event listeners for user activity
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    
    // Initial activity update
    updateActivity();
    
    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [session]);
  
  return null; // This component doesn't render anything
} 