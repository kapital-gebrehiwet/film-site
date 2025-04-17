import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Payment from '../../../../models/Payment';
import User from '../../../../models/User';
import { verifyPayment } from '../../../../lib/chapa';

export async function POST(req) {
  try {
    await connectDB();
    const { tx_ref } = await req.json();

    if (!tx_ref) {
      return NextResponse.json({ error: 'Transaction reference is required' }, { status: 400 });
    }

    console.log('Verifying payment for transaction:', tx_ref);

    // Verify payment with Chapa
    const verificationData = await verifyPayment(tx_ref);
    console.log('Payment verification response:', verificationData);

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { tx_ref },
      {
        status: verificationData.status === 'success' ? 'completed' : 'failed',
        verified: true,
        verificationData,
      },
      { new: true }
    );

    if (!payment) {
      throw new Error('Payment record not found');
    }

    console.log('Updated payment record:', payment);

    if (verificationData.status === 'success') {
      console.log('Payment successful, updating user and movie state');
      
      // Update user's purchased movies
      const user = await User.findById(payment.userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Add movie to purchased movies if not already there
      if (!user.purchasedMovies.includes(payment.movieId)) {
        user.purchasedMovies.push(payment.movieId);
      }
      
      // Update movie payment status
      user.moviePayments.set(payment.movieId.toString(), {
        status: 'completed',
        paymentDate: new Date(),
        tx_ref: payment.tx_ref
      });
      
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