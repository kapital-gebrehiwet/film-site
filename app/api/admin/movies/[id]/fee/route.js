import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../lib/auth';
import Movie from '../../../../../../models/Movie';
import connectDB from '../../../../../../lib/mongodb';

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { fee } = await request.json();

    if (typeof fee !== 'number' || fee < 0) {
      return NextResponse.json(
        { error: 'Invalid fee amount' },
        { status: 400 }
      );
    }

    await connectDB();
    
    const movie = await Movie.findByIdAndUpdate(
      id,
      { fee },
      { new: true }
    );

    if (!movie) {
      return NextResponse.json(
        { error: 'Movie not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(movie);
  } catch (error) {
    console.error('Error updating movie fee:', error);
    return NextResponse.json(
      { error: 'Failed to update movie fee' },
      { status: 500 }
    );
  }
} 