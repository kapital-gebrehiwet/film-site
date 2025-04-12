import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import MovieState from '../../../../models/MovieState';
import User from '../../../../models/User';
import Movie from '../../../../models/Movie';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get user's purchased movies
    const user = await User.findById(session.user.id).select('purchasedMovies');
    if (!user) {
      throw new Error('User not found');
    }

    // Convert purchased movies to strings for comparison
    const purchasedMovieIds = user.purchasedMovies.map(id => id.toString());
    console.log('User purchased movies:', purchasedMovieIds);

    // Get all movies, including purchased ones
    const allMovies = await Movie.find({
      $or: [
        {}, // Get all movies
        { _id: { $in: user.purchasedMovies } } // Ensure purchased movies are included
      ]
    }).select('_id');
    
    const allMovieIds = allMovies.map(m => m._id.toString());
    console.log('All movies:', allMovieIds);

    // Get existing movie states
    const existingStates = await MovieState.find({
      userId: new mongoose.Types.ObjectId(session.user.id)
    });
    console.log('Existing movie states:', existingStates.map(state => ({
      movieId: state.movieId.toString(),
      isLocked: state.isLocked,
      isBlurred: state.isBlurred
    })));

    // Create states map for all movies
    const statesMap = {};
    
    // First, set states for purchased movies
    for (const purchasedId of purchasedMovieIds) {
      console.log(`Setting state for purchased movie ${purchasedId}`);
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
        console.log(`Processing non-purchased movie ${movieId}`);
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

    console.log('Final states map:', statesMap);
    return NextResponse.json(statesMap);
  } catch (error) {
    console.error('Error fetching movie states:', error);
    return NextResponse.json({ error: 'Failed to fetch movie states' }, { status: 500 });
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