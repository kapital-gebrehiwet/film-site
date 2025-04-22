import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import Payment from '../../../../../models/Payment';
import User from '../../../../../models/User';
import Movie from '../../../../../models/Movie';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const dateFilter = searchParams.get('dateFilter') || 'all';
    const search = searchParams.get('search') || '';

    // Build date filter
    let dateQuery = {};
    if (dateFilter !== 'all') {
      const now = new Date();
      switch (dateFilter) {
        case 'today':
          dateQuery = {
            createdAt: {
              $gte: new Date(now.setHours(0, 0, 0, 0)),
            },
          };
          break;
        case 'week':
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          dateQuery = { createdAt: { $gte: weekAgo } };
          break;
        case 'month':
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          dateQuery = { createdAt: { $gte: monthAgo } };
          break;
        case 'year':
          const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
          dateQuery = { createdAt: { $gte: yearAgo } };
          break;
      }
    }

    // Get all non-admin users who have made purchases
    const users = await User.find({
      role: { $ne: 'admin' },
      $or: [
        { "purchasedMovies.0": { $exists: true } },
        { "subscription.status": "active" }
      ]
    }).lean();

    // Get all successful payments with detailed information
    const payments = await Payment.find({
      status: 'completed',
      ...dateQuery
    }).lean();

    console.log("Found payments:", payments.length);
    console.log("Sample payment:", payments.length > 0 ? JSON.stringify(payments[0], null, 2) : "No payments");

    // Create a map of payments by user email for quick lookup
    const paymentsByUser = {};
    payments.forEach(payment => {
      if (!payment.userEmail) return;
      
      if (!paymentsByUser[payment.userEmail]) {
        paymentsByUser[payment.userEmail] = [];
      }
      
      paymentsByUser[payment.userEmail].push(payment);
    });

    // Structure the data by user
    const userPurchases = {};
    let totalRevenue = 0;

    // Process each user
    for (const user of users) {
      const userEmail = user.email;
      
      // Initialize user data
      userPurchases[userEmail] = {
        user: {
          name: user.name,
          email: userEmail,
          image: user.image
        },
        purchases: [],
        totalSpent: 0,
        subscriptionDetails: null
      };

      // Get user's purchased movies
      if (user.purchasedMovies && user.purchasedMovies.length > 0) {
        const movieDetails = await Promise.all(
          user.purchasedMovies.map(async (movieId) => {
            // Get the movie with all details including fee
            const movie = await Movie.findById(movieId).lean();
            if (!movie) return null;

            // Find the payment for this movie
            const userPayments = paymentsByUser[userEmail] || [];
            
            // Log for debugging
            console.log(`Looking for payment for movie ${movieId} for user ${userEmail}`);
            console.log(`User has ${userPayments.length} payments`);
            
            // Try different ways to find the payment
            let payment = null;
            
            // Method 1: Check if payment has purchasedMovies array with this movieId
            payment = userPayments.find(p => 
              p.purchasedMovies && 
              Array.isArray(p.purchasedMovies) && 
              p.purchasedMovies.some(pm => 
                pm && pm.movieId && pm.movieId.toString() === movieId.toString()
              )
            );
            
            // Method 2: If no payment found, try to find any payment for this user
            if (!payment && userPayments.length > 0) {
              payment = userPayments[0]; // Use the first payment as fallback
              console.log(`Using fallback payment for movie ${movieId}: ${payment._id}`);
            }

            // Get the price from the movie's fee property
            let price = 0;
            
            // First try to get the fee from the movie object
            if (movie.fee) {
              price = parseFloat(movie.fee);
              console.log(`Using movie fee: ${price}`);
            } 
            // Then try to get price from payment
            else if (payment) {
              if (payment.amount) {
                price = parseFloat(payment.amount);
                console.log(`Using payment amount: ${price}`);
              } else if (payment.purchasedMovies) {
                // Try to find the specific movie in purchasedMovies
                const moviePurchase = payment.purchasedMovies.find(pm => 
                  pm && pm.movieId && pm.movieId.toString() === movieId.toString()
                );
                
                if (moviePurchase && moviePurchase.price) {
                  price = parseFloat(moviePurchase.price);
                  console.log(`Using purchasedMovies price: ${price}`);
                }
              }
            }
            
            // If still no price, use movie's default price
            if (!price && movie.price) {
              price = parseFloat(movie.price);
              console.log(`Using movie price: ${price}`);
            }
            
            console.log(`Final price for movie ${movieId}: ${price}`);

            return {
              movieId: movie._id,
              title: movie.title,
              poster: movie.poster,
              price: price,
              purchaseDate: payment?.createdAt || new Date(),
              tx_ref: payment?.tx_ref
            };
          })
        );

        // Filter out null values and add to user purchases
        const validPurchases = movieDetails.filter(movie => movie !== null);
        userPurchases[userEmail].purchases = validPurchases;
        
        // Calculate total spent on movies
        const totalSpentOnMovies = validPurchases.reduce((total, movie) => total + movie.price, 0);
        userPurchases[userEmail].totalSpent += totalSpentOnMovies;
      }

      // Add subscription details if active
      if (user.subscription?.status === "active") {
        const subscriptionPlan = user.subscription.plan;
        const defaultSubscriptionCost = subscriptionPlan === "premium" ? 19.99 : 
                                      subscriptionPlan === "vip" ? 29.99 : 0;
        
        // Find subscription payment
        const userPayments = paymentsByUser[userEmail] || [];
        let subscriptionPayment = null;
        
        // Try to find a subscription payment
        subscriptionPayment = userPayments.find(p => 
          p.type === "subscription" && p.status === "completed"
        );
        
        // If no specific subscription payment found, use any payment
        if (!subscriptionPayment && userPayments.length > 0) {
          subscriptionPayment = userPayments[0];
        }
        
        // Get the subscription cost
        let subscriptionCost = defaultSubscriptionCost;
        
        if (subscriptionPayment) {
          if (subscriptionPayment.amount) {
            subscriptionCost = parseFloat(subscriptionPayment.amount);
          } else if (subscriptionPayment.subscription && subscriptionPayment.subscription.cost) {
            subscriptionCost = parseFloat(subscriptionPayment.subscription.cost);
          }
        }
        
        console.log(`Subscription cost for user ${userEmail}: ${subscriptionCost}`);
        
        userPurchases[userEmail].subscriptionDetails = {
          plan: subscriptionPlan,
          cost: subscriptionCost,
          startDate: user.subscription.startDate,
          endDate: user.subscription.endDate,
          paymentDate: subscriptionPayment?.createdAt,
          tx_ref: subscriptionPayment?.tx_ref
        };
        
        userPurchases[userEmail].totalSpent += userPurchases[userEmail].subscriptionDetails.cost;
      }

      // Add to total revenue
      totalRevenue += userPurchases[userEmail].totalSpent;
    }

    // Convert to array and sort by total spent
    const userPurchasesArray = Object.values(userPurchases)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice((page - 1) * limit, page * limit);

    // Calculate statistics
    const totalUsers = Object.keys(userPurchases).length;
    const totalPurchases = Object.values(userPurchases)
      .reduce((total, user) => total + user.purchases.length, 0);
    
    // Calculate subscription revenue
    const subscriptionRevenue = Object.values(userPurchases)
      .reduce((total, user) => {
        if (user.subscriptionDetails) {
          return total + user.subscriptionDetails.cost;
        }
        return total;
      }, 0);
    
    // Calculate movie purchase revenue
    const moviePurchaseRevenue = totalRevenue - subscriptionRevenue;

    return NextResponse.json({
      payments: userPurchasesArray,
      stats: {
        totalRevenue,
        moviePurchaseRevenue,
        subscriptionRevenue,
        totalUsers,
        totalPurchases,
        activeSubscribers: Object.values(userPurchases).filter(user => user.subscriptionDetails).length
      },
      pagination: {
        total: totalUsers,
        page,
        limit,
        pages: Math.ceil(totalUsers / limit)
      }
    });

  } catch (error) {
    console.error('Error in payments stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 