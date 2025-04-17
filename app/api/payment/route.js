import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import Movie from '../../../models/Movie';
import mongoose from 'mongoose';

export async function POST(request) {
  try {
    console.log('POST /api/payment - Starting request');
    
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('POST /api/payment - No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('POST /api/payment - Session found, user ID:', session.user.id);
    
    const { movieId, amount } = await request.json();
    
    if (!movieId || amount === undefined) {
      console.log('POST /api/payment - Missing required fields');
      return NextResponse.json({ error: 'Movie ID and amount are required' }, { status: 400 });
    }
    
    console.log(`POST /api/payment - Processing payment for movie ${movieId} with amount ${amount}`);
    
    // Connect to database
    console.log('POST /api/payment - Connecting to database');
    await connectDB();
    console.log('POST /api/payment - Database connected');
    
    // Find user
    console.log('POST /api/payment - Finding user by ID:', session.user.id);
    const user = await User.findById(session.user.id);
    if (!user) {
      console.error('POST /api/payment - User not found with ID:', session.user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.log('POST /api/payment - User found:', user._id);
    
    // Find movie
    console.log('POST /api/payment - Finding movie by ID:', movieId);
    const movie = await Movie.findById(movieId);
    if (!movie) {
      console.error('POST /api/payment - Movie not found with ID:', movieId);
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }
    console.log('POST /api/payment - Movie found:', movie._id);
    
    // Check if user already purchased this movie
    const alreadyPurchased = user.purchasedMovies.some(id => id.toString() === movieId);
    if (alreadyPurchased) {
      console.log('POST /api/payment - User already purchased this movie');
      return NextResponse.json({ error: 'You already purchased this movie' }, { status: 400 });
    }
    
    // Create a payment record
    const paymentId = new mongoose.Types.ObjectId();
    const payment = {
      _id: paymentId,
      movieId: new mongoose.Types.ObjectId(movieId),
      amount,
      status: 'pending',
      createdAt: new Date()
    };
    
    // Add payment to user's moviePayments array
    user.moviePayments.push(payment);
    await user.save();
    
    console.log('POST /api/payment - Payment record created:', paymentId);
    
    // In a real application, you would integrate with a payment gateway here
    // For this example, we'll simulate a payment URL
    const paymentUrl = `/payment/checkout?paymentId=${paymentId}&movieId=${movieId}&amount=${amount}`;
    
    console.log('POST /api/payment - Redirecting to payment URL:', paymentUrl);
    
    return NextResponse.json({ paymentUrl });
  } catch (error) {
    console.error('POST /api/payment - Error processing payment:', error);
    return NextResponse.json({ 
      error: 'Failed to process payment',
      details: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 