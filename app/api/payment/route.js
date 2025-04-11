import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../app/api/auth/[...nextauth]/route';
import connectDB from '../../../lib/mongodb';
import Payment from '../../../models/Payment';
import MovieState from '../../../models/MovieState';

const CHAPA_API_URL = 'https://api.chapa.co/v1/transaction/initialize';
const CHAPA_API_KEY = process.env.CHAPA_API_KEY;

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { movieId, amount } = await request.json();
    if (!movieId || !amount) {
      return NextResponse.json({ error: 'Movie ID and amount are required' }, { status: 400 });
    }

    await connectDB();

    // Create initial movie state if it doesn't exist
    await MovieState.findOneAndUpdate(
      {
        userId: session.user.id,
        movieId: movieId
      },
      {
        isLocked: true,
        isBlurred: true,
        lastUpdated: new Date()
      },
      { upsert: true }
    );

    // Create payment record
    const payment = await Payment.create({
      userId: session.user.id,
      movieId,
      amount,
      status: 'pending',
      tx_ref: `movie-${movieId}-${Date.now()}`,
    });

    console.log('Created payment record:', payment);

    // Prepare payment request
    const paymentRequest = {
      amount: amount.toString(),
      currency: 'ETB',
      tx_ref: payment.tx_ref,
      callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/callback`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/user/get?payment=success&movieId=${payment.movieId}`,
      customer: {
        email: session.user.email,
        name: session.user.name,
      },
      customizations: {
        title: 'Movie Purchase',
        description: `Payment for movie ${movieId}`,
      },
    };

    console.log('Payment request:', paymentRequest);

    // Initialize payment with Chapa
    const response = await fetch(CHAPA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHAPA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentRequest),
    });

    if (!response.ok) {
      throw new Error('Failed to initialize payment');
    }

    const data = await response.json();
    console.log('Chapa response:', data);

    if (!data.data || !data.data.checkout_url) {
      throw new Error('Invalid response from payment provider');
    }

    return NextResponse.json({
      paymentUrl: data.data.checkout_url,
      tx_ref: payment.tx_ref,
      movieId: movieId,
      state: {
        isLocked: true,
        isBlurred: true
      }
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 