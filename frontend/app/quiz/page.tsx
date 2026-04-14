'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { quizzesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  Clock, Zap, CheckCircle, XCircle, AlertTriangle,
  Trophy, ArrowRight, Plus, Eye, EyeOff
} from 'lucide-react';

type Phase = 'list' | 'taking' | 'result';

export default function QuizPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const canCreate = ['super_admin', 'org_admin', 'trainer'].includes(user?.role || '');

  const [phase, setPhase] = useState<Phase>('list');
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const startTime = useRef<number>(0);

  const fetchQuizzes = () => {
    setListLoading(true);
    quizzesAPI.getAll()
      .then(r => setQuizzes(r.data))
      .catch(() => {})
      .finally(() => setListLoading(false));
  };

  useEffect(() => { fetchQuizzes(); }, []);

  const handlePublishToggle = async (quizId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data } = await quizzesAPI.publish(quizId);
      toast.success(data.is_published ? 'Quiz published!' : 'Quiz unpublished');
      fetchQuizzes();
    } catch { toast.error('Failed to update'); }
  };

  const startQuiz = async (quizId: string) => {
    setLoading(true);
    try {
      const { data } = await quizzesAPI.getOne(quizId);
      setActiveQuiz(data);
      setAnswers({});
      setTimeLeft(data.time_limit_minutes * 60);
      startTime.current = Date.now();
      setPhase('taking');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load quiz');
    } finally { setLoading(false); }
  };

  const submitQuiz = useCallback(async () => {
    if (!activeQuiz) return;
    setLoading(true);
    try {
      const timeTaken = Math.round((Date.now() - startTime.current) / 1000);
      const { data } = await quizzesAPI.submit(activeQuiz.id, { answers, time_taken_seconds: timeTaken });
      setResult(data);
      setPhase('result');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Submission failed');
    } finally { setLoading(false); }
  }, [activeQuiz, answers]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'taking') return;
    if (timeLeft <= 0) { submitQuiz(); return; }
    const t = setInterval(() => setTimeLeft(s => {
      if (s <= 1) { clearInterval(t); submitQuiz(); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft, submitQuiz]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const answered = Object.keys(answers).length;
  const total = activeQuiz?.questions?.length || 0;

  // ─── LIST VIEW ───────────────────────────────────────────
  if (phase === 'list') return (
    <DashboardLayout title="Quizzes">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Quizzes</h2>
            <p className="text-sm text-gray-400 mt-0.5">Test your knowledge, earn points</p>
          </div>
          {canCreate && (
            <Link href="/quiz/create" className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Create Quiz
            </Link>
          )}
        </div>

        {listLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => <div key={i} className="card h-52 animate-pulse bg-gray-50" />)}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20">
            <Zap size={48} className="text-gray-200 mb-4" />
            <p className="text-lg font-semibold text-gray-400">No quizzes available</p>
            {canCreate && (
              <Link href="/quiz/create" className="btn-primary mt-4">Create First Quiz</Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {quizzes.map(q => (
              <div key={q.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                    <Zap size={18} className="text-violet-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    {q.last_passed
                      ? <span className="badge badge-green">Passed</span>
                      : q.my_attempts > 0
                        ? <span className="badge badge-yellow">Attempted</span>
                        : <span className="badge badge-blue">New</span>
                    }
                    {canCreate && (
                      <button
                        onClick={(e) => handlePublishToggle(q.id, e)}
                        title={q.is_published ? 'Unpublish' : 'Publish'}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
                          ${q.is_published ? 'text-green-500 hover:bg-red-50 hover:text-red-400' : 'text-gray-300 hover:bg-green-50 hover:text-green-500'}`}
                      >
                        {q.is_published ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-gray-800 mb-1">{q.title}</h3>
                {q.description && <p className="text-sm text-gray-400 mb-3 line-clamp-2">{q.description}</p>}

                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  {[
                    { v: q.question_count, l: 'Questions' },
                    { v: `${q.time_limit_minutes}m`, l: 'Time' },
                    { v: `${q.pass_percentage}%`, l: 'To Pass' },
                  ].map(s => (
                    <div key={s.l} className="bg-gray-50 rounded-lg p-2">
                      <p className="text-sm font-bold text-gray-700">{s.v}</p>
                      <p className="text-xs text-gray-400">{s.l}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {q.my_attempts || 0}/{q.max_attempts} attempts
                  </span>
                  <button
                    onClick={() => startQuiz(q.id)}
                    disabled={loading || (!q.is_published && !canCreate) || (q.my_attempts || 0) >= q.max_attempts}
                    className="btn-primary py-2 px-4 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {(q.my_attempts || 0) >= q.max_attempts
                      ? 'Max attempts'
                      : !q.is_published && !canCreate
                        ? 'Not published'
                        : (q.my_attempts || 0) > 0 ? 'Retry Quiz' : 'Start Quiz'
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );

  // ─── TAKING VIEW ─────────────────────────────────────────
  if (phase === 'taking' && activeQuiz) return (
    <DashboardLayout title={activeQuiz.title}>
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Sticky header */}
        <div className="card p-4 flex items-center gap-3 sticky top-20 z-30 shadow-sm">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 truncate">{activeQuiz.title}</p>
            <p className="text-xs text-gray-400">{answered}/{total} answered</p>
          </div>
          <div className="hidden sm:block w-36">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }} />
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono font-bold text-lg select-none
            ${timeLeft < 60 ? 'bg-red-50 text-red-600 timer-danger' : timeLeft < 300 ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-700'}`}>
            <Clock size={16} />
            {fmt(timeLeft)}
          </div>
        </div>

        {/* Questions */}
        {activeQuiz.questions.map((q: any, idx: number) => (
          <div key={q.id} className="card p-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="w-7 h-7 rounded-full bg-peach-100 text-peach-600 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <p className="text-gray-800 font-medium leading-relaxed">{q.question_text}</p>
            </div>
            <div className="space-y-2 pl-10">
              {q.options.map((opt: string, oi: number) => {
                const sel = q.question_type === 'multi_select'
                  ? (answers[q.id] || []).includes(opt)
                  : answers[q.id] === opt;
                return (
                  <button
                    key={oi}
                    onClick={() => {
                      if (q.question_type === 'multi_select') {
                        const cur = answers[q.id] || [];
                        const next = cur.includes(opt) ? cur.filter((x: string) => x !== opt) : [...cur, opt];
                        setAnswers(a => ({ ...a, [q.id]: next }));
                      } else {
                        setAnswers(a => ({ ...a, [q.id]: opt }));
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm text-left transition-all
                      ${sel ? 'border-peach-400 bg-peach-50 text-peach-700 font-medium' : 'border-gray-200 bg-gray-50 hover:border-peach-200 hover:bg-peach-50/50 text-gray-600'}`}
                  >
                    <span className={`w-5 h-5 rounded${q.question_type === 'multi_select' ? '' : '-full'} border-2 flex items-center justify-center shrink-0 transition-all
                      ${sel ? 'border-peach-500 bg-peach-500' : 'border-gray-300'}`}>
                      {sel && <span className="w-2 h-2 rounded-full bg-white" />}
                    </span>
                    {opt}
                  </button>
                );
              })}
              {q.question_type === 'multi_select' && (
                <p className="text-xs text-gray-400 pl-1">Select all that apply</p>
              )}
            </div>
          </div>
        ))}

        {/* Submit */}
        <div className="card p-4 flex items-center justify-between sticky bottom-4">
          {answered < total && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertTriangle size={15} /> {total - answered} unanswered
            </div>
          )}
          <button onClick={submitQuiz} disabled={loading} className="btn-primary flex items-center gap-2 ml-auto">
            {loading ? 'Submitting...' : <><span>Submit Quiz</span><ArrowRight size={15} /></>}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );

  // ─── RESULT VIEW ─────────────────────────────────────────
  if (phase === 'result' && result) return (
    <DashboardLayout title="Quiz Result">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="card p-8 text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center
            ${result.passed ? 'bg-green-50' : 'bg-red-50'}`}>
            {result.passed ? <Trophy size={36} className="text-green-500" /> : <XCircle size={36} className="text-red-400" />}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {result.passed ? '🎉 You Passed!' : 'Not Quite There'}
          </h2>
          <p className={`text-base font-semibold mb-6 ${result.passed ? 'text-green-600' : 'text-red-500'}`}>
            {result.passed ? 'Great work!' : `Need ${activeQuiz?.pass_percentage}% to pass`}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Score', value: `${result.percentage}%` },
              { label: 'Points', value: result.score },
              { label: 'Attempt #', value: result.attempt?.attempt_number },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Breakdown */}
          <div className="text-left space-y-2 mb-6">
            {Object.entries(result.graded_answers || {}).map(([qId, ga]: [string, any], i: number) => (
              <div key={qId} className={`flex items-center gap-3 p-3 rounded-xl ${ga.correct ? 'bg-green-50' : 'bg-red-50'}`}>
                {ga.correct
                  ? <CheckCircle size={15} className="text-green-500 shrink-0" />
                  : <XCircle size={15} className="text-red-400 shrink-0" />
                }
                <span className="text-sm text-gray-700 flex-1">Question {i + 1}</span>
                <span className={`text-xs font-semibold ${ga.correct ? 'text-green-600' : 'text-red-500'}`}>
                  {ga.correct ? `+${ga.points} pts` : '0 pts'}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={() => { setPhase('list'); fetchQuizzes(); }} className="btn-secondary">Back to Quizzes</button>
            {!result.passed && activeQuiz && (
              <button onClick={() => startQuiz(activeQuiz.id)} className="btn-primary">Try Again</button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );

  return null;
}
