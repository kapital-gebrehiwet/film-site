import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';

export default function SubscriptionPlans({ plans, currentPlan, onSubscribe, isLoading }) {
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleSubscribe = (planId) => {
    setSelectedPlan(planId);
    onSubscribe(planId);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={`rounded-lg p-6 ${
            currentPlan?.id === plan.id
              ? 'bg-primary text-white'
              : 'bg-white dark:bg-gray-800'
          } shadow-lg`}
        >
          <h3 className="text-xl font-bold mb-4">{plan.name}</h3>
          <div className="mb-4">
            <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
            <span className="text-sm">/month</span>
          </div>
          <ul className="space-y-2 mb-6">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
          <button
            onClick={() => handleSubscribe(plan.id)}
            disabled={isLoading || currentPlan?.id === plan.id}
            className={`w-full py-2 px-4 rounded-md ${
              currentPlan?.id === plan.id
                ? 'bg-white text-primary'
                : 'bg-primary text-white'
            } hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading && selectedPlan === plan.id
              ? 'Processing...'
              : currentPlan?.id === plan.id
              ? 'Current Plan'
              : 'Subscribe'}
          </button>
        </div>
      ))}
    </div>
  );
} 