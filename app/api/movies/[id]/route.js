import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Movie from '../../../../models/Movie';
import User from '../../../../models/User';

export async function GET(request, { params }) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
    }

    // Connect to database
    await connectDB();

    // Find the movie
    const movie = await Movie.findById(id).lean();
    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    // Get user's payment status for this movie
    const user = await User.findById(session.user.id)
      .select('purchasedMovies subscription')
      .lean();

    const hasPurchased = user.purchasedMovies?.includes(movie._id);
    const isFreeWithSubscription = user.subscription?.status === 'active' && 
      (user.subscription.plan === 'premium' || user.subscription.plan === 'vip');

    // Convert _id to string and add access information
    const movieWithAccess = {
      ...movie,
      _id: movie._id.toString(),
      hasAccess: hasPurchased || isFreeWithSubscription || movie.fee === 0,
      accessType: hasPurchased ? 'purchased' : 
                 isFreeWithSubscription ? 'subscription' :
                 movie.fee === 0 ? 'free' : 'locked'
    };

    return NextResponse.json(movieWithAccess);
  } catch (error) {
    console.error('Error in GET /api/movies/[id]:', error);
    return NextResponse.json({ error: 'Failed to fetch movie details' }, { status: 500 });
  }
}