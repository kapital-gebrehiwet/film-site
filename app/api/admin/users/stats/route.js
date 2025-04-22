import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "../../../../../app/api/auth/[...nextauth]/route";
import connectDB from "../../../../../lib/db";
import User from "../../../../../models/User";
import Movie from "../../../../../models/Movie";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";

    // Build query
    const query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };

    // Get total count for pagination
    const total = await User.countDocuments(query);

    // Get users with pagination
    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-password")
      .lean();

    // Get movie details and calculate fees for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        // Get purchased movies with their fees
        const purchasedMovies = await Promise.all(
          (user.purchasedMovies || []).map(async (purchase) => {
            const movie = await Movie.findById(purchase.movieId).select("title posterUrl price").lean();
            return {
              _id: movie._id,
              title: movie.title,
              posterUrl: movie.posterUrl,
              purchaseDate: purchase.purchaseDate,
              price: movie.price || 0
            };
          })
        );

        // Calculate total spent on movies
        const totalSpentOnMovies = purchasedMovies.reduce((total, movie) => total + movie.price, 0);

        // Calculate subscription cost if any
        const subscriptionCost = user.subscription?.plan === "premium" ? 99 : 0;

        // Calculate total spent (movies + subscription)
        const totalSpent = totalSpentOnMovies + subscriptionCost;

        return {
          ...user,
          purchasedMovies,
          totalSpentOnMovies,
          subscriptionCost,
          totalSpent
        };
      })
    );

    return NextResponse.json({
      users: usersWithStats,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error in GET /api/admin/users/stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 