'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatCurrency } from '../../../lib/utils';
import { useTheme } from '../../../context/ThemeContext';

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { isDarkMode } = useTheme();
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    const fetchSubscriptionData = async () => {
      try {
        console.log('Fetching subscription data...');
        const response = await fetch('/api/subscription');
        console.log('Subscription API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Subscription API error:', errorText);
          throw new Error('Failed to fetch subscription data');
        }
        
        const data = await response.json();
        console.log('Subscription data received:', data);
        
        if (!data.plans || !Array.isArray(data.plans) || data.plans.length === 0) {
          console.error('No plans data received or empty plans array');
          setError('No subscription plans available');
          return;
        }
        
        setPlans(data.plans);
        setCurrentSubscription(data.currentSubscription);
      } catch (err) {
        console.error('Error fetching subscription data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchSubscriptionData();
    }
  }, [session, status, router]);

  // Check for pending payment
  useEffect(() => {
    const checkPendingPayment = async () => {
      const tx_ref = searchParams.get('tx_ref');
      if (!tx_ref) return;

      try {
        const response = await fetch(`/api/subscription/status?tx_ref=${tx_ref}`);
        if (!response.ok) throw new Error('Failed to check payment status');
        
        const data = await response.json();
        if (data.status === 'success') {
          // Refresh subscription data
          const subResponse = await fetch('/api/subscription');
          if (!subResponse.ok) throw new Error('Failed to fetch subscription data');
          const subData = await subResponse.json();
          setCurrentSubscription(subData.currentSubscription);
          
          // Show success message
          alert('Subscription activated successfully!');
        } else if (data.status === 'failed') {
          alert('Payment failed. Please try again.');
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
      }
    };

    if (session) {
      checkPendingPayment();
    }
  }, [session, searchParams]);

  const handleSubscribe = async (planName) => {
    try {
      setProcessingPayment(true);
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate subscription');
      }

      const data = await response.json();
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="text-red-500 text-center">
          <p className="text-xl font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Debug information
  console.log('Rendering subscription page with:', {
    plansCount: plans.length,
    hasCurrentSubscription: !!currentSubscription,
    isDarkMode,
    session: !!session
  });

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} py-12`}>
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Choose Your Plan</h1>
        
        {currentSubscription && currentSubscription.status === 'active' && (
          <div className={`${isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'} border border-green-400 px-4 py-3 rounded mb-8`}>
            <p className="font-bold">Current Plan: {currentSubscription.plan}</p>
            <p>Valid until: {new Date(currentSubscription.endDate).toLocaleDateString()}</p>
          </div>
        )}

        {plans.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lg">No subscription plans available at the moment.</p>
            <p className="text-sm mt-2">Please check back later or contact support.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden ${
                  currentSubscription?.plan === plan.name ? 'border-2 border-primary' : ''
                }`}
              >
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-4">{plan.name}</h2>
                  <p className="text-3xl font-bold mb-6 text-primary">{formatCurrency(plan.price)}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <svg
                          className="h-5 w-5 text-primary mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleSubscribe(plan.name)}
                    disabled={processingPayment || currentSubscription?.plan === plan.name}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                      currentSubscription?.plan === plan.name
                        ? isDarkMode 
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-primary hover:bg-primary/90 text-white'
                    }`}
                  >
                    {currentSubscription?.plan === plan.name
                      ? 'Current Plan'
                      : processingPayment
                      ? 'Processing...'
                      : 'Subscribe Now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 