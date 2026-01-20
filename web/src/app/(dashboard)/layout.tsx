import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { asProfile, asUsageTracking, asSubscription } from '@/lib/db-types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  const profile = asProfile(profileData);

  // Get usage stats
  const { data: usageData } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', user.id)
    .single();
  const usage = asUsageTracking(usageData);

  // Check subscription status
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();
  const subscription = asSubscription(subscriptionData);

  const hasSubscription = !!subscription;
  const wordLimit = 300;
  const currentWords = usage?.synced_word_count || 0;
  const remainingWords = hasSubscription ? null : Math.max(0, wordLimit - currentWords);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-yellow-400" />
              <span className="text-xl font-bold text-slate-900">Web Highlighter</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/highlights"
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                Highlights
              </Link>
              <Link
                href="/settings"
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                Settings
              </Link>
              {profile?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Usage indicator */}
            {!hasSubscription && (
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="text-slate-500">
                  {currentWords}/{wordLimit} words
                </span>
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (currentWords / wordLimit) * 100)}%` }}
                  />
                </div>
                <Link
                  href="/subscription"
                  className="text-yellow-600 hover:text-yellow-700 font-medium"
                >
                  Upgrade
                </Link>
              </div>
            )}

            {/* User menu */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">
                  {profile?.full_name || user.email}
                </p>
                <p className="text-xs text-slate-500">
                  {hasSubscription ? 'Pro' : 'Free'} • {profile?.role}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-yellow-700 font-medium">
                  {(profile?.full_name || user.email || '?')[0].toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
