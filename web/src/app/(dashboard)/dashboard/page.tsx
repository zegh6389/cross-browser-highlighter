import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatRelativeTime, formatNumber } from '@/lib/utils';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get usage stats
  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Check subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  const hasSubscription = !!subscription;

  // Get recent highlights
  const { data: recentHighlights } = await supabase
    .from('highlights')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get highlight count by color
  const { data: colorStats } = await supabase
    .from('highlights')
    .select('color')
    .eq('user_id', user.id)
    .is('deleted_at', null);

  const colorCounts = {
    yellow: 0,
    green: 0,
    blue: 0,
    pink: 0,
  };

  colorStats?.forEach(h => {
    if (h.color in colorCounts) {
      colorCounts[h.color as keyof typeof colorCounts]++;
    }
  });

  const wordLimit = 300;
  const currentWords = usage?.synced_word_count || 0;
  const usagePercent = Math.min(100, (currentWords / wordLimit) * 100);

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Welcome back! Here's your highlighting activity.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid md:grid-cols-4 gap-6">
        <StatCard
          title="Total Highlights"
          value={formatNumber(usage?.synced_highlights_count || 0)}
          icon="📝"
        />
        <StatCard
          title="Total Words"
          value={formatNumber(currentWords)}
          icon="📊"
          subtitle={hasSubscription ? 'Unlimited' : `${wordLimit - currentWords} remaining`}
        />
        <StatCard
          title="Pages Highlighted"
          value={formatNumber(recentHighlights?.length || 0)}
          icon="🌐"
        />
        <StatCard
          title="Last Active"
          value={usage?.last_sync_at ? formatRelativeTime(usage.last_sync_at) : 'Never'}
          icon="⏱️"
        />
      </div>

      {/* Usage bar (for free users) */}
      {!hasSubscription && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Usage</h3>
              <p className="text-sm text-slate-500">
                {currentWords} of {wordLimit} words used ({usagePercent.toFixed(0)}%)
              </p>
            </div>
            <Link
              href="/subscription"
              className="rounded-lg bg-yellow-400 px-4 py-2 font-medium text-slate-900 hover:bg-yellow-500 transition-colors"
            >
              Upgrade to Pro
            </Link>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          {usagePercent >= 90 && (
            <p className="mt-2 text-sm text-red-600">
              ⚠️ You're almost at your limit! Upgrade to continue syncing highlights.
            </p>
          )}
        </div>
      )}

      {/* Color distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Highlights by Color</h3>
        <div className="grid grid-cols-4 gap-4">
          <ColorStat color="yellow" count={colorCounts.yellow} />
          <ColorStat color="green" count={colorCounts.green} />
          <ColorStat color="blue" count={colorCounts.blue} />
          <ColorStat color="pink" count={colorCounts.pink} />
        </div>
      </div>

      {/* Recent highlights */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Recent Highlights</h3>
          <Link
            href="/highlights"
            className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
          >
            View all →
          </Link>
        </div>
        {recentHighlights && recentHighlights.length > 0 ? (
          <div className="space-y-4">
            {recentHighlights.map((highlight) => (
              <div
                key={highlight.id}
                className="flex items-start gap-4 p-4 rounded-lg bg-slate-50"
              >
                <div
                  className={`w-1 h-full min-h-[40px] rounded-full highlight-${highlight.color}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 line-clamp-2">{highlight.text}</p>
                  <p className="text-sm text-slate-500 mt-1 truncate">
                    {highlight.page_title || highlight.normalized_url}
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {formatRelativeTime(highlight.created_at)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500">No highlights yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Install the browser extension to start highlighting
            </p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-2">Connect Extension</h3>
          <p className="text-sm text-slate-600 mb-4">
            Link your browser extension to sync highlights automatically.
          </p>
          <button className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            Connect Extension
          </button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-2">Export Data</h3>
          <p className="text-sm text-slate-600 mb-4">
            Download all your highlights as JSON or CSV.
          </p>
          <Link
            href="/highlights?export=true"
            className="inline-block rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Export Highlights
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function ColorStat({ color, count }: { color: string; count: number }) {
  const colorClasses = {
    yellow: 'bg-yellow-200 border-yellow-400',
    green: 'bg-green-200 border-green-400',
    blue: 'bg-blue-200 border-blue-400',
    pink: 'bg-pink-200 border-pink-400',
  };

  return (
    <div className="text-center">
      <div
        className={`w-12 h-12 rounded-lg mx-auto mb-2 border-2 ${
          colorClasses[color as keyof typeof colorClasses]
        }`}
      />
      <p className="text-xl font-bold text-slate-900">{count}</p>
      <p className="text-sm text-slate-500 capitalize">{color}</p>
    </div>
  );
}
