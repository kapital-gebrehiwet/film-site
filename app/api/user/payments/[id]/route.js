import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../app/api/auth/[...nextauth]/route';
import Payment from '../../../../../models/Payment';
import connectDB from '../../../../../lib/mongodb';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const payment = await Payment.findOne({ 
      userId: session.user.id,
      movieId: params.id,
      status: 'completed'
    });

    return NextResponse.json({ hasPaid: !!payment });
  } catch (error) {
    console.error('Error in GET /api/user/payments/[id]:', error);
    return NextResponse.json({ error: 'Failed to check payment status' }, { status: 500 });
  }
} 