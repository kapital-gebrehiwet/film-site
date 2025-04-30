import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Movie from '../../../../models/Movie';
import Payment from '../../../../models/Payment';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Find all payments for the user
    const payments = await Payment.find({
      userId: session.user.id,
      status: 'completed'
    }).sort({ paymentDate: -1 }).lean();

    // If no payments found, check user's moviePayments map
    if (!payments || payments.length === 0) {
      const user = await User.findById(session.user.id)
        .select('moviePayments purchasedMovies')
        .lean();

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Convert moviePayments map to array and fetch movie details
      const moviePayments = [];
      
      // Handle both Map and plain object cases
      const paymentEntries = user.moviePayments instanceof Map ? 
        Array.from(user.moviePayments.entries()) : 
        Object.entries(user.moviePayments || {});

      for (const [movieId, payment] of paymentEntries) {
        const movie = await Movie.findById(movieId)
          .select('title fee')
          .lean();

        if (movie) {
          moviePayments.push({
            movieId,
            amount: payment.amount || movie.fee || 0,
            status: payment.status || 'completed',
            paymentDate: payment.paymentDate || new Date(),
            tx_ref: payment.tx_ref || 'LEGACY_PURCHASE',
            movieTitle: movie.title
          });
        }
      }

      // For any purchased movies without payment records, create legacy payment records
      for (const movieId of (user.purchasedMovies || [])) {
        if (!paymentEntries.some(([id]) => id === movieId.toString())) {
          const movie = await Movie.findById(movieId)
            .select('title fee')
            .lean();

          if (movie) {
            moviePayments.push({
              movieId: movieId.toString(),
              amount: movie.fee || 0,
              status: 'completed',
              paymentDate: new Date(), // Use current date as fallback
              tx_ref: `LEGACY_${movieId}`,
              movieTitle: movie.title
            });
          }
        }
      }

      return NextResponse.json(moviePayments);
    }

    // Enhance payments with movie details
    const enhancedPayments = await Promise.all(
      payments.map(async (payment) => {
        let movieDetails = { title: 'Unknown Movie' };
        
        if (payment.purchasedMovies && payment.purchasedMovies.length > 0) {
          const movieId = payment.purchasedMovies[0].movieId;
          const movie = await Movie.findById(movieId).select('title').lean();
          if (movie) {
            movieDetails = movie;
          }
        }

        return {
          movieId: payment.purchasedMovies?.[0]?.movieId || null,
          amount: payment.amount,
          status: payment.status,
          paymentDate: payment.paymentDate || payment.createdAt,
          tx_ref: payment.tx_ref,
          movieTitle: movieDetails.title
        };
      })
    );

    return NextResponse.json(enhancedPayments);

  } catch (error) {
    console.error('Error in GET /api/user/payments:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch payment history',
      details: error.message 
    }, { status: 500 });
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