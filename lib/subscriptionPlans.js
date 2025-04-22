export const subscriptionPlans = {
  free: {
    name: 'Free Plan',
    price: 0,
    features: [
      'Access to free movies',
      'Standard quality streaming',
      'Limited content library',
      'Ad-supported viewing'
    ],
    limitations: [
      'No premium content',
      'No offline downloads',
      'Limited to 720p quality'
    ]
  },
  basic: {
    name: 'Basic Plan',
    price: 9.99,
    features: [
      'Ad-free viewing',
      'HD quality streaming',
      'Access to premium movies',
      'Download up to 5 movies',
      'Watch on any device'
    ],
    duration: 30, // days
    autoRenewable: true
  },
  premium: {
    name: 'Premium Plan',
    price: 19.99,
    features: [
      'Everything in Basic',
      '4K Ultra HD streaming',
      'Download up to 20 movies',
      'Priority customer support',
      'Early access to new releases',
      'Multiple device streaming'
    ],
    duration: 30, // days
    autoRenewable: true
  },
  vip: {
    name: 'VIP Plan',
    price: 29.99,
    features: [
      'Everything in Premium',
      'Exclusive VIP content',
      'Unlimited downloads',
      'Private screening rooms',
      'Member-only events',
      'Personalized recommendations'
    ],
    duration: 30, // days
    autoRenewable: true
  }
}; 