'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { sopsAPI } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Plus, FileText, Search, ChevronRight, Clock, Tag, BookOpen } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

export default function SOPsPage() {
  const { user } = useAuthStore();
  const [sops, setSops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: '', steps: [{ title: '', content: '', image_url: '', video_url: '' }] });
  const [saving, setSaving] = useState(false);

  const canCreate = ['super_admin', 'org_admin', 'trainer'].includes(user?.role || '');

  useEffect(() => {
    sopsAPI.getAll().then(r => setSops(r.data)).catch(() => toast.error('Failed to load SOPs')).finally(() => setLoading(false));
  }, []);

  const filtered = sops.filter(s =>
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, { title: '', content: '', image_url: '', video_url: '' }] }));
  const updateStep = (i: number, field: string, val: string) => setForm(f => ({
    ...f,
    steps: f.steps.map((s, idx) => idx === i ? { ...s, [field]: val } : s),
  }));

  const handleCreate = async () => {
    if (!form.title) return toast.error('Title required');
    setSaving(true);
    try {
      await sopsAPI.create(form);
      toast.success('SOP created!');
      setShowCreate(false);
      const r = await sopsAPI.getAll();
      setSops(r.data);
    } catch { toast.error('Failed to create SOP'); }
    finally { setSaving(false); }
  };

  const categoryColors: Record<string, string> = {
    onboarding: 'badge-blue',
    safety: 'badge-red',
    operations: 'badge-peach',
    training: 'badge-green',
    compliance: 'badge-yellow',
  };

  return (
    <DashboardLayout title="SOPs">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Standard Operating Procedures</h2>
            <p className="text-sm text-gray-400 mt-0.5">{sops.length} SOPs in your library</p>
          </div>
          {canCreate && (
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> New SOP
            </button>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 max-w-sm shadow-sm">
          <Search size={15} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SOPs..." className="bg-transparent text-sm outline-none flex-1" />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <div key={i} className="card p-5 h-40 animate-pulse bg-gray-50" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20">
            <FileText size={48} className="text-gray-200 mb-4" />
            <p className="text-lg font-semibold text-gray-400">No SOPs found</p>
            {canCreate && <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">Create First SOP</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(sop => (
              <Link key={sop.id} href={`/sops/${sop.id}`} className="card p-5 group hover:shadow-md transition-all hover:border-peach-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-peach-50 flex items-center justify-center">
                    <FileText size={18} className="text-peach-500" />
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-peach-400 transition-colors" />
                </div>
                <h3 className="font-semibold text-gray-800 group-hover:text-peach-600 transition-colors mb-1 line-clamp-2">{sop.title}</h3>
                {sop.description && <p className="text-sm text-gray-400 line-clamp-2 mb-3">{sop.description}</p>}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {sop.category && (
                      <span className={`badge ${categoryColors[sop.category] || 'badge-blue'} text-xs capitalize`}>
                        {sop.category}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <BookOpen size={11} /> v{sop.current_version}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(sop.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create SOP Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Create SOP</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="e.g. Customer Onboarding Process" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Description</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" placeholder="Brief overview" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input">
                    <option value="">Select...</option>
                    {['onboarding', 'safety', 'operations', 'training', 'compliance'].map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Steps */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">Steps</label>
                  <button onClick={addStep} className="text-xs text-peach-500 hover:text-peach-600 flex items-center gap-1">
                    <Plus size={12} /> Add Step
                  </button>
                </div>
                <div className="space-y-3">
                  {form.steps.map((step, i) => (
                    <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50/50">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-peach-500 text-white text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                        <input
                          value={step.title}
                          onChange={e => updateStep(i, 'title', e.target.value)}
                          className="input py-1.5 text-sm"
                          placeholder="Step title"
                        />
                      </div>
                      <textarea
                        value={step.content}
                        onChange={e => updateStep(i, 'content', e.target.value)}
                        className="input text-sm resize-none"
                        rows={2}
                        placeholder="Step description / instructions"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={step.image_url} onChange={e => updateStep(i, 'image_url', e.target.value)} className="input text-xs py-1.5" placeholder="Image URL (optional)" />
                        <input value={step.video_url} onChange={e => updateStep(i, 'video_url', e.target.value)} className="input text-xs py-1.5" placeholder="Video URL (optional)" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create SOP'}</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
