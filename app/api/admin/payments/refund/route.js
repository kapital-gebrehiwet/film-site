import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import Payment from '../../../../../models/Payment';
import User from '../../../../../models/User';

export async function POST(request) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentId, reason } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the payment
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Check if payment is already refunded
    if (payment.status === 'refunded') {
      return NextResponse.json(
        { error: 'Payment is already refunded' },
        { status: 400 }
      );
    }

    // Check if payment was successful
    if (payment.status !== 'success') {
      return NextResponse.json(
        { error: 'Only successful payments can be refunded' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await User.findOne({ email: payment.userEmail });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update payment status
    payment.status = 'refunded';
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    payment.refundedBy = session.user.email;
    await payment.save();

    // If this was a subscription payment, update user's subscription
    if (payment.type === 'subscription') {
      user.subscription = {
        ...user.subscription,
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: 'Refunded by admin'
      };
      await user.save();
    }

    // If this was a movie purchase, remove movie from user's purchased movies
    if (payment.type === 'movie' && payment.movieId) {
      user.purchasedMovies = user.purchasedMovies.filter(
        movie => movie.movieId.toString() !== payment.movieId.toString()
      );
      await user.save();
    }

    return NextResponse.json({
      message: 'Payment refunded successfully',
      payment
    });
  } catch (error) {
    console.error('Error in POST /api/admin/payments/refund:', error);
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    );
  }
} 