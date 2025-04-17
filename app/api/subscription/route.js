import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import SubscriptionPlan from '../../../models/SubscriptionPlan';
import { initializePayment } from '../../../lib/chapa';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get all active subscription plans
    const plans = await SubscriptionPlan.find({ isActive: true });
    
    // Get user's current subscription
    const user = await User.findById(session.user.id)
      .select('subscription')
      .lean();

    return NextResponse.json({
      plans,
      currentSubscription: user.subscription
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch subscription plans',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planName } = await request.json();
    
    if (!planName) {
      return NextResponse.json({ error: 'Plan name is required' }, { status: 400 });
    }

    await connectDB();

    // Get subscription plan
    const plan = await SubscriptionPlan.findOne({ name: planName, isActive: true });
    if (!plan) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 404 });
    }

    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate a unique transaction reference
    const tx_ref = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize Chapa payment
    const chapaResponse = await initializePayment({
      amount: plan.price,
      email: user.email,
      first_name: user.name?.split(' ')[0] || 'User',
      last_name: user.name?.split(' ').slice(1).join(' ') || '',
      tx_ref,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/subscription/callback`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/user/subscription?tx_ref=${tx_ref}`
    });

    // Create a pending subscription payment record
    user.moviePayments.set(tx_ref, {
      status: 'pending',
      paymentDate: new Date(),
      tx_ref,
      amount: plan.price,
      paymentMethod: 'chapa',
      type: 'subscription',
      planName
    });
    
    await user.save();

    return NextResponse.json({
      checkoutUrl: chapaResponse.data.checkout_url,
      tx_ref
    });
  } catch (error) {
    console.error('Error initiating subscription:', error);
    return NextResponse.json({ 
      error: 'Failed to initiate subscription',
      details: error.message
    }, { status: 500 });
  }
} 