import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Payment from '../../../../models/Payment';
import User from '../../../../models/User';
import Movie from '../../../../models/Movie';
import { startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';

export async function GET(request) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const dateFilter = searchParams.get('dateFilter') || 'all';

    // Build query
    const query = {};

    // Add search conditions
    if (search) {
      query.$or = [
        { userEmail: { $regex: search, $options: 'i' } },
        { tx_ref: { $regex: search, $options: 'i' } }
      ];
    }

    // Add date filter
    const now = new Date();
    if (dateFilter !== 'all') {
      let startDate;
      switch (dateFilter) {
        case 'today':
          startDate = startOfDay(now);
          break;
        case 'week':
          startDate = startOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          break;
        case 'year':
          startDate = startOfYear(now);
          break;
      }
      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query)
    ]);

    // Get user details and purchased movies for each payment
    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        const user = await User.findOne({ email: payment.userEmail })
          .select('name email image purchasedMovies subscription')
          .lean();

        if (!user) {
          return {
            ...payment,
            user: null,
            purchasedMovies: []
          };
        }

        // Get movie details for purchased movies
        const movieIds = user.purchasedMovies.map(m => m.movieId);
        const movies = await Movie.find({ _id: { $in: movieIds } })
          .select('title posterUrl price')
          .lean();

        // Calculate total spent on movies
        const totalSpentOnMovies = movies.reduce((total, movie) => {
          const purchase = user.purchasedMovies.find(p => p.movieId.toString() === movie._id.toString());
          return total + (purchase ? purchase.price : 0);
        }, 0);

        return {
          ...payment,
          user: {
            name: user.name,
            email: user.email,
            image: user.image
          },
          purchasedMovies: movies.map(movie => ({
            ...movie,
            purchaseDate: user.purchasedMovies.find(p => p.movieId.toString() === movie._id.toString())?.purchaseDate
          })),
          totalSpentOnMovies,
          subscription: user.subscription
        };
      })
    );

    return NextResponse.json({
      payments: paymentsWithDetails,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in GET /api/admin/payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
} 