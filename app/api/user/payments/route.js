import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Payment from '../../../../models/Payment';
import User from '../../../../models/User';
import Movie from '../../../../models/Movie';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    try {
      await connectDB();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: dbError.message 
      }, { status: 500 });
    }

    // Find user and their payments
    try {
      const user = await User.findById(session.user.id)
        .select('moviePayments')
        .lean();

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Handle case where moviePayments is undefined
      if (!user.moviePayments) {
        return NextResponse.json([]);
      }

      // Get all movie IDs from payments
      const movieIds = Object.keys(user.moviePayments);
      
      // Fetch all movies in one query
      const movies = await Movie.find({ _id: { $in: movieIds } })
        .select('_id fee title')
        .lean();
      
      // Create a map of movie details for quick lookup
      const movieMap = movies.reduce((acc, movie) => {
        acc[movie._id.toString()] = movie;
        return acc;
      }, {});

      // Convert moviePayments object to array and add movieId and movie details
      const payments = Object.entries(user.moviePayments).map(([movieId, payment]) => {
        const movie = movieMap[movieId];
        return {
          ...payment,
          movieId,
          tx_ref: payment.tx_ref || 'N/A',
          amount: payment.amount || movie?.fee || 0,
          status: payment.status || 'unknown',
          paymentDate: payment.paymentDate || null,
          movieTitle: movie?.title || 'Unknown Movie'
        };
      });

      // Sort payments by date, most recent first
      payments.sort((a, b) => {
        if (!a.paymentDate) return 1;
        if (!b.paymentDate) return -1;
        return new Date(b.paymentDate) - new Date(a.paymentDate);
      });

      return NextResponse.json(payments);
    } catch (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json({ 
        error: 'Failed to fetch user data',
        details: userError.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in GET /api/user/payments:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
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