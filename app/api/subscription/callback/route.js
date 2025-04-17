import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import SubscriptionPlan from '../../../../models/SubscriptionPlan';
import { verifyPayment } from '../../../../lib/chapa';

export async function POST(req) {
  try {
    await connectDB();
    const { tx_ref } = await req.json();

    if (!tx_ref) {
      return NextResponse.json({ error: 'Transaction reference is required' }, { status: 400 });
    }

    console.log('Verifying subscription payment for transaction:', tx_ref);

    // Verify payment with Chapa
    const verificationData = await verifyPayment(tx_ref);
    console.log('Payment verification response:', verificationData);

    // Find user with this payment
    const user = await User.findOne({ [`moviePayments.${tx_ref}`]: { $exists: true } });
    if (!user) {
      throw new Error('User not found for this payment');
    }

    const payment = user.moviePayments.get(tx_ref);
    if (!payment) {
      throw new Error('Payment record not found');
    }

    if (verificationData.status === 'success') {
      console.log('Payment successful, updating subscription');
      
      // Get subscription plan
      const plan = await SubscriptionPlan.findOne({ name: payment.planName });
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      // Calculate subscription dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration);

      // Update user's subscription
      user.subscription = {
        plan: plan.name,
        status: 'active',
        startDate,
        endDate,
        autoRenew: false
      };

      // Update payment status
      user.moviePayments.set(tx_ref, {
        ...payment,
        status: 'completed',
        verificationData
      });

      await user.save();
      console.log('Updated user subscription:', user.subscription);

      return NextResponse.json({
        success: true,
        subscription: user.subscription
      });
    }

    // If payment failed
    user.moviePayments.set(tx_ref, {
      ...payment,
      status: 'failed',
      verificationData
    });
    await user.save();

    return NextResponse.json({
      success: false,
      error: 'Payment verification failed'
    });

  } catch (error) {
    console.error('Subscription callback error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
} 