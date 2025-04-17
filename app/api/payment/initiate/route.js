import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import { initializePayment } from '../../../../lib/chapa';
import connectDB from '../../../../lib/mongodb';
import Payment from '../../../../models/Payment';
import User from '../../../../models/User';
import Movie from '../../../../models/Movie';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { movieId, amount, email } = await request.json();
    
    if (!movieId || !amount || !email) {
      return NextResponse.json({ error: 'Movie ID, amount, and email are required' }, { status: 400 });
    }

    await connectDB();

    // Find user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find movie
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    // Generate a unique transaction reference
    const tx_ref = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record
    const payment = new Payment({
      userId: user._id,
      movieId: movie._id,
      amount,
      status: 'pending',
      tx_ref,
      paymentDate: new Date()
    });
    await payment.save();

    // Initialize Chapa payment
    const chapaResponse = await initializePayment({
      amount,
      email,
      first_name: user.name?.split(' ')[0] || 'User',
      last_name: user.name?.split(' ').slice(1).join(' ') || '',
      tx_ref,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/user/get/free?tx_ref=${tx_ref}`
    });

    return NextResponse.json({
      checkoutUrl: chapaResponse.data.checkout_url,
      tx_ref
    });
  } catch (error) {
    console.error('Error initiating payment:', error);
    return NextResponse.json({ 
      error: 'Failed to initiate payment',
      details: error.message
    }, { status: 500 });
  }
} 