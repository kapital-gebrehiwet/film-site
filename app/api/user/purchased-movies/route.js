import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user.purchasedMovies || []);
  } catch (error) {
    console.error('Error fetching purchased movies:', error);
    return NextResponse.json({ error: 'Failed to fetch purchased movies' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { movieId } = await request.json();
    if (!movieId) {
      return new Response(JSON.stringify({ error: 'Movie ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await connectDB();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Convert movieId to string for consistent comparison
    const movieIdStr = movieId.toString();

    // Add movie to purchased movies if not already there
    if (!user.purchasedMovies.includes(movieIdStr)) {
      user.purchasedMovies.push(movieIdStr);
      await user.save();
    }

    return new Response(JSON.stringify({ 
      success: true,
      purchasedMovies: user.purchasedMovies.map(id => id.toString())
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating purchased movies:', error);
    return new Response(JSON.stringify({ error: 'Failed to update purchased movies' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 