'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { usersAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, MoreVertical, Users, CheckCircle, XCircle, Edit, Trash2, X } from 'lucide-react';

const ROLES = ['staff', 'trainer', 'manager', 'org_admin'];

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({ name: '', email: '', phone: '', role_id: '', department: '', password: '' });
  const [saving, setSaving] = useState(false);

  const ROLE_IDS: Record<string, string> = {
    staff: '00000000-0000-0000-0000-000000000005',
    trainer: '00000000-0000-0000-0000-000000000004',
    manager: '00000000-0000-0000-0000-000000000003',
    org_admin: '00000000-0000-0000-0000-000000000002',
  };

  const fetchUsers = async () => {
    try {
      const { data } = await usersAPI.getAll();
      setUsers(data);
    } catch { toast.error('Failed to fetch users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  const handleCreate = async () => {
    if (!form.name) return toast.error('Name is required');
    setSaving(true);
    try {
      await usersAPI.create({ ...form, role_id: ROLE_IDS[form.role_name || 'staff'] });
      toast.success('User created!');
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', role_id: '', department: '', password: '' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this user?')) return;
    try {
      await usersAPI.delete(id);
      toast.success('User deactivated');
      fetchUsers();
    } catch { toast.error('Failed to deactivate'); }
  };

  const roleColor: Record<string, string> = {
    super_admin: 'badge-red',
    org_admin: 'badge-peach',
    manager: 'badge-blue',
    trainer: 'badge-green',
    staff: 'badge-yellow',
  };

  return (
    <DashboardLayout title="Team Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Team Members</h2>
            <p className="text-sm text-gray-400 mt-0.5">{users.length} total users</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add User
          </button>
        </div>

        {/* Search */}
        <div className="card p-4">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 max-w-sm">
            <Search size={15} className="text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="bg-transparent text-sm outline-none flex-1" />
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Department</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-4">
                      <div className="h-5 bg-gray-100 rounded animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <Users size={40} className="mx-auto mb-3 text-gray-200" />
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-peach-100 flex items-center justify-center text-sm font-bold text-peach-500">
                          {u.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.employee_id || 'No ID'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <p className="text-sm text-gray-600">{u.email || '—'}</p>
                      <p className="text-xs text-gray-400">{u.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`badge ${roleColor[u.role_name] || 'badge-blue'} capitalize`}>
                        {u.role_name?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell text-sm text-gray-600">{u.department || '—'}</td>
                    <td className="px-4 py-4">
                      {u.is_active
                        ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle size={13} /> Active</span>
                        : <span className="flex items-center gap-1 text-xs text-red-500"><XCircle size={13} /> Inactive</span>
                      }
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 justify-center">
                        <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDeactivate(u.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Add New User</h3>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Full Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" placeholder="john@company.com" className="input" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="9999999999" className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Role</label>
                  <select value={form.role_name || 'staff'} onChange={e => setForm({ ...form, role_name: e.target.value })} className="input">
                    {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Department</label>
                  <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Engineering" className="input" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Password</label>
                <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} type="password" placeholder="••••••••" className="input" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
