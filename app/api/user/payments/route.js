import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Payment from '../../../../models/Payment';
import User from '../../../../models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const payments = await Payment.find({ userId: session.user.id })
      .sort({ paymentDate: -1 })
      .select('-__v');

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

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

    // Generate a unique transaction reference
    const tx_ref = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create payment record
    const payment = new Payment({
      userId: session.user.id,
      movieId,
      amount,
      status: 'completed',
      tx_ref,
      paymentDate: new Date()
    });
    await payment.save();

    // Update user's purchased movies
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add movie to purchased movies if not already there
    if (!user.purchasedMovies.includes(movieId)) {
      user.purchasedMovies.push(movieId);
      await user.save();
    }

    return NextResponse.json({ 
      success: true,
      paymentId: payment._id,
      movieId
    });
  } catch (error) {
    console.error('Error in POST /api/user/payments:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
} 