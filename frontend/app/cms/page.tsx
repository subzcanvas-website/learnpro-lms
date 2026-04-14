'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { cmsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Settings, Palette, LayoutDashboard, Plus, Trash2,
  Eye, EyeOff, GripVertical, Save, RefreshCw, Type,
  ToggleLeft, ToggleRight, Monitor, X
} from 'lucide-react';

type CMSTab = 'branding' | 'fields' | 'menu' | 'features';

const FIELD_TYPES = [
  { value: 'text',        label: 'Short Text' },
  { value: 'textarea',    label: 'Long Text' },
  { value: 'number',      label: 'Number' },
  { value: 'select',      label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi Select' },
  { value: 'date',        label: 'Date' },
  { value: 'boolean',     label: 'Yes / No' },
  { value: 'url',         label: 'URL / Link' },
];

const ENTITY_TYPES = ['user', 'course', 'quiz', 'certificate'];

export default function CMSPage() {
  const [tab, setTab] = useState<CMSTab>('branding');
  const [settings, setSettings] = useState<any>({
    brand_name: 'LearnPro', primary_color: '#ff7f5c', secondary_color: '#1a1a2e',
    accent_color: '#6366f1', font_family: 'Inter', sidebar_style: 'dark',
    enable_gamification: true, enable_ai: true, enable_certificates: true, enable_live_classes: true,
    welcome_message: '', footer_text: '', login_tagline: '',
  });
  const [fields, setFields] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState({
    entity_type: 'user', field_name: '', field_label: '', field_type: 'text',
    is_required: false, placeholder: '', help_text: '', field_options: [] as string[],
  });
  const [optionInput, setOptionInput] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('user');

  useEffect(() => {
    cmsAPI.getSettings().then(r => { if (r.data && Object.keys(r.data).length) setSettings((s: any) => ({ ...s, ...r.data })); }).catch(() => {});
    cmsAPI.getMenu().then(r => setMenu(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    cmsAPI.getFields({ entity_type: selectedEntity }).then(r => setFields(r.data)).catch(() => {});
  }, [selectedEntity]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await cmsAPI.updateSettings(settings);
      toast.success('Settings saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const saveMenu = async () => {
    setSaving(true);
    try {
      await cmsAPI.saveMenu({ menu_config: menu });
      toast.success('Menu saved!');
    } catch { toast.error('Failed to save menu'); }
    finally { setSaving(false); }
  };

  const addField = async () => {
    if (!newField.field_name || !newField.field_label) return toast.error('Name and label required');
    try {
      await cmsAPI.createField({
        ...newField,
        field_name: newField.field_name.toLowerCase().replace(/\s+/g, '_'),
      });
      toast.success('Field added!');
      setShowAddField(false);
      setNewField({ entity_type: selectedEntity, field_name: '', field_label: '', field_type: 'text', is_required: false, placeholder: '', help_text: '', field_options: [] });
      const r = await cmsAPI.getFields({ entity_type: selectedEntity });
      setFields(r.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add field');
    }
  };

  const deleteField = async (id: string) => {
    if (!confirm('Delete this field?')) return;
    try {
      await cmsAPI.deleteField(id);
      setFields(f => f.filter(x => x.id !== id));
      toast.success('Field deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const toggleMenuItem = (id: string) => {
    setMenu(m => m.map(item => item.id === id ? { ...item, visible: !item.visible } : item));
  };

  const ColorPicker = ({ label, value, onChange }: any) => (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
        <input value={value} onChange={e => onChange(e.target.value)}
          className="input font-mono text-sm flex-1" placeholder="#ff7f5c" />
      </div>
    </div>
  );

  const Toggle = ({ value, onChange, label }: any) => (
    <button onClick={() => onChange(!value)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all
        ${value ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
      {value ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} className="text-gray-400" />}
      {label}
    </button>
  );

  const TABS = [
    { id: 'branding',  icon: Palette,         label: 'Branding' },
    { id: 'fields',    icon: Type,            label: 'Custom Fields' },
    { id: 'menu',      icon: LayoutDashboard, label: 'Menu Builder' },
    { id: 'features',  icon: Settings,        label: 'Features' },
  ] as const;

  return (
    <DashboardLayout title="CMS Dashboard">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">CMS Dashboard</h2>
            <p className="text-sm text-gray-400 mt-0.5">Customize every aspect of your LMS</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${tab === t.id ? 'bg-white shadow text-peach-500' : 'text-gray-500 hover:text-gray-700'}`}>
                <Icon size={15} />
                <span className="hidden sm:block">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── BRANDING TAB ──────────────────────────────────────── */}
        {tab === 'branding' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div className="card p-5 space-y-4">
                <h3 className="font-semibold text-gray-800">Brand Identity</h3>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Platform Name</label>
                  <input value={settings.brand_name || ''} onChange={e => setSettings((s: any) => ({ ...s, brand_name: e.target.value }))}
                    className="input" placeholder="LearnPro" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Logo URL</label>
                  <input value={settings.brand_logo_url || ''} onChange={e => setSettings((s: any) => ({ ...s, brand_logo_url: e.target.value }))}
                    className="input" placeholder="https://yourlogo.com/logo.png" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Login Page Tagline</label>
                  <input value={settings.login_tagline || ''} onChange={e => setSettings((s: any) => ({ ...s, login_tagline: e.target.value }))}
                    className="input" placeholder="Train smarter. Grow faster." />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Welcome Message (shown on dashboard)</label>
                  <textarea value={settings.welcome_message || ''} onChange={e => setSettings((s: any) => ({ ...s, welcome_message: e.target.value }))}
                    rows={2} className="input resize-none" placeholder="Welcome to your learning journey..." />
                </div>
              </div>

              <div className="card p-5 space-y-4">
                <h3 className="font-semibold text-gray-800">Colours</h3>
                <div className="grid grid-cols-1 gap-3">
                  <ColorPicker label="Primary (buttons, accents)" value={settings.primary_color || '#ff7f5c'}
                    onChange={(v: string) => setSettings((s: any) => ({ ...s, primary_color: v }))} />
                  <ColorPicker label="Sidebar Background" value={settings.secondary_color || '#1a1a2e'}
                    onChange={(v: string) => setSettings((s: any) => ({ ...s, secondary_color: v }))} />
                  <ColorPicker label="Accent (highlights)" value={settings.accent_color || '#6366f1'}
                    onChange={(v: string) => setSettings((s: any) => ({ ...s, accent_color: v }))} />
                </div>
              </div>

              <div className="card p-5 space-y-4">
                <h3 className="font-semibold text-gray-800">Typography & Layout</h3>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Font Family</label>
                  <select value={settings.font_family || 'Inter'} onChange={e => setSettings((s: any) => ({ ...s, font_family: e.target.value }))} className="input">
                    {['Inter','Roboto','Poppins','Open Sans','Nunito','Lato','Source Sans Pro'].map(f => (
                      <option key={f} style={{ fontFamily: f }}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
                <Monitor size={15} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">Live Preview</span>
              </div>
              <div className="p-4 bg-gray-50">
                {/* Mini sidebar preview */}
                <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 flex" style={{ height: 200 }}>
                  <div className="w-32 flex flex-col py-3 px-2 gap-1" style={{ background: settings.secondary_color }}>
                    <div className="flex items-center gap-1.5 px-2 py-1 mb-2">
                      {settings.brand_logo_url
                        ? <img src={settings.brand_logo_url} alt="" className="w-5 h-5 rounded" loading="lazy" />
                        : <div className="w-5 h-5 rounded" style={{ background: settings.primary_color }} />
                      }
                      <span className="text-white text-xs font-bold truncate">{settings.brand_name || 'LearnPro'}</span>
                    </div>
                    {['Dashboard', 'Courses', 'Quizzes'].map(item => (
                      <div key={item} className="px-2 py-1 rounded text-xs text-white/60">{item}</div>
                    ))}
                    <div className="px-2 py-1 rounded text-xs font-medium" style={{ color: settings.primary_color, background: `${settings.primary_color}20` }}>
                      AI Builder
                    </div>
                  </div>
                  <div className="flex-1 bg-white p-3">
                    <div className="text-xs font-bold text-gray-800 mb-1" style={{ fontFamily: settings.font_family }}>
                      {settings.welcome_message || 'Welcome back 👋'}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      {['Courses', 'Points', 'Certs', 'Level'].map(s => (
                        <div key={s} className="rounded-lg p-1.5 text-center" style={{ background: `${settings.primary_color}15` }}>
                          <p className="text-xs font-bold" style={{ color: settings.primary_color }}>—</p>
                          <p className="text-xs text-gray-400">{s}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 rounded-lg py-1.5 px-3 text-xs font-medium text-white text-center"
                      style={{ background: settings.primary_color, fontFamily: settings.font_family }}>
                      Continue Learning →
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <button onClick={saveSettings} disabled={saving}
                  className="btn-primary w-full flex items-center justify-center gap-2">
                  {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? 'Saving...' : 'Save Branding'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CUSTOM FIELDS TAB ─────────────────────────────────── */}
        {tab === 'fields' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {ENTITY_TYPES.map(e => (
                  <button key={e} onClick={() => setSelectedEntity(e)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all
                      ${selectedEntity === e ? 'bg-peach-50 text-peach-600 border border-peach-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
                    {e}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowAddField(true)} className="btn-primary flex items-center gap-2 text-sm">
                <Plus size={14} /> Add Field
              </button>
            </div>

            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700 capitalize">{selectedEntity} Custom Fields</p>
                <p className="text-xs text-gray-400">These fields appear when creating or editing {selectedEntity}s</p>
              </div>
              {fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Type size={36} className="text-gray-200 mb-3" />
                  <p className="text-gray-400 text-sm">No custom fields for {selectedEntity}s yet</p>
                  <button onClick={() => setShowAddField(true)} className="btn-primary mt-3 text-sm">Add First Field</button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {fields.map(f => (
                    <div key={f.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50">
                      <GripVertical size={16} className="text-gray-300 cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800 text-sm">{f.field_label}</span>
                          {f.is_required && <span className="badge badge-red text-xs">Required</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          <span className="font-mono">{f.field_name}</span> · {FIELD_TYPES.find(t => t.value === f.field_type)?.label || f.field_type}
                          {f.help_text && ` · ${f.help_text}`}
                        </p>
                      </div>
                      <span className={`badge ${f.is_visible ? 'badge-green' : 'badge-yellow'} text-xs`}>
                        {f.is_visible ? 'Visible' : 'Hidden'}
                      </span>
                      <button onClick={() => deleteField(f.id)}
                        className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MENU BUILDER TAB ──────────────────────────────────── */}
        {tab === 'menu' && (
          <div className="max-w-xl space-y-4">
            <div className="card overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Sidebar Navigation</p>
                  <p className="text-xs text-gray-400">Toggle visibility of each menu item</p>
                </div>
                <button onClick={saveMenu} disabled={saving} className="btn-primary text-sm py-2 flex items-center gap-1.5">
                  {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                  Save Menu
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {menu.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                    <GripVertical size={16} className="text-gray-300 cursor-grab" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-400">/{item.id}</p>
                    </div>
                    <button onClick={() => toggleMenuItem(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                        ${item.visible ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                      {item.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                      {item.visible ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FEATURES TAB ──────────────────────────────────────── */}
        {tab === 'features' && (
          <div className="max-w-2xl space-y-5">
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Platform Features</h3>
              <p className="text-sm text-gray-400 mb-4">Toggle features on or off for your organization</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'enable_gamification',  label: '🏆 Gamification & Points' },
                  { key: 'enable_ai',             label: '🤖 AI Course Builder' },
                  { key: 'enable_certificates',   label: '🎓 Certificates' },
                  { key: 'enable_live_classes',   label: '🎥 Live Classes' },
                ].map(f => (
                  <Toggle key={f.key} label={f.label} value={settings[f.key]}
                    onChange={(v: boolean) => setSettings((s: any) => ({ ...s, [f.key]: v }))} />
                ))}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Custom CSS</h3>
              <p className="text-sm text-gray-400 mb-3">Advanced: inject custom CSS to override any styles</p>
              <textarea value={settings.custom_css || ''}
                onChange={e => setSettings((s: any) => ({ ...s, custom_css: e.target.value }))}
                rows={6} className="input resize-none font-mono text-sm"
                placeholder="/* Custom CSS */&#10;.sidebar { background: #1a1a2e; }&#10;.btn-primary { border-radius: 4px; }" />
            </div>
            <button onClick={saveSettings} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>

      {/* Add Field Modal */}
      {showAddField && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Add Custom Field</h3>
              <button onClick={() => setShowAddField(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Entity Type</label>
                <select value={newField.entity_type} onChange={e => setNewField(f => ({ ...f, entity_type: e.target.value }))} className="input">
                  {ENTITY_TYPES.map(e => <option key={e} value={e} className="capitalize">{e}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Field Label *</label>
                  <input value={newField.field_label} onChange={e => setNewField(f => ({
                    ...f, field_label: e.target.value,
                    field_name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                  }))} className="input" placeholder="Department" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Field Name *</label>
                  <input value={newField.field_name} onChange={e => setNewField(f => ({ ...f, field_name: e.target.value }))}
                    className="input font-mono text-sm" placeholder="department" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Field Type</label>
                <select value={newField.field_type} onChange={e => setNewField(f => ({ ...f, field_type: e.target.value }))} className="input">
                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {(newField.field_type === 'select' || newField.field_type === 'multiselect') && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Options</label>
                  <div className="flex gap-2 mb-2">
                    <input value={optionInput} onChange={e => setOptionInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && optionInput) { setNewField(f => ({ ...f, field_options: [...f.field_options, optionInput] })); setOptionInput(''); }}}
                      className="input text-sm flex-1" placeholder="Type option and press Enter" />
                    <button onClick={() => { if (optionInput) { setNewField(f => ({ ...f, field_options: [...f.field_options, optionInput] })); setOptionInput(''); }}}
                      className="btn-secondary text-sm px-3">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {newField.field_options.map((o, i) => (
                      <span key={i} className="flex items-center gap-1 badge badge-blue text-xs">
                        {o}
                        <button onClick={() => setNewField(f => ({ ...f, field_options: f.field_options.filter((_, idx) => idx !== i) }))}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Placeholder (optional)</label>
                <input value={newField.placeholder} onChange={e => setNewField(f => ({ ...f, placeholder: e.target.value }))} className="input text-sm" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newField.is_required} onChange={e => setNewField(f => ({ ...f, is_required: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-600">Required field</span>
              </label>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAddField(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={addField} className="btn-primary flex-1">Add Field</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
