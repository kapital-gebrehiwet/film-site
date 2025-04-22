import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Payment from '../../../../models/Payment';
import User from '../../../../models/User';
import mongoose from 'mongoose';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tx_ref = searchParams.get('tx_ref');

    if (!tx_ref) {
      return NextResponse.json({ error: 'Transaction reference is required' }, { status: 400 });
    }

    await connectDB();

    // Find the payment record
    const payment = await Payment.findOne({ tx_ref });
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // If payment is already completed, return success
    if (payment.status === 'completed') {
      return NextResponse.json({ 
        success: true, 
        message: 'Payment already verified',
        purchasedMovies: payment.purchasedMovies
      });
    }

    // Update payment status to completed
    payment.status = 'completed';
    await payment.save();

    // Update user's purchased movies
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add new movies to user's purchasedMovies array
    const newMovieIds = payment.purchasedMovies.map(movie => movie.movieId.toString());
    const existingMovieIds = new Set(user.purchasedMovies.map(id => id.toString()));
    
    // Only add movies that aren't already purchased
    const moviesToAdd = newMovieIds.filter(id => !existingMovieIds.has(id));
    user.purchasedMovies = [...user.purchasedMovies, ...moviesToAdd];
    
    await user.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Payment verified successfully',
      purchasedMovies: payment.purchasedMovies
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({ 
      error: 'Failed to verify payment',
      details: error.message
    }, { status: 500 });
  }
} 