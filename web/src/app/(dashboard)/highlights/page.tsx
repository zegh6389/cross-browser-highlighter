'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime, truncate, formatNumber } from '@/lib/utils';

interface Highlight {
  id: string;
  text: string;
  color: string;
  normalized_url: string;
  page_title: string | null;
  word_count: number;
  note: string | null;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function HighlightsPage() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const supabase = createClient();

  useEffect(() => {
    loadHighlights();
  }, [currentPage, filter]);

  const loadHighlights = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('highlights')
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * 20, currentPage * 20 - 1);

      if (filter !== 'all') {
        query = query.eq('color', filter);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      setHighlights(data || []);
      setPagination({
        page: currentPage,
        limit: 20,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / 20),
      });
    } catch (error) {
      console.error('Failed to load highlights:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteHighlight = async (id: string) => {
    if (!confirm('Are you sure you want to delete this highlight?')) return;

    try {
      const { error } = await supabase
        .from('highlights')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setHighlights(highlights.filter(h => h.id !== id));
    } catch (error) {
      console.error('Failed to delete highlight:', error);
    }
  };

  const filteredHighlights = highlights.filter(h => 
    search === '' || 
    h.text.toLowerCase().includes(search.toLowerCase()) ||
    (h.page_title?.toLowerCase().includes(search.toLowerCase()))
  );

  const colorClasses: Record<string, string> = {
    yellow: 'bg-yellow-100 border-yellow-300',
    green: 'bg-green-100 border-green-300',
    blue: 'bg-blue-100 border-blue-300',
    pink: 'bg-pink-100 border-pink-300',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Highlights</h1>
          <p className="text-slate-600 mt-1">
            {pagination ? formatNumber(pagination.total) : '...'} highlights saved
          </p>
        </div>
        <button
          onClick={() => {/* Export functionality */}}
          className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Export
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="search"
            placeholder="Search highlights..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400 focus:border-yellow-400 focus:ring-yellow-400"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'yellow', 'green', 'blue', 'pink'].map((color) => (
            <button
              key={color}
              onClick={() => { setFilter(color); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                filter === color
                  ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {color === 'all' ? 'All' : (
                <div className={`w-4 h-4 rounded ${colorClasses[color]}`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Highlights list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="skeleton h-4 w-3/4 rounded mb-2" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      ) : filteredHighlights.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500">No highlights found</p>
          <p className="text-sm text-slate-400 mt-1">
            {search ? 'Try a different search term' : 'Start highlighting text on any website'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHighlights.map((highlight) => (
            <div
              key={highlight.id}
              className={`bg-white rounded-xl border-l-4 p-6 shadow-sm ${
                colorClasses[highlight.color] || 'border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900">{highlight.text}</p>
                  {highlight.note && (
                    <p className="text-sm text-slate-600 mt-2 italic">
                      Note: {highlight.note}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-sm text-slate-500">
                    <span>{highlight.word_count} words</span>
                    <span>•</span>
                    <a
                      href={highlight.normalized_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:text-yellow-600"
                    >
                      {highlight.page_title || truncate(highlight.normalized_url, 50)}
                    </a>
                    <span>•</span>
                    <span>{formatRelativeTime(highlight.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => deleteHighlight(highlight.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-slate-600">
            Page {currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={currentPage === pagination.totalPages}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
