'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Subscription {
  id: string;
  status: string;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface Usage {
  synced_word_count: number;
  synced_highlights_count: number;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<'monthly' | 'yearly' | null>(null);
  const [managingBilling, setManagingBilling] = useState(false);

  const WORD_LIMIT = 300;
  const hasActiveSubscription = subscription?.status === 'active';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      setSubscription(subData);

      // Load usage
      const { data: usageData } = await supabase
        .from('usage_tracking')
        .select('synced_word_count, synced_highlights_count')
        .eq('user_id', user.id)
        .single();

      setUsage(usageData || { synced_word_count: 0, synced_highlights_count: 0 });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (priceType: 'monthly' | 'yearly') => {
    setUpgrading(priceType);
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceType }),
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create portal session');
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setManagingBilling(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlanName = () => {
    if (!subscription) return 'Free';
    if (subscription.stripe_price_id?.includes('yearly')) return 'Pro Yearly';
    return 'Pro Monthly';
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-64 rounded-xl" />
        <div className="skeleton h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Subscription</h1>
        <p className="text-slate-600 mt-1">Manage your subscription and billing</p>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Current Plan</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            hasActiveSubscription
              ? 'bg-green-100 text-green-700'
              : 'bg-slate-100 text-slate-700'
          }`}>
            {getPlanName()}
          </span>
        </div>

        {hasActiveSubscription ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600">Status</p>
                <p className="font-medium text-slate-900 capitalize">{subscription.status}</p>
              </div>
              <div>
                <p className="text-slate-600">Current Period Ends</p>
                <p className="font-medium text-slate-900">{formatDate(subscription.current_period_end)}</p>
              </div>
            </div>
            
            {subscription.cancel_at_period_end && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                <p className="text-yellow-800">
                  Your subscription will cancel at the end of the current period. 
                  You'll retain access until {formatDate(subscription.current_period_end)}.
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200">
              <h3 className="font-medium text-slate-900 mb-2">Pro Features</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Unlimited synced highlights
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Cross-device sync
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Priority support
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Advanced search & filters
                </li>
              </ul>
            </div>

            <button
              onClick={handleManageBilling}
              disabled={managingBilling}
              className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {managingBilling ? 'Loading...' : 'Manage Billing'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-600">
              You're on the Free plan with a {WORD_LIMIT} word sync limit.
            </p>
            <div className="pt-4 border-t border-slate-200">
              <h3 className="font-medium text-slate-900 mb-2">Free Plan Features</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Up to {WORD_LIMIT} words synced to cloud
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Unlimited local highlights
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-slate-400">✗</span>
                  <span className="text-slate-400">Cross-device sync (limited)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-slate-400">✗</span>
                  <span className="text-slate-400">Advanced search & filters</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Usage Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Usage</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-slate-600 mb-1">Words Synced</p>
            <p className="text-2xl font-bold text-slate-900">
              {usage?.synced_word_count || 0}
              {!hasActiveSubscription && (
                <span className="text-lg text-slate-500 font-normal"> / {WORD_LIMIT}</span>
              )}
            </p>
            {!hasActiveSubscription && (
              <div className="mt-2 w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    (usage?.synced_word_count || 0) >= WORD_LIMIT 
                      ? 'bg-red-400' 
                      : 'bg-yellow-400'
                  }`}
                  style={{ width: `${Math.min(100, ((usage?.synced_word_count || 0) / WORD_LIMIT) * 100)}%` }}
                />
              </div>
            )}
          </div>
          
          <div>
            <p className="text-sm text-slate-600 mb-1">Highlights Synced</p>
            <p className="text-2xl font-bold text-slate-900">
              {usage?.synced_highlights_count || 0}
            </p>
          </div>
        </div>

        {!hasActiveSubscription && (usage?.synced_word_count || 0) >= WORD_LIMIT && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
            <p className="text-red-800">
              You've reached your free sync limit. Upgrade to Pro for unlimited syncing.
            </p>
          </div>
        )}
      </div>

      {/* Upgrade Options - Only show for free users */}
      {!hasActiveSubscription && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Upgrade to Pro</h2>
          <p className="text-slate-600 mb-6">
            Unlock unlimited highlights and sync across all your devices.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Monthly Plan */}
            <div className="border border-slate-200 rounded-xl p-6 hover:border-yellow-400 transition-colors">
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-bold text-slate-900">$9.99</span>
                <span className="text-slate-600">/month</span>
              </div>
              <p className="text-slate-600 text-sm mb-4">Billed monthly</p>
              <ul className="space-y-2 text-sm text-slate-600 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Unlimited highlights
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Cross-device sync
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Cancel anytime
                </li>
              </ul>
              <button
                onClick={() => handleUpgrade('monthly')}
                disabled={upgrading !== null}
                className="w-full rounded-lg border border-yellow-400 bg-white px-4 py-2 font-medium text-yellow-700 hover:bg-yellow-50 transition-colors disabled:opacity-50"
              >
                {upgrading === 'monthly' ? 'Loading...' : 'Choose Monthly'}
              </button>
            </div>

            {/* Yearly Plan */}
            <div className="border-2 border-yellow-400 rounded-xl p-6 relative">
              <div className="absolute -top-3 left-4 bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-1 rounded">
                SAVE 17%
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-bold text-slate-900">$99.99</span>
                <span className="text-slate-600">/year</span>
              </div>
              <p className="text-slate-600 text-sm mb-4">
                <span className="line-through">$119.88</span> Billed annually
              </p>
              <ul className="space-y-2 text-sm text-slate-600 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Everything in Monthly
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  2 months free
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Priority support
                </li>
              </ul>
              <button
                onClick={() => handleUpgrade('yearly')}
                disabled={upgrading !== null}
                className="w-full rounded-lg bg-yellow-400 px-4 py-2 font-medium text-slate-900 hover:bg-yellow-500 transition-colors disabled:opacity-50"
              >
                {upgrading === 'yearly' ? 'Loading...' : 'Choose Yearly'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
