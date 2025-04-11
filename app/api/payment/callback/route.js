import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Payment from '../../../../models/Payment';
import User from '../../../../models/User';
import MovieState from '../../../../models/MovieState';

const CHAPA_API_URL = 'https://api.chapa.co/v1/transaction/verify/';
const CHAPA_API_KEY = process.env.CHAPA_SECRET_KEY;

export async function POST(req) {
  try {
    await connectDB();
    const { tx_ref } = await req.json();

    if (!tx_ref) {
      return NextResponse.json({ error: 'Transaction reference is required' }, { status: 400 });
    }

    console.log('Verifying payment for transaction:', tx_ref);

    // Verify payment with Chapa
    const response = await fetch(`${CHAPA_API_URL}${tx_ref}`, {
      headers: {
        Authorization: `Bearer ${CHAPA_API_KEY}`,
      },
    });

    const verificationData = await response.json();
    console.log('Payment verification response:', verificationData);

    if (!response.ok) {
      throw new Error('Payment verification failed');
    }

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { tx_ref },
      {
        status: verificationData.status,
        verified: true,
        verificationData,
      },
      { new: true }
    );

    if (!payment) {
      throw new Error('Payment record not found');
    }

    console.log('Updated payment record:', payment);

    if (payment.status === 'success') {
      console.log('Payment successful, updating user and movie state');
      
      // Update user's purchased movies
      const user = await User.findById(payment.userId);
      if (!user.purchasedMovies.includes(payment.movieId)) {
        user.purchasedMovies.push(payment.movieId);
        await user.save();
        console.log('Updated user purchased movies:', user.purchasedMovies);
      }

      // Update movie state
      const movieState = await MovieState.findOneAndUpdate(
        { userId: payment.userId, movieId: payment.movieId },
        { isLocked: false, isBlurred: false },
        { new: true, upsert: true }
      );
      console.log('Updated movie state:', {
        movieId: payment.movieId,
        isLocked: movieState.isLocked,
        isBlurred: movieState.isBlurred
      });

      return NextResponse.json({
        success: true,
        movieId: payment.movieId,
        state: {
          isLocked: false,
          isBlurred: false
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Payment verification failed'
    });

  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
} 