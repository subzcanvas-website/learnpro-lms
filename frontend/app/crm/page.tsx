'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { crmAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, MessageSquare, X, Phone, Mail, User } from 'lucide-react';

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];
const STATUS_COLORS: Record<string, string> = {
  new: 'badge-blue',
  contacted: 'badge-yellow',
  qualified: 'badge-peach',
  converted: 'badge-green',
  lost: 'badge-red',
};

export default function CRMPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', source: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchLeads = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await crmAPI.getLeads(params);
      setLeads(data);
    } catch { toast.error('Failed to fetch leads'); }
  };

  useEffect(() => { fetchLeads(); }, [filter]);

  const handleCreate = async () => {
    if (!form.name) return toast.error('Name required');
    setSaving(true);
    try {
      await crmAPI.createLead(form);
      toast.success('Lead added!');
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', source: '', notes: '' });
      fetchLeads();
    } catch { toast.error('Failed to create lead'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const lead = leads.find(l => l.id === id);
      await crmAPI.updateLead(id, { ...lead, status });
      toast.success('Status updated');
      fetchLeads();
    } catch { toast.error('Failed to update'); }
  };

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: leads.filter(l => l.status === s).length }), {} as Record<string, number>);

  return (
    <DashboardLayout title="CRM / Leads">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Lead Management</h2>
            <p className="text-sm text-gray-400 mt-0.5">{leads.length} total leads</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Lead
          </button>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-5 gap-3">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? 'all' : s)}
              className={`stat-card cursor-pointer transition-all ${filter === s ? 'ring-2 ring-peach-400' : ''}`}
            >
              <p className="text-2xl font-bold text-gray-900">{counts[s] || 0}</p>
              <p className="text-xs text-gray-400 capitalize mt-1">{s}</p>
            </button>
          ))}
        </div>

        {/* Leads list */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Source</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden xl:table-cell">Notes</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Change Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <MessageSquare size={40} className="mx-auto mb-3 text-gray-200" />
                    <p className="text-gray-400">No leads yet</p>
                  </td>
                </tr>
              ) : (
                leads.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-500">
                          {l.name?.[0]?.toUpperCase()}
                        </div>
                        <p className="font-medium text-gray-800 text-sm">{l.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      {l.email && <p className="text-sm text-gray-600 flex items-center gap-1"><Mail size={12} />{l.email}</p>}
                      {l.phone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={11} />{l.phone}</p>}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell text-sm text-gray-500">{l.source || '—'}</td>
                    <td className="px-4 py-4">
                      <span className={`badge ${STATUS_COLORS[l.status] || 'badge-blue'} capitalize`}>{l.status}</span>
                    </td>
                    <td className="px-4 py-4 hidden xl:table-cell text-sm text-gray-400 max-w-xs truncate">{l.notes || '—'}</td>
                    <td className="px-4 py-4">
                      <select
                        value={l.status}
                        onChange={e => updateStatus(l.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-peach-400"
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Add New Lead</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="Full name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" className="input" placeholder="email@domain.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input" placeholder="9999999999" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Source</label>
                <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="input">
                  <option value="">Select source</option>
                  {['Website', 'Instagram', 'Referral', 'WhatsApp', 'Walk-in', 'LinkedIn', 'Other'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="input resize-none" placeholder="Any additional notes..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving...' : 'Add Lead'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
