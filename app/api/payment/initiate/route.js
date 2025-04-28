import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { NextResponse } from 'next/server';
import { initializePayment } from '../../../../lib/chapa';
import connectDB from '../../../../lib/mongodb';
import Payment from '../../../../models/Payment';
import User from '../../../../models/User';
import Movie from '../../../../models/Movie';
import mongoose from 'mongoose';

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

    console.log('Found movie:', {
      id: movie._id.toString(),
      title: movie.title,
      fee: movie.fee
    });

    // Generate a unique transaction reference
    const tx_ref = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('Creating payment with:', {
      userId: user._id.toString(),
      movieId: movie._id.toString(),
      amount: movie.fee,
      tx_ref
    });

    // Create payment record
    const payment = new Payment({
      userId: new mongoose.Types.ObjectId(user._id),
      userEmail: user.email,
      amount: movie.fee,
      status: 'pending',
      tx_ref,
      paymentDate: new Date(),
      type: 'movie',
      purchasedMovies: [{
        movieId: new mongoose.Types.ObjectId(movie._id),
        title: movie.title,
        poster: movie.poster,
        price: movie.fee,
        purchaseDate: new Date()
      }]
    });

    try {
      const savedPayment = await payment.save();
      console.log('Payment record created successfully:', {
        id: savedPayment._id.toString(),
        userId: savedPayment.userId.toString(),
        purchasedMovies: savedPayment.purchasedMovies.map(m => ({
          movieId: m.movieId.toString(),
          title: m.title,
          poster: m.poster,
          price: m.price,
          purchaseDate: m.purchaseDate
        })),
        tx_ref: savedPayment.tx_ref,
        status: savedPayment.status
      });

      // Initialize Chapa payment
      const chapaResponse = await initializePayment({
        amount: movie.fee,
        email,
        first_name: user.name?.split(' ')[0] || 'User',
        last_name: user.name?.split(' ').slice(1).join(' ') || '',
        tx_ref,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/user/get/free?tx_ref=${tx_ref}`
      });

      console.log('Chapa response:', chapaResponse);

      if (!chapaResponse || !chapaResponse.checkout_url) {
        throw new Error('Invalid response from payment provider');
      }

      return NextResponse.json({
        checkoutUrl: chapaResponse.checkout_url,
        tx_ref: chapaResponse.tx_ref
      });
    } catch (error) {
      console.error('Error in payment creation or initialization:', error);
      // If payment was created but Chapa failed, delete the payment record
      if (payment._id) {
        await Payment.findByIdAndDelete(payment._id);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error initiating payment:', error);
    return NextResponse.json({ 
      error: 'Failed to initiate payment',
      details: error.message
    }, { status: 500 });
  }
} 