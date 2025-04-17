import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const type = searchParams.get('type'); // 'movie' or 'subscription'

    await connectDB();

    // Build query
    const query = {};
    if (userId) query._id = userId;
    if (status) query['subscription.status'] = status;

    // Get users with their payments and subscriptions
    const users = await User.find(query)
      .select('name email subscription moviePayments createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await User.countDocuments(query);

    // Process payments and subscriptions
    const processedUsers = users.map(user => {
      // Convert moviePayments Map to array
      const payments = [];
      if (user.moviePayments) {
        for (const [tx_ref, payment] of Object.entries(user.moviePayments)) {
          if (!type || (type === 'movie' && !payment.type) || (type === 'subscription' && payment.type === 'subscription')) {
            payments.push({
              tx_ref,
              ...payment,
              user: {
                id: user._id,
                name: user.name,
                email: user.email
              }
            });
          }
        }
      }

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        subscription: user.subscription,
        payments: payments.sort((a, b) => b.paymentDate - a.paymentDate),
        createdAt: user.createdAt
      };
    });

    return NextResponse.json({
      users: processedUsers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch payments',
      details: error.message
    }, { status: 500 });
  }
} 