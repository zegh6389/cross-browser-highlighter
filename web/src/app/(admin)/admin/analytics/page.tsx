import { createClient } from '@/lib/supabase/server';
import { asUsageStatsArray, asSubscriptionArray } from '@/lib/db-types';

export default async function AdminAnalyticsPage() {
  const supabase = createClient();

  // Fetch all stats in parallel
  const [
    { count: totalUsers },
    { count: totalHighlights },
    { count: activeSubscriptions },
    { count: totalAdmins },
    { data: usageDataRaw },
    { data: subscriptionDataRaw },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('highlights').select('*', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    supabase.from('usage_tracking').select('synced_word_count, synced_highlights_count'),
    supabase.from('subscriptions').select('stripe_price_id, status'),
  ]);

  const usageData = asUsageStatsArray(usageDataRaw);
  const subscriptionData = asSubscriptionArray(subscriptionDataRaw);

  // Calculate totals
  const totalSyncedWords = usageData.reduce((sum, u) => sum + (u.synced_word_count || 0), 0);
  const totalSyncedHighlights = usageData.reduce((sum, u) => sum + (u.synced_highlights_count || 0), 0);

  // Calculate subscription breakdown
  const monthlySubscriptions = subscriptionData.filter(s => 
    s.status === 'active' && s.stripe_price_id?.includes('monthly')
  ).length;
  const yearlySubscriptions = subscriptionData.filter(s => 
    s.status === 'active' && s.stripe_price_id?.includes('yearly')
  ).length;

  // Calculate user types
  const freeUsers = (totalUsers || 0) - (activeSubscriptions || 0);
  const proUsers = activeSubscriptions || 0;
  const customerUsers = (totalUsers || 0) - (totalAdmins || 0);

  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const [
    { count: recentSignups },
    { count: recentHighlights },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
    supabase.from('highlights').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
  ]);

  // Conversion rate
  const conversionRate = totalUsers && totalUsers > 0 
    ? ((proUsers / totalUsers) * 100).toFixed(1) 
    : '0.0';

  // Calculate estimated MRR
  const estimatedMRR = (monthlySubscriptions * 9.99) + (yearlySubscriptions * (99.99 / 12));

  const overviewStats = [
    { label: 'Total Users', value: totalUsers || 0, icon: '👥', subtext: `+${recentSignups || 0} this week` },
    { label: 'Active Subscriptions', value: activeSubscriptions || 0, icon: '💎', subtext: `${conversionRate}% conversion` },
    { label: 'Total Highlights', value: totalHighlights || 0, icon: '✨', subtext: `+${recentHighlights || 0} this week` },
    { label: 'Est. MRR', value: `$${estimatedMRR.toFixed(0)}`, icon: '💰', subtext: 'Monthly recurring' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-600 mt-1">Platform metrics and insights</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1">{stat.subtext}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* User Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">User Breakdown</h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">Free Users</span>
                <span className="font-medium text-slate-900">{freeUsers}</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-400 rounded-full transition-all" 
                  style={{ width: `${totalUsers ? (freeUsers / totalUsers) * 100 : 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">Pro Users</span>
                <span className="font-medium text-slate-900">{proUsers}</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-400 rounded-full transition-all" 
                  style={{ width: `${totalUsers ? (proUsers / totalUsers) * 100 : 0}%` }}
                />
              </div>
            </div>

            <hr className="border-slate-200" />
            
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">Customers</span>
                <span className="font-medium text-slate-900">{customerUsers}</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-400 rounded-full transition-all" 
                  style={{ width: `${totalUsers ? (customerUsers / totalUsers) * 100 : 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">Admins</span>
                <span className="font-medium text-slate-900">{totalAdmins}</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-400 rounded-full transition-all" 
                  style={{ width: `${totalUsers ? ((totalAdmins || 0) / totalUsers) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Subscription Plans</h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">Monthly ($9.99/mo)</span>
                <span className="font-medium text-slate-900">{monthlySubscriptions}</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 rounded-full transition-all" 
                  style={{ width: `${activeSubscriptions ? (monthlySubscriptions / activeSubscriptions) * 100 : 0}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">Yearly ($99.99/yr)</span>
                <span className="font-medium text-slate-900">{yearlySubscriptions}</span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all" 
                  style={{ width: `${activeSubscriptions ? (yearlySubscriptions / activeSubscriptions) * 100 : 0}%` }}
                />
              </div>
            </div>

            <hr className="border-slate-200" />

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Monthly Revenue</p>
                <p className="text-xl font-bold text-slate-900">${(monthlySubscriptions * 9.99).toFixed(0)}</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Annual Revenue</p>
                <p className="text-xl font-bold text-slate-900">${(yearlySubscriptions * 99.99).toFixed(0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Platform Usage</h2>
        
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-slate-600">Total Words Synced</p>
            <p className="text-2xl font-bold text-slate-900">{totalSyncedWords.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-slate-600">Total Highlights Synced</p>
            <p className="text-2xl font-bold text-slate-900">{totalSyncedHighlights.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-slate-600">Avg Words per User</p>
            <p className="text-2xl font-bold text-slate-900">
              {totalUsers ? Math.round(totalSyncedWords / totalUsers).toLocaleString() : 0}
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-slate-600">Avg Highlights per User</p>
            <p className="text-2xl font-bold text-slate-900">
              {totalUsers ? Math.round(totalSyncedHighlights / totalUsers).toLocaleString() : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Conversion Metrics</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-slate-900">{totalUsers || 0}</p>
            <p className="text-sm text-slate-600 mt-1">Total Signups</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-green-600">{activeSubscriptions || 0}</p>
            <p className="text-sm text-slate-600 mt-1">Converted to Pro</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-yellow-600">{conversionRate}%</p>
            <p className="text-sm text-slate-600 mt-1">Conversion Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}
