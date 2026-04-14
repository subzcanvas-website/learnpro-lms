'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { adminAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Building2, Plus, Users, CreditCard, CheckCircle, XCircle, X, Globe } from 'lucide-react';

export default function OrgsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', logo_url: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      router.push('/dashboard');
      return;
    }
    adminAPI.getOrgs().then(r => setOrgs(r.data)).catch(() => toast.error('Failed to load orgs')).finally(() => setLoading(false));
  }, [user]);

  const handleCreate = async () => {
    if (!form.name || !form.slug) return toast.error('Name and slug required');
    if (!/^[a-z0-9-]+$/.test(form.slug)) return toast.error('Slug: lowercase letters, numbers, hyphens only');
    setSaving(true);
    try {
      await adminAPI.createOrg(form);
      toast.success('Organization created!');
      setShowModal(false);
      setForm({ name: '', slug: '', logo_url: '' });
      const r = await adminAPI.getOrgs();
      setOrgs(r.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create org');
    } finally { setSaving(false); }
  };

  const PLAN_COLORS: Record<string, string> = {
    basic: 'badge-blue',
    pro: 'badge-peach',
    enterprise: 'badge-green',
  };

  return (
    <DashboardLayout title="Organizations">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">All Organizations</h2>
            <p className="text-sm text-gray-400 mt-0.5">{orgs.length} tenants on the platform</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Organization
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Orgs', value: orgs.length, icon: Building2 },
            { label: 'Active', value: orgs.filter(o => o.is_active).length, icon: CheckCircle },
            { label: 'Total Users', value: orgs.reduce((a, o) => a + (parseInt(o.user_count) || 0), 0), icon: Users },
          ].map(s => (
            <div key={s.label} className="stat-card flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-peach-50 flex items-center justify-center">
                <s.icon size={18} className="text-peach-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Orgs table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Organization', 'Slug', 'Users', 'Plan', 'Status', 'Created'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Building2 size={40} className="mx-auto mb-3 text-gray-200" />
                    <p className="text-gray-400">No organizations yet</p>
                  </td>
                </tr>
              ) : orgs.map(org => (
                <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {org.logo_url ? (
                        <img src={org.logo_url} alt="" className="w-9 h-9 rounded-xl object-cover" loading="lazy" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-peach-50 flex items-center justify-center">
                          <Building2 size={16} className="text-peach-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{org.name}</p>
                        <p className="text-xs text-gray-400">{org.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Globe size={12} />
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{org.slug}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Users size={13} className="text-gray-400" />
                      {org.user_count || 0}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {org.plan_name ? (
                      <span className={`badge ${PLAN_COLORS[org.plan_name?.toLowerCase()] || 'badge-blue'} capitalize`}>
                        {org.plan_name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {org.is_active
                      ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle size={13} /> Active</span>
                      : <span className="flex items-center gap-1 text-xs text-red-500"><XCircle size={13} /> Inactive</span>
                    }
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Org Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">New Organization</h3>
              <button onClick={() => setShowModal(false)}>
                <X size={18} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Organization Name *</label>
                <input
                  value={form.name}
                  onChange={e => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                    setForm(f => ({ ...f, name, slug }));
                  }}
                  placeholder="Acme Corp"
                  className="input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Slug (URL identifier) *</label>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-peach-400 focus-within:ring-2 focus-within:ring-peach-100">
                  <span className="px-3 py-2.5 bg-gray-50 text-sm text-gray-400 border-r border-gray-200">learnpro.io/</span>
                  <input
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    placeholder="acme-corp"
                    className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers and hyphens only</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Logo URL (optional)</label>
                <input
                  value={form.logo_url}
                  onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                  placeholder="https://company.com/logo.png"
                  className="input"
                />
              </div>
              {form.logo_url && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <img src={form.logo_url} alt="Logo preview" className="w-10 h-10 rounded-lg object-cover" loading="lazy" onError={e => (e.currentTarget.style.display = 'none')} />
                  <p className="text-xs text-gray-400">Logo preview</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
