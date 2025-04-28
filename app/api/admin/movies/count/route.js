import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import Movie from '../../../../../models/Movie';
import connectDB from '../../../../../lib/mongodb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const movieCount = await Movie.countDocuments({ status: 'active' });

    return NextResponse.json({ count: movieCount });
  } catch (error) {
    console.error('Error counting movies:', error);
    return NextResponse.json({ error: 'Failed to count movies' }, { status: 500 });
  }
} 