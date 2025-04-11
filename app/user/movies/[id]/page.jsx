'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import VideoPlayer from '../../../../components/VideoPlayer';
import { formatCurrency } from '../../../../lib/utils';
import { use } from 'react';

export default function MovieDetailPage({ params }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [movie, setMovie] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const resolvedParams = use(params);
  const movieId = resolvedParams?.id;

  useEffect(() => {
    const fetchMovieAndPaymentStatus = async () => {
      if (!movieId) return;
      
      try {
        // Fetch movie details
        const movieRes = await fetch(`/api/movies/${movieId}`);
        if (!movieRes.ok) throw new Error('Failed to fetch movie');
        const movieData = await movieRes.json();
        setMovie(movieData);

        // Check payment status
        const paymentRes = await fetch(`/api/user/payments/${movieId}`);
        if (!paymentRes.ok) throw new Error('Failed to check payment status');
        const paymentData = await paymentRes.json();
        setPaymentStatus(paymentData.status);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchMovieAndPaymentStatus();
    }
  }, [movieId, status]);

  const handlePayment = async () => {
    try {
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movieId: movieId,
          amount: movie.price,
          email: session.user.email,
        }),
      });

      if (!response.ok) throw new Error('Failed to initiate payment');
      
      const { checkoutUrl } = await response.json();
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle payment verification
  useEffect(() => {
    const verifyPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const tx_ref = urlParams.get('tx_ref');
      const status = urlParams.get('status');

      if (tx_ref && status) {
        try {
          const response = await fetch(`/api/payment/verify?tx_ref=${tx_ref}&status=${status}`);
          if (!response.ok) throw new Error('Payment verification failed');
          
          // Refresh payment status
          const paymentRes = await fetch(`/api/user/payments/${movieId}`);
          if (!paymentRes.ok) throw new Error('Failed to check payment status');
          const paymentData = await paymentRes.json();
          setPaymentStatus(paymentData.status);
        } catch (err) {
          setError(err.message);
        }
      }
    };

    verifyPayment();
  }, [movieId]);

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!movie) return <div>Movie not found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full rounded-lg shadow-lg"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-4">{movie.title}</h1>
          <p className="text-gray-600 mb-4">{movie.description}</p>
          <div className="mb-4">
            <span className="font-semibold">Price:</span>{' '}
            <span className="text-green-600">{formatCurrency(movie.price)}</span>
          </div>
          
          {paymentStatus === 'completed' ? (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Watch Movie</h2>
              <VideoPlayer url={movie.videoUrl} />
            </div>
          ) : (
            <button
              onClick={handlePayment}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Pay to Watch
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 