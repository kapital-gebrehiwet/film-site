import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '../../../../../lib/mongodb';
import Payment from '../../../../../models/Payment';
import User from '../../../../../models/User';
import Movie from '../../../../../models/Movie';

export async function GET(req) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

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
      status: 'completed'
    }).lean();

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
            }

            // Get the price from the movie's fee property
            let price = 0;
            
            // First try to get the fee from the movie object
            if (movie.fee) {
              price = parseFloat(movie.fee);
            } 
            // Then try to get price from payment
            else if (payment) {
              if (payment.amount) {
                price = parseFloat(payment.amount);
              } else if (payment.purchasedMovies) {
                // Try to find the specific movie in purchasedMovies
                const moviePurchase = payment.purchasedMovies.find(pm => 
                  pm && pm.movieId && pm.movieId.toString() === movieId.toString()
                );
                
                if (moviePurchase && moviePurchase.price) {
                  price = parseFloat(moviePurchase.price);
                }
              }
            }
            
            // If still no price, use movie's default price
            if (!price && movie.price) {
              price = parseFloat(movie.price);
            }

            return {
              movieId: movie._id,
              title: movie.title,
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
        
        userPurchases[userEmail].subscriptionDetails = {
          plan: subscriptionPlan,
          cost: subscriptionCost,
          startDate: user.subscription.startDate,
          endDate: user.subscription.endDate,
          tx_ref: subscriptionPayment?.tx_ref
        };
        
        userPurchases[userEmail].totalSpent += userPurchases[userEmail].subscriptionDetails.cost;
      }

      // Add to total revenue
      totalRevenue += userPurchases[userEmail].totalSpent;
    }

    // Convert to array and sort by total spent
    const userPurchasesArray = Object.values(userPurchases)
      .sort((a, b) => b.totalSpent - a.totalSpent);

    // Create CSV content
    let csvContent = "User Name,User Email,Movie Title,Price,Purchase Date,Transaction Reference,User Total\n";
    
    // Add each user's purchases to the CSV
    userPurchasesArray.forEach(user => {
      // Add movie purchases
      user.purchases.forEach(purchase => {
        const purchaseDate = new Date(purchase.purchaseDate).toLocaleDateString('en-US');
        csvContent += `"${user.user.name}","${user.user.email}","${purchase.title}",${purchase.price},"${purchaseDate}","${purchase.tx_ref || 'N/A'}",${user.totalSpent}\n`;
      });
      
      // Add subscription if active
      if (user.subscriptionDetails) {
        const startDate = new Date(user.subscriptionDetails.startDate).toLocaleDateString('en-US');
        csvContent += `"${user.user.name}","${user.user.email}","Subscription (${user.subscriptionDetails.plan})",${user.subscriptionDetails.cost},"${startDate}","${user.subscriptionDetails.tx_ref || 'N/A'}",${user.totalSpent}\n`;
      }
    });
    
    // Add summary statistics
    csvContent += "\nSummary Statistics\n";
    csvContent += `Total Revenue,${totalRevenue}\n`;
    csvContent += `Total Users,${userPurchasesArray.length}\n`;
    csvContent += `Total Purchases,${userPurchasesArray.reduce((total, user) => total + user.purchases.length, 0)}\n`;
    csvContent += `Active Subscribers,${userPurchasesArray.filter(user => user.subscriptionDetails).length}\n`;

    // Return CSV as a downloadable file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payments-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error in GET /api/admin/payments/export:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}