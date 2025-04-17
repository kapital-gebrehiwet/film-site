'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { formatCurrency } from '../../../lib/utils';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('processing');
  const [paymentDetails, setPaymentDetails] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    const processPayment = async () => {
      try {
        const paymentId = searchParams.get('paymentId');
        const movieId = searchParams.get('movieId');
        const amount = searchParams.get('amount');

        if (!paymentId || !movieId || !amount) {
          throw new Error('Missing payment information');
        }

        setPaymentDetails({
          paymentId,
          movieId,
          amount: parseFloat(amount)
        });

        // Simulate payment processing
        setPaymentStatus('processing');
        
        // In a real application, you would check the payment status with your payment provider
        // For this example, we'll simulate a successful payment after a delay
        setTimeout(async () => {
          try {
            // Update payment status in the database
            const response = await fetch('/api/payment/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId, movieId, amount: parseFloat(amount) }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to complete payment');
            }

            setPaymentStatus('success');
            
            // Redirect back to movies page after a delay
            setTimeout(() => {
              router.push('/user/get/free');
            }, 3000);
          } catch (err) {
            console.error('Error completing payment:', err);
            setPaymentStatus('failed');
            setError(err.message);
          }
        }, 3000); // Simulate 3-second payment processing
      } catch (err) {
        console.error('Error processing payment:', err);
        setPaymentStatus('failed');
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      processPayment();
    }
  }, [session, status, router, searchParams]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-red-500 text-center mb-6">
            <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-center mb-4">Payment Failed</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/user/get/free')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200"
            >
              Return to Movies
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        {paymentStatus === 'processing' && (
          <>
            <div className="text-blue-500 text-center mb-6">
              <svg className="h-16 w-16 mx-auto animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-center mb-4">Processing Payment</h2>
            <p className="text-gray-600 text-center mb-6">Please wait while we process your payment...</p>
          </>
        )}

        {paymentStatus === 'success' && (
          <>
            <div className="text-green-500 text-center mb-6">
              <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-center mb-4">Payment Successful!</h2>
            <p className="text-gray-600 text-center mb-6">
              Your payment of {paymentDetails && formatCurrency(paymentDetails.amount)} has been processed successfully.
            </p>
            <p className="text-gray-600 text-center mb-6">
              You will be redirected to the movies page in a few seconds...
            </p>
          </>
        )}

        {paymentStatus === 'failed' && (
          <>
            <div className="text-red-500 text-center mb-6">
              <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-center mb-4">Payment Failed</h2>
            <p className="text-gray-600 text-center mb-6">There was an error processing your payment. Please try again.</p>
            <div className="flex justify-center">
              <button
                onClick={() => router.push('/user/get/free')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-200"
              >
                Return to Movies
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 