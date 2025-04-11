import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../app/api/auth/[...nextauth]/route';
import User from '../../../../models/User';
import Payment from '../../../../models/Payment';
import connectDB from '../../../../lib/mongodb';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    const { searchParams } = new URL(request.url);
    const tx_ref = searchParams.get('tx_ref');
    const status = searchParams.get('status');

    if (!tx_ref) {
      return NextResponse.redirect(new URL('/payment/failed', request.url));
    }

    await connectDB();

    // Find the payment record
    const payment = await Payment.findOne({ tx_ref });
    if (!payment) {
      return NextResponse.redirect(new URL('/payment/failed', request.url));
    }

    // For Chapa, status can be 'success' or 'failed'
    const paymentStatus = status === 'success' ? 'completed' : 'failed';

    // Update payment status
    await Payment.findByIdAndUpdate(
      payment._id,
      { status: paymentStatus }
    );

    if (paymentStatus === 'completed') {
      // Update user's purchased movies using Mongoose
      await User.findOneAndUpdate(
        { email: session.user.email },
        { 
          $addToSet: { purchasedMovies: payment.movieId },
          $set: { [`moviePayments.${payment.movieId}`]: true }
        }
      );

      // Redirect to user/get with success parameters
      return NextResponse.redirect(
        new URL(`/user/get?payment=success&movieId=${payment.movieId}`, request.url)
      );
    }

    // If payment failed
    return NextResponse.redirect(new URL('/payment/failed', request.url));
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.redirect(new URL('/payment/failed', request.url));
  }
} 