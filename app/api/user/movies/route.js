import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Movie from '../../../../models/Movie';

export async function GET() {
  try {
    console.log('GET /api/user/movies - Starting request');
    
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('GET /api/user/movies - No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('GET /api/user/movies - Session found, user ID:', session.user.id);

    console.log('GET /api/user/movies - Connecting to database');
    await connectDB();
    console.log('GET /api/user/movies - Database connected');

    console.log('GET /api/user/movies - Finding all movies');
    const movies = await Movie.find({}).select('-__v');
    
    if (!movies || movies.length === 0) {
      console.log('GET /api/user/movies - No movies found');
      return NextResponse.json({ error: 'No movies found' }, { status: 404 });
    }
    
    console.log(`GET /api/user/movies - Found ${movies.length} movies`);
    return NextResponse.json(movies);
  } catch (error) {
    console.error('GET /api/user/movies - Error fetching movies:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch movies',
      details: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 