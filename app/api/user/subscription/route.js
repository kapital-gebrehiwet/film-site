import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { subscriptionPlans } from '../../../../lib/subscriptionPlans';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.user.id).select('subscription').lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user.subscription || {
      plan: 'free',
      status: 'inactive',
      startDate: null,
      endDate: null,
      autoRenew: false
    });
  } catch (error) {
    console.error('Error in GET /api/user/subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, autoRenew = true } = await request.json();

    if (!planId || !subscriptionPlans[planId]) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 });
    }

    const plan = subscriptionPlans[planId];
    await connectDB();

    // Create payment session
    const paymentSession = {
      amount: plan.price,
      currency: 'USD',
      planId,
      userId: session.user.id,
      email: session.user.email,
      tx_ref: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Store payment intent in user document
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.pendingSubscription = {
      planId,
      paymentIntent: paymentSession.tx_ref,
      autoRenew,
      timestamp: new Date()
    };
    await user.save();

    // Initialize payment with your payment provider (e.g., Chapa)
    const response = await fetch(process.env.PAYMENT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAYMENT_SECRET_KEY}`
      },
      body: JSON.stringify(paymentSession)
    });

    if (!response.ok) {
      throw new Error('Failed to initialize payment');
    }

    const paymentData = await response.json();
    return NextResponse.json({
      checkoutUrl: paymentData.checkout_url,
      tx_ref: paymentSession.tx_ref
    });
  } catch (error) {
    console.error('Error in POST /api/user/subscription:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { autoRenew } = await request.json();
    if (typeof autoRenew !== 'boolean') {
      return NextResponse.json({ error: 'Invalid auto-renew value' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.subscription || user.subscription.status !== 'active') {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    user.subscription.autoRenew = autoRenew;
    await user.save();

    return NextResponse.json(user.subscription);
  } catch (error) {
    console.error('Error in PUT /api/user/subscription:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
} 