'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { aiAPI, coursesAPI, modulesAPI, lessonsAPI, quizzesAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Sparkles, BookOpen, Zap, RefreshCw, Check,
  ChevronDown, ChevronRight, AlertTriangle, Settings,
  Wand2, FileText, Award, MessageSquare, ArrowRight
} from 'lucide-react';

type Tab = 'course' | 'quiz' | 'improve' | 'chat';

export default function AIBuilderPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('course');
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Course generation state
  const [courseForm, setCourseForm] = useState({
    topic: '', level: 'beginner', duration_hours: 2,
    target_audience: 'professionals', num_modules: 4, language: 'English',
  });
  const [generatedCourse, setGeneratedCourse] = useState<any>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]));
  const [saving, setSaving] = useState(false);

  // Quiz generation state
  const [quizForm, setQuizForm] = useState({
    topic: '', num_questions: 10, difficulty: 'medium',
    question_types: ['mcq', 'true_false'],
  });
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);

  // Improve content state
  const [improveForm, setImproveForm] = useState({
    content: '', improvement_type: 'clarity', target_level: 'intermediate',
  });
  const [improvedContent, setImprovedContent] = useState('');

  // Chat state
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    aiAPI.getStatus().then(r => setAiStatus(r.data)).catch(() => {});
  }, []);

  const generateCourse = async () => {
    if (!courseForm.topic) return toast.error('Enter a course topic');
    setLoading(true);
    setGeneratedCourse(null);
    try {
      const { data } = await aiAPI.generateCourse(courseForm);
      setGeneratedCourse(data.course);
      toast.success('Course outline generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Generation failed');
    } finally { setLoading(false); }
  };

  const saveCourse = async () => {
    if (!generatedCourse) return;
    setSaving(true);
    try {
      const { data: course } = await coursesAPI.create({
        title: generatedCourse.title,
        description: generatedCourse.description,
        category: generatedCourse.category,
        level: generatedCourse.level,
        is_published: false,
      });
      for (let mi = 0; mi < generatedCourse.modules.length; mi++) {
        const mod = generatedCourse.modules[mi];
        const { data: module } = await modulesAPI.create({
          course_id: course.id, title: mod.title,
          description: mod.description, order_index: mi,
        });
        for (let li = 0; li < (mod.lessons || []).length; li++) {
          const lesson = mod.lessons[li];
          await lessonsAPI.create({
            module_id: module.id, title: lesson.title,
            content_type: lesson.content_type || 'text',
            content_body: lesson.content_body,
            duration_minutes: lesson.duration_minutes || 10,
            order_index: li,
          });
        }
      }
      toast.success('Course saved! Redirecting...');
      setTimeout(() => router.push(`/courses/${course.id}`), 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save course');
    } finally { setSaving(false); }
  };

  const generateQuiz = async () => {
    if (!quizForm.topic) return toast.error('Enter a quiz topic');
    setLoading(true);
    setGeneratedQuiz(null);
    try {
      const { data } = await aiAPI.generateQuiz(quizForm);
      setGeneratedQuiz(data.quiz);
      toast.success('Quiz generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Generation failed');
    } finally { setLoading(false); }
  };

  const saveQuiz = async () => {
    if (!generatedQuiz) return;
    setSaving(true);
    try {
      const { data } = await quizzesAPI.create({
        ...generatedQuiz,
        questions: generatedQuiz.questions,
      });
      await quizzesAPI.publish(data.id);
      toast.success('Quiz published!');
      router.push('/quiz');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save quiz');
    } finally { setSaving(false); }
  };

  const improveContent = async () => {
    if (!improveForm.content) return toast.error('Paste content to improve');
    setLoading(true);
    try {
      const { data } = await aiAPI.improveContent(improveForm);
      setImprovedContent(data.improved_content);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to improve content');
    } finally { setLoading(false); }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    const newHistory = [...chatHistory, { role: 'user', content: msg }];
    setChatHistory(newHistory);
    setChatLoading(true);
    try {
      const { data } = await aiAPI.chat({ message: msg, history: chatHistory });
      setChatHistory([...newHistory, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      toast.error('AI unavailable');
      setChatHistory(newHistory);
    } finally { setChatLoading(false); }
  };

  const TABS = [
    { id: 'course', icon: BookOpen, label: 'Course Builder' },
    { id: 'quiz',   icon: Zap,      label: 'Quiz Generator' },
    { id: 'improve',icon: Wand2,    label: 'Improve Content' },
    { id: 'chat',   icon: MessageSquare, label: 'AI Assistant' },
  ] as const;

  return (
    <DashboardLayout title="AI Builder">
      <div className="space-y-5">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-700 p-6 flex items-center justify-between overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={20} className="text-yellow-300" />
              <span className="text-white/70 text-sm font-medium">Powered by AI</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-0.5">AI Content Builder</h2>
            <p className="text-white/60 text-sm">Generate courses, quizzes, and content in seconds</p>
          </div>
          <div className="relative z-10">
            {aiStatus ? (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                ${aiStatus.configured ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                <span className={`w-2 h-2 rounded-full ${aiStatus.configured ? 'bg-green-400' : 'bg-red-400'}`} />
                {aiStatus.configured ? `${aiStatus.provider === 'claude' ? 'Claude' : 'GPT-4o'} Connected` : 'No AI Key — Add to .env'}
              </div>
            ) : (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            )}
          </div>
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute -right-2 -bottom-8 w-48 h-48 bg-white/5 rounded-full" />
        </div>

        {/* AI not configured warning */}
        {aiStatus && !aiStatus.configured && (
          <div className="card p-4 border-yellow-200 bg-yellow-50 flex items-start gap-3">
            <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800 text-sm">AI API key not configured</p>
              <p className="text-sm text-yellow-700 mt-0.5">
                Add <code className="bg-yellow-100 px-1 rounded">ANTHROPIC_API_KEY</code> or{' '}
                <code className="bg-yellow-100 px-1 rounded">OPENAI_API_KEY</code> to your backend <code className="bg-yellow-100 px-1 rounded">.env</code> file,
                then restart the backend.
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                Get Claude key: console.anthropic.com · Get OpenAI key: platform.openai.com
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${tab === t.id ? 'bg-white shadow text-violet-600' : 'text-gray-500 hover:text-gray-700'}`}>
                <Icon size={15} />
                <span className="hidden sm:block">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── COURSE BUILDER TAB ─────────────────────────────────── */}
        {tab === 'course' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Course Details</h3>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Course Topic *</label>
                <input value={courseForm.topic} onChange={e => setCourseForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="e.g. Customer Service Excellence, Data Security, Leadership Skills"
                  className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Level</label>
                  <select value={courseForm.level} onChange={e => setCourseForm(f => ({ ...f, level: e.target.value }))} className="input">
                    {['beginner','intermediate','advanced'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Duration (hours)</label>
                  <input value={courseForm.duration_hours} onChange={e => setCourseForm(f => ({ ...f, duration_hours: +e.target.value }))}
                    type="number" min={0.5} max={20} step={0.5} className="input" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Number of Modules</label>
                  <input value={courseForm.num_modules} onChange={e => setCourseForm(f => ({ ...f, num_modules: +e.target.value }))}
                    type="number" min={2} max={10} className="input" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Language</label>
                  <select value={courseForm.language} onChange={e => setCourseForm(f => ({ ...f, language: e.target.value }))} className="input">
                    {['English','Hindi','Kannada','Tamil','Telugu','Marathi','Bengali'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Target Audience</label>
                <input value={courseForm.target_audience} onChange={e => setCourseForm(f => ({ ...f, target_audience: e.target.value }))}
                  placeholder="e.g. new employees, sales team, managers" className="input" />
              </div>
              <button onClick={generateCourse} disabled={loading || !aiStatus?.configured}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <><RefreshCw size={16} className="animate-spin" /> Generating...</>
                  : <><Sparkles size={16} /> Generate Course with AI</>}
              </button>
            </div>

            {/* Generated course preview */}
            <div>
              {loading && (
                <div className="card p-8 flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin mb-4" />
                  <p className="text-gray-500 font-medium">AI is building your course...</p>
                  <p className="text-sm text-gray-400 mt-1">Usually takes 15–30 seconds</p>
                </div>
              )}
              {generatedCourse && !loading && (
                <div className="card overflow-hidden">
                  <div className="p-4 bg-violet-50 border-b border-violet-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{generatedCourse.title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{generatedCourse.description}</p>
                      </div>
                      <button onClick={saveCourse} disabled={saving}
                        className="btn-primary shrink-0 flex items-center gap-1.5 text-sm py-2">
                        {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                        {saving ? 'Saving...' : 'Save Course'}
                      </button>
                    </div>
                    {generatedCourse.learning_objectives && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {generatedCourse.learning_objectives.map((obj: string, i: number) => (
                          <span key={i} className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{obj}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {generatedCourse.modules?.map((mod: any, mi: number) => (
                      <div key={mi} className="border-b border-gray-50 last:border-0">
                        <button onClick={() => setExpandedModules(prev => {
                          const n = new Set(Array.from(prev)); n.has(mi) ? n.delete(mi) : n.add(mi); return n;
                        })} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left">
                          {expandedModules.has(mi) ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
                          <span className="font-medium text-gray-800 text-sm">{mi + 1}. {mod.title}</span>
                          <span className="text-xs text-gray-400 ml-auto">{mod.lessons?.length || 0} lessons</span>
                        </button>
                        {expandedModules.has(mi) && (
                          <div className="pl-10 bg-gray-50/50">
                            {mod.lessons?.map((lesson: any, li: number) => (
                              <div key={li} className="flex items-start gap-2 px-4 py-2 border-b border-gray-100 last:border-0">
                                <FileText size={12} className="text-gray-400 mt-1 shrink-0" />
                                <div>
                                  <p className="text-sm font-medium text-gray-700">{lesson.title}</p>
                                  <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{lesson.content_body?.slice(0, 100)}...</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── QUIZ GENERATOR TAB ──────────────────────────────────── */}
        {tab === 'quiz' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Quiz Settings</h3>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Quiz Topic *</label>
                <input value={quizForm.topic} onChange={e => setQuizForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="e.g. Fire Safety Procedures, Excel Basics, Company Policies"
                  className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Number of Questions</label>
                  <input value={quizForm.num_questions} onChange={e => setQuizForm(f => ({ ...f, num_questions: +e.target.value }))}
                    type="number" min={3} max={30} className="input" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Difficulty</label>
                  <select value={quizForm.difficulty} onChange={e => setQuizForm(f => ({ ...f, difficulty: e.target.value }))} className="input">
                    {['easy','medium','hard'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Question Types</label>
                <div className="flex gap-2 flex-wrap">
                  {['mcq','true_false','multi_select'].map(type => {
                    const selected = quizForm.question_types.includes(type);
                    return (
                      <button key={type} onClick={() => setQuizForm(f => ({
                        ...f,
                        question_types: selected
                          ? f.question_types.filter(t => t !== type)
                          : [...f.question_types, type]
                      }))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                          ${selected ? 'bg-violet-100 border-violet-300 text-violet-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                        {type.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button onClick={generateQuiz} disabled={loading || !aiStatus?.configured}
                className="btn-primary w-full flex items-center justify-center gap-2" style={{ background: '#6366f1' }}>
                {loading ? <><RefreshCw size={16} className="animate-spin" /> Generating...</>
                  : <><Zap size={16} /> Generate Quiz with AI</>}
              </button>
            </div>

            {/* Generated quiz preview */}
            <div>
              {loading && (
                <div className="card p-8 flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                  <p className="text-gray-500 font-medium">Generating quiz questions...</p>
                </div>
              )}
              {generatedQuiz && !loading && (
                <div className="card overflow-hidden">
                  <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{generatedQuiz.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {generatedQuiz.questions?.length} questions · {generatedQuiz.time_limit_minutes} min · Pass at {generatedQuiz.pass_percentage}%
                      </p>
                    </div>
                    <button onClick={saveQuiz} disabled={saving}
                      className="btn-primary shrink-0 text-sm py-2 flex items-center gap-1.5" style={{ background: '#6366f1' }}>
                      {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                      {saving ? 'Saving...' : 'Publish Quiz'}
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                    {generatedQuiz.questions?.map((q: any, i: number) => (
                      <div key={i} className="p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i+1}</span>
                          <p className="text-sm font-medium text-gray-800">{q.question_text}</p>
                        </div>
                        <div className="pl-8 space-y-1">
                          {q.options?.map((opt: string, oi: number) => (
                            <div key={oi} className={`text-xs px-2 py-1 rounded flex items-center gap-1.5
                              ${q.correct_answers?.includes(opt) ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-500'}`}>
                              {q.correct_answers?.includes(opt) && <Check size={10} className="text-green-500" />}
                              {opt}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── IMPROVE CONTENT TAB ─────────────────────────────────── */}
        {tab === 'improve' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Improve Existing Content</h3>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Paste your content</label>
                <textarea value={improveForm.content} onChange={e => setImproveForm(f => ({ ...f, content: e.target.value }))}
                  rows={8} className="input resize-none font-mono text-sm"
                  placeholder="Paste lesson text, SOP steps, course description, or any content you want to improve..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Improvement Type</label>
                  <select value={improveForm.improvement_type} onChange={e => setImproveForm(f => ({ ...f, improvement_type: e.target.value }))} className="input">
                    {[
                      { value: 'clarity',    label: 'Make Clearer' },
                      { value: 'expand',     label: 'Expand & Add Detail' },
                      { value: 'simplify',   label: 'Simplify for Beginners' },
                      { value: 'engaging',   label: 'Make More Engaging' },
                      { value: 'structured', label: 'Better Structure' },
                    ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Target Level</label>
                  <select value={improveForm.target_level} onChange={e => setImproveForm(f => ({ ...f, target_level: e.target.value }))} className="input">
                    {['beginner','intermediate','advanced','expert'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={improveContent} disabled={loading || !aiStatus?.configured}
                className="btn-primary w-full flex items-center justify-center gap-2" style={{ background: '#10b981' }}>
                {loading ? <><RefreshCw size={16} className="animate-spin" /> Improving...</>
                  : <><Wand2 size={16} /> Improve Content</>}
              </button>
            </div>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">Improved Version</h3>
                {improvedContent && (
                  <button onClick={() => { navigator.clipboard.writeText(improvedContent); toast.success('Copied!'); }}
                    className="text-xs text-peach-500 hover:underline">Copy</button>
                )}
              </div>
              {loading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-green-200 border-t-green-500 rounded-full animate-spin" />
                </div>
              ) : improvedContent ? (
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-line text-sm bg-gray-50 rounded-xl p-4 max-h-96 overflow-y-auto">
                  {improvedContent}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-300 text-sm">
                  Improved content will appear here
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── AI CHAT TAB ─────────────────────────────────────────── */}
        {tab === 'chat' && (
          <div className="card overflow-hidden flex flex-col" style={{ height: '520px' }}>
            <div className="p-4 border-b border-gray-50 bg-gradient-to-r from-violet-50 to-indigo-50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                <Sparkles size={18} className="text-violet-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">AI Learning Assistant</p>
                <p className="text-xs text-gray-400">Ask anything about course creation, training, or content</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatHistory.length === 0 && (
                <div className="text-center py-8">
                  <Sparkles size={32} className="text-violet-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Ask me anything!</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {[
                      'How do I create an engaging course?',
                      'Best practices for quiz design',
                      'How to write good learning objectives?',
                      'Tips for corporate training content',
                    ].map(q => (
                      <button key={q} onClick={() => { setChatInput(q); }}
                        className="text-xs bg-violet-50 border border-violet-200 text-violet-600 px-3 py-1.5 rounded-full hover:bg-violet-100 transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={13} className="text-violet-600" />
                    </div>
                  )}
                  <div className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                    }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                    <Sparkles size={13} className="text-violet-600" />
                  </div>
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-gray-100 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                placeholder="Ask about course design, training strategies, content writing..."
                className="input flex-1 text-sm" disabled={chatLoading || !aiStatus?.configured} />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim() || !aiStatus?.configured}
                className="w-10 h-10 bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-colors">
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
