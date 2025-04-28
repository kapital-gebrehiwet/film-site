import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Payment from '../../../../models/Payment';
import User from '../../../../models/User';
import { verifyPayment } from '../../../../lib/chapa';
import mongoose from 'mongoose';

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

    // Find user first to get the correct ID
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('Looking for payment record with:', {
      userId: user._id.toString(),
      movieId,
      tx_ref
    });

    // Find payment record
    const payment = await Payment.findOne({ 
      userId: new mongoose.Types.ObjectId(user._id),
      movieId: new mongoose.Types.ObjectId(movieId),
      tx_ref
    });

    if (!payment) {
      console.log('Payment record not found, returning pending status');
      return NextResponse.json({ status: 'pending' });
    }

    console.log('Found payment record:', {
      id: payment._id,
      status: payment.status,
      userId: payment.userId.toString(),
      movieId: payment.movieId.toString(),
      tx_ref: payment.tx_ref
    });

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