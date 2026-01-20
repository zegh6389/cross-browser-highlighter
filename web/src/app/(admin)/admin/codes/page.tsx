'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ActivationCode {
  id: string;
  code_hash: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  creator: { email: string; full_name: string | null } | null;
  user: { email: string; full_name: string | null } | null;
}

export default function AdminCodesPage() {
  const supabase = createClient();
  
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/codes');
      if (!response.ok) throw new Error('Failed to load codes');
      const data = await response.json();
      setCodes(data.codes || []);
    } catch (error) {
      console.error('Failed to load codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    setGenerating(true);
    setNewCode(null);
    try {
      const response = await fetch('/api/admin/codes', {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to generate code');
      
      const data = await response.json();
      setNewCode(data.code);
      loadCodes(); // Refresh the list
    } catch (error) {
      console.error('Failed to generate code:', error);
      alert('Failed to generate code. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (newCode) {
      navigator.clipboard.writeText(newCode);
      alert('Code copied to clipboard!');
    }
  };

  const getCodeStatus = (code: ActivationCode) => {
    if (code.used_at) return { status: 'used', color: 'bg-slate-100 text-slate-600' };
    if (new Date(code.expires_at) < new Date()) return { status: 'expired', color: 'bg-red-100 text-red-600' };
    return { status: 'active', color: 'bg-green-100 text-green-700' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Activation Codes</h1>
          <p className="text-slate-600 mt-1">Generate and manage admin activation codes</p>
        </div>
        <button
          onClick={generateCode}
          disabled={generating}
          className="rounded-lg bg-yellow-400 px-4 py-2 font-medium text-slate-900 hover:bg-yellow-500 transition-colors disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate New Code'}
        </button>
      </div>

      {/* New Code Display */}
      {newCode && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-800 mb-1">New Code Generated!</h3>
              <p className="text-sm text-green-700 mb-3">
                Copy this code now - it won't be shown again!
              </p>
              <code className="block bg-white px-4 py-2 rounded-lg border border-green-200 font-mono text-lg text-green-900">
                {newCode}
              </code>
            </div>
            <button
              onClick={copyToClipboard}
              className="rounded-lg border border-green-300 px-4 py-2 font-medium text-green-700 hover:bg-green-100 transition-colors"
            >
              Copy
            </button>
          </div>
          <p className="mt-3 text-sm text-green-600">
            This code expires in 7 days. Share it securely with the intended admin user.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>How it works:</strong> Generated codes allow new users to register as admins. 
          Each code can only be used once and expires after 7 days. When a user enters a valid 
          code during signup, their account is automatically granted admin privileges.
        </p>
      </div>

      {/* Codes Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : codes.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No activation codes yet. Generate one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Code</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Created By</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Created At</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Expires At</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Used By</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Used At</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => {
                  const { status, color } = getCodeStatus(code);
                  return (
                    <tr key={code.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <code className="text-sm text-slate-700 font-mono">
                          {code.code_hash.substring(0, 12)}...
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${color}`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900">
                        {code.creator?.full_name || code.creator?.email || 'Unknown'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {formatDate(code.created_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {formatDate(code.expires_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-900">
                        {code.user ? (code.user.full_name || code.user.email) : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {code.used_at ? formatDate(code.used_at) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
