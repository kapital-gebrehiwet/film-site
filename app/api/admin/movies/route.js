import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import Movie from '../../../../models/Movie';
import User from '../../../../models/User';
import connectDB from '../../../../lib/mongodb';

// GET all movies from database
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('Connected to MongoDB successfully');

    const movies = await Movie.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .select('+videoUrl +trailerUrl +videoQuality +videoFormat'); // Include video fields

    console.log('Found movies:', movies.length);
    return NextResponse.json(movies);
  } catch (error) {
    console.error('Error in GET /api/admin/movies:', error);
    return NextResponse.json({ error: 'Failed to fetch movies' }, { status: 500 });
  }
}

// POST - Add a new movie to database
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const movieData = await request.json();
    console.log('Received movie data:', movieData);

    // Validate video data
    if (movieData.videoUrl && !movieData.videoUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid video URL' }, { status: 400 });
    }
    if (movieData.trailerUrl && !movieData.trailerUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid trailer URL' }, { status: 400 });
    }

    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('Connected to MongoDB successfully');

    // Check if movie already exists
    const existingMovie = await Movie.findOne({ tmdbId: movieData.tmdbId });
    if (existingMovie) {
      console.log('Movie already exists:', existingMovie);
      return NextResponse.json({ error: 'Movie already exists' }, { status: 400 });
    }

    console.log('Creating new movie...');
    const movie = new Movie(movieData);
    await movie.save();
    console.log('Movie saved successfully:', movie);

    // Send notifications to users who have enabled new movie notifications
    const users = await User.find({ 'notifications.newMovies': true });
    for (const user of users) {
      user.notifications.movieNotifications.push({
        movieId: movie._id,
        title: movie.title,
        fee: movie.fee || 0,
        addedAt: new Date(),
        isRead: false,
        type: 'new'
      });
      await user.save();
    }

    return NextResponse.json(movie);
  } catch (error) {
    console.error('Error in POST /api/admin/movies:', error);
    return NextResponse.json({ 
      error: 'Failed to add movie',
      details: error.message 
    }, { status: 500 });
  }
}

// PUT - Update a movie
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ...updateData } = await request.json();
    console.log('Updating movie:', { id, updateData });

    // Validate video data
    if (updateData.videoUrl && !updateData.videoUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid video URL' }, { status: 400 });
    }
    if (updateData.trailerUrl && !updateData.trailerUrl.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid trailer URL' }, { status: 400 });
    }

    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('Connected to MongoDB successfully');

    const movie = await Movie.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).select('+videoUrl +trailerUrl +videoQuality +videoFormat'); // Include video fields

    if (!movie) {
      console.log('Movie not found for update:', id);
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    console.log('Movie updated successfully:', movie);
    return NextResponse.json(movie);
  } catch (error) {
    console.error('Error in PUT /api/admin/movies:', error);
    return NextResponse.json({ error: 'Failed to update movie' }, { status: 500 });
  }
}

// DELETE - Soft delete a movie
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    console.log('Deleting movie:', id);

    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('Connected to MongoDB successfully');

    const movie = await Movie.findByIdAndUpdate(
      id,
      { status: 'inactive', updatedAt: new Date() },
      { new: true }
    );

    if (!movie) {
      console.log('Movie not found for deletion:', id);
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    console.log('Movie deleted successfully:', movie);
    return NextResponse.json({ message: 'Movie deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/admin/movies:', error);
    return NextResponse.json({ error: 'Failed to delete movie' }, { status: 500 });
  }
} 