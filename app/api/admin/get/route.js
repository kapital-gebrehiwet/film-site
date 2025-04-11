import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import Movie from '../../../../models/Movie';
import connectDB from '../../../../lib/mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const movies = await Movie.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .select('title description posterPath backdropPath releaseDate voteAverage genres runtime videoUrl trailerUrl videoQuality videoFormat fee');

    return NextResponse.json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
  }
} 