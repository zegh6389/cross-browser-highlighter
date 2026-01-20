import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { asRecentUsers } from '@/lib/db-types';

export default async function AdminDashboardPage() {
  const supabase = createClient();

  // Fetch stats
  const [
    { count: totalUsers },
    { count: totalHighlights },
    { count: activeSubscriptions },
    { count: totalAdmins },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('highlights').select('*', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
  ]);

  // Recent signups (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { count: recentSignups } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo.toISOString());

  // Recent users
  const { data: recentUsersData } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  const recentUsers = asRecentUsers(recentUsersData);

  const stats = [
    { label: 'Total Users', value: totalUsers || 0, icon: '👥', color: 'bg-blue-100 text-blue-700' },
    { label: 'Active Subscriptions', value: activeSubscriptions || 0, icon: '💎', color: 'bg-green-100 text-green-700' },
    { label: 'Total Highlights', value: totalHighlights || 0, icon: '✨', color: 'bg-yellow-100 text-yellow-700' },
    { label: 'Admins', value: totalAdmins || 0, icon: '🔐', color: 'bg-purple-100 text-purple-700' },
  ];

  const quickActions = [
    { href: '/admin/users', label: 'Manage Users', icon: '👥', description: 'View and manage user accounts' },
    { href: '/admin/codes', label: 'Activation Codes', icon: '🔑', description: 'Generate admin activation codes' },
    { href: '/admin/analytics', label: 'View Analytics', icon: '📈', description: 'Detailed usage statistics' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of your Web Highlighter platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${stat.color}`}>
                <span className="text-2xl">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Signups */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Recent Signups</h2>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              +{recentSignups || 0} this week
            </span>
          </div>
          
          {recentUsers && recentUsers.length > 0 ? (
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="text-slate-600 text-sm font-medium">
                        {(user.full_name || user.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {user.full_name || 'No name'}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No recent signups</p>
          )}
          
          <Link
            href="/admin/users"
            className="mt-4 inline-block text-sm text-yellow-600 hover:text-yellow-700 font-medium"
          >
            View all users →
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
          
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 hover:border-yellow-400 hover:bg-yellow-50 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-xl">{action.icon}</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">{action.label}</p>
                  <p className="text-sm text-slate-600">{action.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* System Health (placeholder) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">System Status</h2>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-slate-600">All systems operational</span>
        </div>
      </div>
    </div>
  );
}
