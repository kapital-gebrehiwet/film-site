export const subscriptionPlans = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: 9.99,
    features: [
      'Access to standard quality videos',
      'Basic customer support',
      'Ad-supported content'
    ],
    duration: 'monthly'
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    price: 19.99,
    features: [
      'Access to HD quality videos',
      'Priority customer support',
      'Ad-free experience',
      'Download content for offline viewing'
    ],
    duration: 'monthly'
  },
  {
    id: 'family',
    name: 'Family Plan',
    price: 29.99,
    features: [
      'Access to 4K quality videos',
      '24/7 premium support',
      'Ad-free experience',
      'Download content for offline viewing',
      'Up to 5 simultaneous streams'
    ],
    duration: 'monthly'
  }
];

export const getPlanById = (planId) => {
  return subscriptionPlans.find(plan => plan.id === planId);
}; 