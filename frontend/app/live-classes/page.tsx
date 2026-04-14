'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { liveClassesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Video, Plus, Calendar, Clock, Users, ExternalLink, X, CheckCircle } from 'lucide-react';

export default function LiveClassesPage() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', meeting_link: '', platform: 'zoom',
    scheduled_at: '', duration_minutes: 60,
  });

  const canCreate = ['super_admin', 'org_admin', 'trainer'].includes(user?.role || '');

  const fetch = async () => {
    try {
      const { data } = await liveClassesAPI.getAll();
      setClasses(data);
    } catch { /* first load may be empty */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.scheduled_at) return toast.error('Title and date required');
    setSaving(true);
    try {
      await liveClassesAPI.create(form);
      toast.success('Class scheduled!');
      setShowCreate(false);
      setForm({ title: '', description: '', meeting_link: '', platform: 'zoom', scheduled_at: '', duration_minutes: 60 });
      fetch();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const markAttendance = async (classId: string) => {
    try {
      await liveClassesAPI.attend(classId);
      toast.success('Attendance recorded!');
      fetch();
    } catch { toast.error('Failed to record attendance'); }
  };

  const upcoming = classes.filter(c => new Date(c.scheduled_at) > new Date());
  const past = classes.filter(c => new Date(c.scheduled_at) <= new Date());

  const PLATFORM_COLORS: Record<string, string> = {
    zoom: 'badge-blue',
    meet: 'badge-green',
    teams: 'badge-peach',
    other: 'badge-yellow',
  };

  return (
    <DashboardLayout title="Live Classes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Live Classes</h2>
            <p className="text-sm text-gray-400 mt-0.5">{upcoming.length} upcoming · {past.length} past</p>
          </div>
          {canCreate && (
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Schedule Class
            </button>
          )}
        </div>

        {/* Upcoming classes */}
        {upcoming.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Upcoming</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {upcoming.map(c => {
                const dt = new Date(c.scheduled_at);
                const isToday = dt.toDateString() === new Date().toDateString();
                return (
                  <div key={c.id} className={`card p-5 ${isToday ? 'border-peach-300 bg-peach-50/30' : ''}`}>
                    {isToday && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-peach-500 animate-pulse" />
                        <span className="text-xs font-semibold text-peach-600 uppercase">Today</span>
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Video size={18} className="text-blue-500" />
                      </div>
                      <span className={`badge ${PLATFORM_COLORS[c.platform] || 'badge-blue'} capitalize`}>{c.platform}</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-1">{c.title}</h3>
                    {c.description && <p className="text-sm text-gray-400 mb-3 line-clamp-2">{c.description}</p>}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar size={12} />
                        {dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock size={12} />
                        {dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {c.duration_minutes} min
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {c.meeting_link && (
                        <a href={c.meeting_link} target="_blank" rel="noopener noreferrer"
                          className="btn-primary flex items-center gap-1.5 text-sm py-2 flex-1 justify-center">
                          <ExternalLink size={13} /> Join Class
                        </a>
                      )}
                      <button onClick={() => markAttendance(c.id)} className="btn-secondary text-sm py-2 px-3 flex items-center gap-1">
                        <CheckCircle size={13} /> Attend
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past classes */}
        {past.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Past Classes</h3>
            <div className="card overflow-hidden">
              <div className="divide-y divide-gray-50">
                {past.map(c => (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">
                      <Video size={16} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-700 text-sm truncate">{c.title}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(c.scheduled_at).toLocaleDateString()} · {c.duration_minutes} min
                      </p>
                    </div>
                    <span className={`badge ${PLATFORM_COLORS[c.platform] || 'badge-blue'} capitalize`}>{c.platform}</span>
                    {c.is_recorded && c.recording_url && (
                      <a href={c.recording_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-peach-500 hover:underline flex items-center gap-1">
                        <Video size={12} /> Recording
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {classes.length === 0 && !loading && (
          <div className="card flex flex-col items-center justify-center py-20">
            <Video size={48} className="text-gray-200 mb-4" />
            <p className="text-lg font-semibold text-gray-400">No classes scheduled</p>
            {canCreate && <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">Schedule First Class</button>}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Schedule Live Class</h3>
              <button onClick={() => setShowCreate(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Class title *" className="input" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" rows={2} className="input resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Platform</label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="input">
                    {['zoom', 'meet', 'teams', 'other'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Duration (min)</label>
                  <input value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: +e.target.value }))} type="number" className="input" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Date & Time *</label>
                <input value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} type="datetime-local" className="input" />
              </div>
              <input value={form.meeting_link} onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))} placeholder="Meeting link (Zoom/Meet URL)" className="input" />
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1">{saving ? 'Scheduling...' : 'Schedule'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
