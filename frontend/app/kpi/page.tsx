'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { kpiAPI, usersAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Plus, Star, Target, TrendingUp, BarChart2, X, Users } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const StarRating = ({ value, onChange }: { value: number; onChange?: (v: number) => void }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      <button key={i} onClick={() => onChange?.(i)} disabled={!onChange} className={`text-xl ${i <= value ? 'text-yellow-400' : 'text-gray-200'} transition-colors`}>★</button>
    ))}
  </div>
);

export default function KPIPage() {
  const { user } = useAuthStore();
  const [kpis, setKpis] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [scorecard, setScorecard] = useState<any[]>([]);
  const [showCreateKPI, setShowCreateKPI] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [kpiForm, setKpiForm] = useState({ name: '', description: '', target_value: '', unit: '', category: '' });
  const [entryForm, setEntryForm] = useState({ kpi_id: '', user_id: '', value: '', rating: 3, notes: '', period_start: '', period_end: '' });
  const [saving, setSaving] = useState(false);

  const canManage = ['super_admin', 'org_admin', 'manager'].includes(user?.role || '');

  useEffect(() => {
    kpiAPI.getAll().then(r => setKpis(r.data)).catch(() => {});
    if (canManage) {
      usersAPI.getAll().then(r => setUsers(r.data)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const uid = selectedUser || user?.id;
    if (uid) {
      kpiAPI.getScorecard(uid).then(r => setScorecard(r.data)).catch(() => {});
    }
  }, [selectedUser, user?.id]);

  const handleCreateKPI = async () => {
    if (!kpiForm.name) return toast.error('Name required');
    setSaving(true);
    try {
      await kpiAPI.create(kpiForm);
      toast.success('KPI created!');
      setShowCreateKPI(false);
      const r = await kpiAPI.getAll();
      setKpis(r.data);
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const handleAddEntry = async () => {
    if (!entryForm.kpi_id || !entryForm.user_id || !entryForm.value) return toast.error('Fill required fields');
    setSaving(true);
    try {
      await kpiAPI.addEntry(entryForm);
      toast.success('Entry saved!');
      setShowAddEntry(false);
      const uid = selectedUser || user?.id;
      if (uid) { const r = await kpiAPI.getScorecard(uid); setScorecard(r.data); }
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const radarData = scorecard.map(s => ({
    subject: s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name,
    value: Math.round(((s.avg_rating || 0) / 5) * 100),
  }));

  const barData = scorecard.map(s => ({
    name: s.name.length > 10 ? s.name.slice(0, 10) + '…' : s.name,
    actual: Math.round(s.avg_value || 0),
    target: s.target_value || 0,
  }));

  return (
    <DashboardLayout title="KPI & Performance">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Performance Management</h2>
            <p className="text-sm text-gray-400 mt-0.5">Track KPIs and team performance</p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <button onClick={() => setShowAddEntry(true)} className="btn-secondary flex items-center gap-2 text-sm">
                <Plus size={14} /> Add Entry
              </button>
              <button onClick={() => setShowCreateKPI(true)} className="btn-primary flex items-center gap-2 text-sm">
                <Target size={14} /> New KPI
              </button>
            </div>
          )}
        </div>

        {/* User selector (managers+) */}
        {canManage && users.length > 0 && (
          <div className="card p-4 flex items-center gap-3">
            <Users size={16} className="text-gray-400" />
            <label className="text-sm font-medium text-gray-600">View scorecard for:</label>
            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="input w-56 py-1.5">
              <option value={user?.id || ''}>Me</option>
              {users.filter(u => u.id !== user?.id).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {scorecard.map((s, i) => {
            const pct = s.target_value ? Math.min(100, Math.round((s.avg_value / s.target_value) * 100)) : 0;
            const good = pct >= 80;
            return (
              <div key={i} className="stat-card">
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${good ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    <BarChart2 size={16} className={good ? 'text-green-500' : 'text-yellow-500'} />
                  </div>
                  <StarRating value={Math.round(s.avg_rating || 0)} />
                </div>
                <p className="font-semibold text-gray-800 text-sm mb-0.5 line-clamp-1">{s.name}</p>
                {s.category && <p className="text-xs text-gray-400 capitalize mb-2">{s.category}</p>}
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-2xl font-black text-gray-900">{Math.round(s.avg_value || 0)}</span>
                  {s.unit && <span className="text-xs text-gray-400 mb-1">{s.unit}</span>}
                  {s.target_value && <span className="text-xs text-gray-300 mb-1">/ {s.target_value}</span>}
                </div>
                {s.target_value > 0 && (
                  <div>
                    <div className="progress-bar">
                      <div className={`progress-fill ${!good ? '!bg-gradient-to-r !from-yellow-400 !to-yellow-500' : ''}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct}% of target</p>
                  </div>
                )}
              </div>
            );
          })}
          {scorecard.length === 0 && (
            <div className="col-span-full card flex flex-col items-center justify-center py-16">
              <Target size={40} className="text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">No KPI data yet</p>
            </div>
          )}
        </div>

        {/* Charts */}
        {scorecard.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar chart */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Performance Radar</h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#f0f0f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <Radar name="Score" dataKey="value" stroke="#ff7f5c" fill="#ff7f5c" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {/* Bar chart */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Actual vs Target</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="actual" fill="#ff7f5c" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target" fill="#e8e8e8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* KPI library */}
        {canManage && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-50 bg-gray-50/60">
              <h3 className="font-semibold text-gray-700 text-sm">KPI Library ({kpis.length})</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {kpis.map(k => (
                <div key={k.id} className="flex items-center gap-4 px-5 py-3">
                  <Target size={16} className="text-peach-400 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{k.name}</p>
                    {k.description && <p className="text-xs text-gray-400">{k.description}</p>}
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-gray-700">{k.target_value} {k.unit}</p>
                    {k.category && <p className="text-xs text-gray-400 capitalize">{k.category}</p>}
                  </div>
                </div>
              ))}
              {kpis.length === 0 && <div className="text-center py-8 text-sm text-gray-400">No KPIs defined yet</div>}
            </div>
          </div>
        )}
      </div>

      {/* Create KPI Modal */}
      {showCreateKPI && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">New KPI</h3>
              <button onClick={() => setShowCreateKPI(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={kpiForm.name} onChange={e => setKpiForm(f => ({ ...f, name: e.target.value }))} placeholder="KPI Name *" className="input" />
              <input value={kpiForm.description} onChange={e => setKpiForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className="input" />
              <div className="grid grid-cols-2 gap-3">
                <input value={kpiForm.target_value} onChange={e => setKpiForm(f => ({ ...f, target_value: e.target.value }))} placeholder="Target value" type="number" className="input" />
                <input value={kpiForm.unit} onChange={e => setKpiForm(f => ({ ...f, unit: e.target.value }))} placeholder="Unit (e.g. %)" className="input" />
              </div>
              <input value={kpiForm.category} onChange={e => setKpiForm(f => ({ ...f, category: e.target.value }))} placeholder="Category (e.g. Sales)" className="input" />
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCreateKPI(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleCreateKPI} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add KPI Entry Modal */}
      {showAddEntry && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Add KPI Entry</h3>
              <button onClick={() => setShowAddEntry(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <select value={entryForm.kpi_id} onChange={e => setEntryForm(f => ({ ...f, kpi_id: e.target.value }))} className="input">
                <option value="">Select KPI *</option>
                {kpis.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
              <select value={entryForm.user_id} onChange={e => setEntryForm(f => ({ ...f, user_id: e.target.value }))} className="input">
                <option value="">Select User *</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <input value={entryForm.value} onChange={e => setEntryForm(f => ({ ...f, value: e.target.value }))} placeholder="Value *" type="number" className="input" />
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-1.5">Rating</label>
                <StarRating value={entryForm.rating} onChange={v => setEntryForm(f => ({ ...f, rating: v }))} />
              </div>
              <textarea value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" rows={2} className="input resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <input value={entryForm.period_start} onChange={e => setEntryForm(f => ({ ...f, period_start: e.target.value }))} type="date" className="input text-sm" />
                <input value={entryForm.period_end} onChange={e => setEntryForm(f => ({ ...f, period_end: e.target.value }))} type="date" className="input text-sm" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAddEntry(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAddEntry} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Entry'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
