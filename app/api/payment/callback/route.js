import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Payment from '../../../../models/Payment';
import User from '../../../../models/User';
import Movie from '../../../../models/Movie';
import { verifyPayment } from '../../../../lib/chapa';

export async function POST(req) {
  try {
    await connectDB();
    const data = await req.json();
    const { tx_ref } = data;

    if (!tx_ref) {
      throw new Error('Transaction reference not provided');
    }

    // Find the payment record
    const payment = await Payment.findOne({ tx_ref });
    if (!payment) {
      throw new Error('Payment record not found');
    }

    console.log('Found payment record:', payment);

    // Verify the payment with Chapa
    const verificationData = await verifyPayment(tx_ref);
    console.log('Payment verification data:', verificationData);

    if (verificationData.status === 'success') {
      console.log('Payment successful, updating user and movie state');
      
      // Update payment status
      payment.status = 'completed';
      payment.verificationData = verificationData;
      await payment.save();

      // Update user's purchased movies and payment history
      const user = await User.findById(payment.userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Add movie to purchased movies if not already there
      if (!user.purchasedMovies.includes(payment.movieId)) {
        user.purchasedMovies.push(payment.movieId);
        
        // Add unlock notification
        const movie = await Movie.findById(payment.movieId);
        if (movie) {
          user.notifications.movieNotifications.push({
            movieId: movie._id,
            title: movie.title,
            fee: movie.fee || 0,
            addedAt: new Date(),
            isRead: false,
            type: 'unlock'
          });
        }

        // Update movie payment status in user's moviePayments
        if (!user.moviePayments) {
          user.moviePayments = new Map();
        }

        user.moviePayments.set(payment.movieId.toString(), {
          status: 'completed',
          paymentDate: new Date(),
          tx_ref: payment.tx_ref,
          amount: payment.amount,
          currency: 'ETB'
        });
      }
      
      await user.save();
      console.log('Updated user purchased movies:', user.purchasedMovies);

      return NextResponse.json({
        success: true,
        movieId: payment.movieId,
        state: {
          isLocked: false,
          isBlurred: false
        }
      });
    }

    // If payment verification failed
    payment.status = 'failed';
    await payment.save();

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