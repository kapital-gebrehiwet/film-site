import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import MovieState from '../../../../models/MovieState';
import User from '../../../../models/User';
import Movie from '../../../../models/Movie';
import mongoose from 'mongoose';

export async function GET() {
  try {
    console.log('GET /api/user/movie-states - Starting request');
    
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('GET /api/user/movie-states - No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('GET /api/user/movie-states - Session found, user ID:', session.user.id);

    console.log('GET /api/user/movie-states - Connecting to database');
    await connectDB();
    console.log('GET /api/user/movie-states - Database connected');

    // Get user's purchased movies
    console.log('GET /api/user/movie-states - Finding user by ID:', session.user.id);
    const user = await User.findById(session.user.id);
    if (!user) {
      console.error('GET /api/user/movie-states - User not found with ID:', session.user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    console.log('GET /api/user/movie-states - User found:', user._id);

    // Ensure purchasedMovies is an array
    const purchasedMovies = user.purchasedMovies || [];
    console.log('GET /api/user/movie-states - Purchased movies count:', purchasedMovies.length);
    
    // Convert purchased movies to strings for comparison
    const purchasedMovieIds = purchasedMovies.map(id => id.toString());
    console.log('GET /api/user/movie-states - User purchased movies:', purchasedMovieIds);

    // Get all movies, including purchased ones
    console.log('GET /api/user/movie-states - Finding all movies');
    const allMovies = await Movie.find({
      $or: [
        {}, // Get all movies
        { _id: { $in: purchasedMovies } } // Ensure purchased movies are included
      ]
    }).select('_id');
    
    if (!allMovies || allMovies.length === 0) {
      console.log('GET /api/user/movie-states - No movies found');
      return NextResponse.json({ error: 'No movies found' }, { status: 404 });
    }
    
    const allMovieIds = allMovies.map(m => m._id.toString());
    console.log('GET /api/user/movie-states - All movies count:', allMovieIds.length);
    console.log('GET /api/user/movie-states - All movies:', allMovieIds);

    // Get existing movie states
    console.log('GET /api/user/movie-states - Finding existing movie states');
    const existingStates = await MovieState.find({
      userId: new mongoose.Types.ObjectId(session.user.id)
    });
    console.log('GET /api/user/movie-states - Existing movie states count:', existingStates.length);
    console.log('GET /api/user/movie-states - Existing movie states:', existingStates.map(state => ({
      movieId: state.movieId.toString(),
      isLocked: state.isLocked,
      isBlurred: state.isBlurred
    })));

    // Create states map for all movies
    const statesMap = {};
    
    // First, set states for purchased movies
    for (const purchasedId of purchasedMovieIds) {
      console.log(`GET /api/user/movie-states - Setting state for purchased movie ${purchasedId}`);
      statesMap[purchasedId] = {
        isLocked: false,
        isBlurred: false
      };

      // Update the database state
      await MovieState.findOneAndUpdate(
        { 
          userId: new mongoose.Types.ObjectId(session.user.id),
          movieId: new mongoose.Types.ObjectId(purchasedId)
        },
        {
          isLocked: false,
          isBlurred: false,
          lastUpdated: new Date()
        },
        { upsert: true }
      );
    }
    
    // Then process remaining movies
    for (const movieId of allMovieIds) {
      if (!statesMap[movieId]) { // Skip if already processed (purchased movies)
        console.log(`GET /api/user/movie-states - Processing non-purchased movie ${movieId}`);
        statesMap[movieId] = {
          isLocked: true,
          isBlurred: true
        };

        // Update the database state
        await MovieState.findOneAndUpdate(
          { 
            userId: new mongoose.Types.ObjectId(session.user.id),
            movieId: new mongoose.Types.ObjectId(movieId)
          },
          {
            isLocked: true,
            isBlurred: true,
            lastUpdated: new Date()
          },
          { upsert: true }
        );
      }
    }

    console.log('GET /api/user/movie-states - Final states map:', statesMap);
    
    // Ensure we're returning a valid response
    if (Object.keys(statesMap).length === 0) {
      console.log('GET /api/user/movie-states - No states to return');
      return NextResponse.json({ error: 'No movie states found' }, { status: 404 });
    }
    
    return NextResponse.json(statesMap);
  } catch (error) {
    console.error('GET /api/user/movie-states - Error fetching movie states:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch movie states',
      details: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { movieId, isLocked, isBlurred } = await request.json();
    console.log('Updating movie state:', {
      movieId,
      isLocked,
      isBlurred,
      userId: session.user.id
    });

    // Check if movie is in user's purchased movies
    const user = await User.findById(session.user.id);
    const isPurchased = user.purchasedMovies.includes(movieId);
    console.log('Is movie purchased:', isPurchased);

    await connectDB();

    // Update movie state based on purchase status
    const movieState = await MovieState.findOneAndUpdate(
      { 
        userId: new mongoose.Types.ObjectId(session.user.id),
        movieId: new mongoose.Types.ObjectId(movieId)
      },
      {
        isLocked: !isPurchased,
        isBlurred: !isPurchased,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );
    console.log('Updated movie state:', movieState);

    return NextResponse.json(movieState);
  } catch (error) {
    console.error('Error updating movie state:', error);
    return NextResponse.json({ error: 'Failed to update movie state' }, { status: 500 });
  }
} 