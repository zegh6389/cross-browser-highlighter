'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserWithRelations, UsageStats, SubscriptionWithStatus } from '@/lib/db-types';

export default function AdminUsersPage() {
  const supabase = createClient();
  
  const [users, setUsers] = useState<UserWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Get count first
      let countQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (search) {
        countQuery = countQuery.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
      }
      
      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Get paginated users
      let query = supabase
        .from('profiles')
        .select(`
          *,
          subscriptions(status, current_period_end),
          usage_tracking(synced_word_count, synced_highlights_count)
        `)
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);
      
      if (search) {
        query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Flatten the nested data with proper typing
      const flattenedUsers: UserWithRelations[] = ((data || []) as UserWithRelations[]).map(user => {
        const subscriptions = user.subscriptions;
        const usage = user.usage_tracking;
        
        return {
          ...user,
          subscriptions: Array.isArray(subscriptions) 
            ? (subscriptions as SubscriptionWithStatus[]).find(s => s.status === 'active') || null
            : subscriptions,
          usage_tracking: Array.isArray(usage) 
            ? (usage as UsageStats[])[0] || null
            : usage,
        };
      });
      
      setUsers(flattenedUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Helper to get subscription status safely
  const getSubscriptionStatus = (user: UserWithRelations) => {
    const sub = user.subscriptions;
    if (!sub) return null;
    if (Array.isArray(sub)) return sub[0]?.status || null;
    return sub.status;
  };

  // Helper to get usage safely
  const getUsage = (user: UserWithRelations): UsageStats | null => {
    const usage = user.usage_tracking;
    if (!usage) return null;
    if (Array.isArray(usage)) return usage[0] || null;
    return usage;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-600 mt-1">Manage all users on the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">{totalCount} total users</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-yellow-400 focus:ring-yellow-400"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Subscription</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Words</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Highlights</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const subStatus = getSubscriptionStatus(user);
                  const usage = getUsage(user);
                  
                  return (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
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
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          subStatus === 'active'
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {subStatus === 'active' ? 'Pro' : 'Free'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900">
                        {usage?.synced_word_count || 0}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900">
                        {usage?.synced_highlights_count || 0}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {formatDate(user.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Showing {page * ITEMS_PER_PAGE + 1} to {Math.min((page + 1) * ITEMS_PER_PAGE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 text-sm rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 text-sm rounded border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
