import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import Movie from '../../../../../models/Movie';
import connectDB from '../../../../../lib/mongodb';

// GET a single movie
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const movie = await Movie.findById(params.id)
      .select('+videoUrl +trailerUrl +videoQuality +videoFormat');

    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    return NextResponse.json(movie);
  } catch (error) {
    console.error('Error in GET /api/admin/movies/[id]:', error);
    return NextResponse.json({ error: 'Failed to fetch movie' }, { status: 500 });
  }
}

// DELETE a movie
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const movie = await Movie.findByIdAndDelete(params.id);

    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Movie deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/admin/movies/[id]:', error);
    return NextResponse.json({ error: 'Failed to delete movie' }, { status: 500 });
  }
}

// PUT - Update a movie
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const movieData = await request.json();
    await connectDB();

    // Validate video data if provided
    if (movieData.videoUrl && !movieData.videoUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid video URL' }, { status: 400 });
    }
    if (movieData.trailerUrl && !movieData.trailerUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid trailer URL' }, { status: 400 });
    }

    const movie = await Movie.findByIdAndUpdate(
      params.id,
      { $set: movieData },
      { new: true, runValidators: true }
    ).select('+videoUrl +trailerUrl +videoQuality +videoFormat');

    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    return NextResponse.json(movie);
  } catch (error) {
    console.error('Error in PUT /api/admin/movies/[id]:', error);
    return NextResponse.json({ error: 'Failed to update movie' }, { status: 500 });
  }
} 