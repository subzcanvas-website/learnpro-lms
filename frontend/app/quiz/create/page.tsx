'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { quizzesAPI, coursesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft, Save, Zap, X, Check } from 'lucide-react';

type QType = 'mcq' | 'true_false' | 'multi_select';
interface Question {
  _id: string;
  question_text: string;
  question_type: QType;
  options: string[];
  correct_answers: string[];
  points: number;
}

const genId = () => Math.random().toString(36).slice(2);

export default function QuizCreatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);

  const [meta, setMeta] = useState({
    title: '',
    description: '',
    course_id: '',
    time_limit_minutes: 30,
    pass_percentage: 70,
    max_attempts: 3,
    shuffle_questions: false,
  });

  const [questions, setQuestions] = useState<Question[]>([
    { _id: genId(), question_text: '', question_type: 'mcq', options: ['', '', '', ''], correct_answers: [], points: 1 },
  ]);

  useEffect(() => {
    coursesAPI.getAll().then(r => setCourses(r.data)).catch(() => {});
  }, []);

  const addQuestion = () => setQuestions(qs => [
    ...qs,
    { _id: genId(), question_text: '', question_type: 'mcq', options: ['', '', '', ''], correct_answers: [], points: 1 },
  ]);

  const deleteQuestion = (id: string) => setQuestions(qs => qs.filter(q => q._id !== id));

  const updateQuestion = (id: string, field: string, value: any) =>
    setQuestions(qs => qs.map(q => q._id === id ? { ...q, [field]: value } : q));

  const updateOption = (qId: string, idx: number, value: string) =>
    setQuestions(qs => qs.map(q => {
      if (q._id !== qId) return q;
      const options = [...q.options];
      options[idx] = value;
      return { ...q, options };
    }));

  const addOption = (qId: string) =>
    setQuestions(qs => qs.map(q =>
      q._id === qId ? { ...q, options: [...q.options, ''] } : q
    ));

  const removeOption = (qId: string, idx: number) =>
    setQuestions(qs => qs.map(q => {
      if (q._id !== qId) return q;
      const options = q.options.filter((_, i) => i !== idx);
      const correct = q.correct_answers.filter(a => a !== q.options[idx]);
      return { ...q, options, correct_answers: correct };
    }));

  const toggleCorrect = (qId: string, option: string, type: QType) => {
    setQuestions(qs => qs.map(q => {
      if (q._id !== qId) return q;
      if (type === 'mcq' || type === 'true_false') {
        return { ...q, correct_answers: [option] };
      }
      const already = q.correct_answers.includes(option);
      return {
        ...q,
        correct_answers: already
          ? q.correct_answers.filter(a => a !== option)
          : [...q.correct_answers, option],
      };
    }));
  };

  const handleTypeChange = (qId: string, type: QType) => {
    setQuestions(qs => qs.map(q => {
      if (q._id !== qId) return q;
      const options = type === 'true_false' ? ['True', 'False'] : q.options.length >= 2 ? q.options : ['', '', '', ''];
      return { ...q, question_type: type, options, correct_answers: [] };
    }));
  };

  const handleSave = async (publish = false) => {
    if (!meta.title) return toast.error('Quiz title is required');
    const invalid = questions.findIndex(q => !q.question_text || q.correct_answers.length === 0);
    if (invalid !== -1) return toast.error(`Question ${invalid + 1}: add text and mark correct answer`);

    setSaving(true);
    try {
      const payload = {
        ...meta,
        course_id: meta.course_id || undefined,
        questions: questions.map((q, i) => ({
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options.filter(Boolean),
          correct_answers: q.correct_answers,
          points: q.points,
          order_index: i,
        })),
      };
      const { data } = await quizzesAPI.create(payload);

      // Publish if requested
      if (publish) {
        await quizzesAPI.publish(data.id);
      }

      toast.success(publish ? 'Quiz published!' : 'Quiz saved as draft!');
      router.push('/quiz');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const totalPoints = questions.reduce((s, q) => s + q.points, 0);

  return (
    <DashboardLayout title="Create Quiz">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/quiz')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-peach-500 transition-colors">
            <ArrowLeft size={16} /> Back to Quizzes
          </button>
          <div className="flex gap-2">
            <button onClick={() => handleSave(false)} disabled={saving} className="btn-secondary flex items-center gap-2 text-sm">
              <Save size={14} /> Save Draft
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
              {saving ? 'Publishing...' : <><Zap size={14} /> Publish Quiz</>}
            </button>
          </div>
        </div>

        {/* Quiz Meta */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Quiz Settings</h3>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Quiz Title *</label>
            <input value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))}
              placeholder="e.g. Data Security Assessment" className="input text-base font-medium" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Description</label>
            <textarea value={meta.description} onChange={e => setMeta(m => ({ ...m, description: e.target.value }))}
              rows={2} className="input resize-none" placeholder="What is this quiz about?" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Linked Course</label>
              <select value={meta.course_id} onChange={e => setMeta(m => ({ ...m, course_id: e.target.value }))} className="input">
                <option value="">None</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Time Limit (min)</label>
              <input value={meta.time_limit_minutes} onChange={e => setMeta(m => ({ ...m, time_limit_minutes: +e.target.value }))}
                type="number" min={1} className="input" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Pass % Required</label>
              <input value={meta.pass_percentage} onChange={e => setMeta(m => ({ ...m, pass_percentage: +e.target.value }))}
                type="number" min={1} max={100} className="input" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Max Attempts</label>
              <input value={meta.max_attempts} onChange={e => setMeta(m => ({ ...m, max_attempts: +e.target.value }))}
                type="number" min={1} className="input" />
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <div onClick={() => setMeta(m => ({ ...m, shuffle_questions: !m.shuffle_questions }))}
              className={`w-10 h-5 rounded-full transition-colors ${meta.shuffle_questions ? 'bg-peach-500' : 'bg-gray-200'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5 ml-0.5 ${meta.shuffle_questions ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-gray-600">Shuffle questions for each attempt</span>
          </label>
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-4 px-4 py-3 bg-peach-50 border border-peach-100 rounded-xl text-sm text-peach-700">
          <Zap size={15} />
          <span><strong>{questions.length}</strong> questions</span>
          <span>·</span>
          <span><strong>{totalPoints}</strong> total points</span>
          <span>·</span>
          <span><strong>{meta.time_limit_minutes} min</strong> time limit</span>
          <span>·</span>
          <span>Pass at <strong>{meta.pass_percentage}%</strong></span>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={q._id} className="card p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-peach-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {qi + 1}
                  </span>
                  <select value={q.question_type} onChange={e => handleTypeChange(q._id, e.target.value as QType)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-peach-400 bg-white">
                    <option value="mcq">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                    <option value="multi_select">Multi-Select</option>
                  </select>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">Points:</span>
                    <input value={q.points} onChange={e => updateQuestion(q._id, 'points', +e.target.value)}
                      type="number" min={1} className="w-14 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-peach-400 text-center" />
                  </div>
                </div>
                {questions.length > 1 && (
                  <button onClick={() => deleteQuestion(q._id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Question text */}
              <textarea
                value={q.question_text}
                onChange={e => updateQuestion(q._id, 'question_text', e.target.value)}
                placeholder={`Question ${qi + 1}...`}
                rows={2}
                className="input resize-none mb-4 font-medium"
              />

              {/* Options */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {q.question_type === 'multi_select' ? 'Options (select all correct)' : 'Options (select one correct)'}
                </p>
                {q.options.map((opt, oi) => {
                  const isCorrect = q.correct_answers.includes(opt);
                  return (
                    <div key={oi} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all
                      ${isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-gray-50/50'}`}>
                      <button
                        onClick={() => opt && toggleCorrect(q._id, opt, q.question_type)}
                        title="Mark as correct"
                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all
                          ${isCorrect ? 'bg-green-500 border-green-500' : 'border-2 border-gray-300 hover:border-green-400'}`}
                      >
                        {isCorrect && <Check size={11} className="text-white" strokeWidth={3} />}
                      </button>
                      <input
                        value={opt}
                        onChange={e => updateOption(q._id, oi, e.target.value)}
                        placeholder={`Option ${oi + 1}`}
                        disabled={q.question_type === 'true_false'}
                        className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-300 disabled:cursor-default"
                      />
                      {q.question_type !== 'true_false' && q.options.length > 2 && (
                        <button onClick={() => removeOption(q._id, oi)} className="text-gray-300 hover:text-red-400 transition-colors">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {q.question_type !== 'true_false' && q.options.length < 6 && (
                  <button onClick={() => addOption(q._id)} className="text-xs text-peach-500 hover:text-peach-600 flex items-center gap-1 mt-1 transition-colors">
                    <Plus size={12} /> Add option
                  </button>
                )}
                {q.correct_answers.length === 0 && (
                  <p className="text-xs text-orange-500 flex items-center gap-1 mt-1">⚠ Click an option to mark it as correct</p>
                )}
              </div>
            </div>
          ))}

          {/* Add question button */}
          <button
            onClick={addQuestion}
            className="w-full border-2 border-dashed border-gray-200 hover:border-peach-300 hover:bg-peach-50/30 rounded-xl p-4 flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-peach-500 transition-all"
          >
            <Plus size={16} /> Add Question
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
