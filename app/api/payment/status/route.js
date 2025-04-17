import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Payment from '../../../../models/Payment';
import User from '../../../../models/User';
import { verifyPayment } from '../../../../lib/chapa';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const movieId = searchParams.get('movieId');
    const tx_ref = searchParams.get('tx_ref');

    if (!movieId || !tx_ref) {
      return NextResponse.json({ error: 'Movie ID and transaction reference are required' }, { status: 400 });
    }

    await connectDB();

    // Find payment record
    const payment = await Payment.findOne({ 
      userId: session.user.id,
      movieId,
      tx_ref
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // If payment is already completed, return success
    if (payment.status === 'completed') {
      return NextResponse.json({ status: 'success' });
    }

    // If payment is failed, return failed
    if (payment.status === 'failed') {
      return NextResponse.json({ status: 'failed' });
    }

    // Verify payment with Chapa
    try {
      const verificationData = await verifyPayment(tx_ref);
      
      if (verificationData.status === 'success') {
        // Update payment status
        payment.status = 'completed';
        payment.verified = true;
        payment.verificationData = verificationData;
        await payment.save();

        // Update user's purchased movies
        const user = await User.findById(session.user.id);
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

        return NextResponse.json({ status: 'success' });
      } else {
        payment.status = 'failed';
        await payment.save();
        return NextResponse.json({ status: 'failed' });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      return NextResponse.json({ status: 'pending' });
    }
  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json({ 
      error: 'Failed to check payment status',
      details: error.message
    }, { status: 500 });
  }
} 