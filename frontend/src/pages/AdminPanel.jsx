import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Users, Eye, Activity, LogIn, Shield, ArrowLeft, RefreshCw } from 'lucide-react';

const ADMIN_KEY_STORAGE = 'clickedin_admin_key';

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{label}</p>
        {Icon && <Icon size={16} className="text-cyan-400" />}
      </div>
      <p className="text-3xl font-black text-white">{value ?? '—'}</p>
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return new Date(iso).toLocaleString();
}

export default function AdminPanel() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(ADMIN_KEY_STORAGE) || '');
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('overview');

  const api = axios.create({
    headers: adminKey ? { 'X-Admin-Key': adminKey } : {},
  });

  async function verifyAndLoad(key) {
    setLoading(true);
    try {
      await axios.get('/api/admin/access', { headers: { 'X-Admin-Key': key } });
      const dash = await axios.get('/api/admin/dashboard', { headers: { 'X-Admin-Key': key } });
      setStats(dash.data.stats);
      setRecentActivity(dash.data.recentActivity || []);
      setUsers(dash.data.users || []);
      setAuthed(true);
      sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
      setAdminKey(key);
    } catch {
      setAuthed(false);
      sessionStorage.removeItem(ADMIN_KEY_STORAGE);
      toast.error('Admin access denied');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (adminKey) verifyAndLoad(adminKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('/api/admin/login', { password });
      await verifyAndLoad(res.data.adminKey);
      toast.success('Admin unlocked');
    } catch {
      toast.error('Wrong password');
      setLoading(false);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#07080A]">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0F1115] p-8 space-y-5"
        >
          <div className="flex items-center gap-3">
            <Shield className="text-cyan-400" />
            <div>
              <h1 className="text-xl font-black text-white">ClickedIn Admin</h1>
              <p className="text-sm text-slate-400">See who is visiting the site</p>
            </div>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-cyan-500/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 transition"
          >
            {loading ? 'Checking…' : 'Open dashboard'}
          </button>
          <a href="/" className="block text-center text-sm text-slate-500 hover:text-slate-300">
            ← Back to app
          </a>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080A] text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black">ClickedIn Admin</h1>
            <p className="text-sm text-slate-400">Visitor traffic &amp; LinkedIn users (like VetPet)</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => verifyAndLoad(adminKey)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
            >
              <ArrowLeft size={14} /> App
            </a>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] p-1 mb-6">
          {[
            ['overview', 'Overview'],
            ['activity', 'Activity'],
            ['users', 'Users'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
                tab === key ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === 'overview' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Unique visitors (24h)" value={stats.uniqueVisitorsLast24h} icon={Users} />
              <StatCard label="Page views (24h)" value={stats.pageViewsLast24h} icon={Eye} />
              <StatCard label="All events (24h)" value={stats.activityLast24h} icon={Activity} />
              <StatCard label="Logins (24h)" value={stats.loginsLast24h} icon={LogIn} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="font-semibold mb-1">Registered LinkedIn users</h2>
              <p className="text-3xl font-black text-cyan-400">{stats.registeredUsers}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="font-semibold mb-4">Top pages (24h)</h2>
              {(stats.topPaths || []).length === 0 ? (
                <p className="text-sm text-slate-500">No page views yet.</p>
              ) : (
                <ul className="space-y-2">
                  {stats.topPaths.map((row) => (
                    <li key={row.path} className="flex justify-between text-sm border-b border-white/5 pb-2">
                      <span className="text-slate-300 font-mono truncate mr-4">{row.path}</span>
                      <span className="text-cyan-400 font-bold">{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <ActivityTable items={recentActivity} />
          </div>
        )}

        {tab === 'activity' && <ActivityTable items={recentActivity} title="Full recent activity" />}

        {tab === 'users' && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 font-semibold">LinkedIn users in Firestore</div>
            {users.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No users saved yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-400 border-b border-white/10">
                    <tr>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">User ID</th>
                      <th className="px-5 py-3 font-medium">Auto posts</th>
                      <th className="px-5 py-3 font-medium">Token</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-white/5">
                        <td className="px-5 py-3 text-white">{u.name || '—'}</td>
                        <td className="px-5 py-3 font-mono text-slate-400 text-xs">{u.id}</td>
                        <td className="px-5 py-3">{u.fullyAutomated ? 'On' : 'Off'}</td>
                        <td className="px-5 py-3">{u.hasToken ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityTable({ items, title = 'Recent activity' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 font-semibold">{title}</div>
      {!items?.length ? (
        <p className="p-5 text-sm text-slate-500">No activity yet — open the site to generate page views.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Path</th>
                <th className="px-4 py-3 font-medium">Visitor</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{timeAgo(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-cyan-500/10 text-cyan-300 px-2 py-0.5 text-xs font-semibold">
                      {row.event}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300 max-w-[200px] truncate">
                    {row.path}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {row.userName || (row.sessionId ? row.sessionId.slice(0, 16) + '…' : 'anon')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
