'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { gamAPI, cmsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import {
  Trophy, Star, Zap, Gift, Target, Flame,
  CheckCircle, Lock, Plus, Award, TrendingUp, RefreshCw,
  Crown, Shield, Sparkles, X
} from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

type GamTab = 'overview' | 'challenges' | 'rewards' | 'badges';

const LEVEL_NAMES = ['', 'Beginner', 'Explorer', 'Learner', 'Practitioner', 'Skilled', 'Expert', 'Master', 'Champion', 'Legend', 'Elite'];
const LEVEL_COLORS = ['', '#9ca3af', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#06b6d4', '#eab308'];

export default function GamificationPage() {
  const { user } = useAuthStore();
  const isAdmin = ['super_admin', 'org_admin', 'manager'].includes(user?.role || '');

  const [tab, setTab] = useState<GamTab>('overview');
  const [dashboard, setDashboard] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  // Admin modals
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [showCreateReward, setShowCreateReward] = useState(false);
  const [showAwardPoints, setShowAwardPoints] = useState(false);
  const [challengeForm, setChallengeForm] = useState({
    title: '', description: '', challenge_type: 'complete_courses',
    target_value: 3, points_reward: 100, ends_at: '',
  });
  const [rewardForm, setRewardForm] = useState({
    title: '', description: '', points_cost: 500,
    reward_type: 'voucher', reward_value: '', icon_url: '',
  });
  const [awardForm, setAwardForm] = useState({ user_id: '', points: 50, reason: '' });
  const [saving, setSaving] = useState(false);

  const fetchAll = () => {
    setLoading(true);
    Promise.allSettled([
      gamAPI.getDashboard().then(r => setDashboard(r.data)),
      gamAPI.getChallenges().then(r => setChallenges(r.data)),
      gamAPI.getRewards().then(r => setRewards(r.data)),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const joinChallenge = async (id: string) => {
    try {
      await gamAPI.joinChallenge(id);
      toast.success('Challenge joined!');
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to join');
    }
  };

  const redeemReward = async (id: string, title: string) => {
    setRedeeming(id);
    try {
      const { data } = await gamAPI.redeemReward(id);
      toast.success(data.message);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Redemption failed');
    } finally { setRedeeming(null); }
  };

  const createChallenge = async () => {
    setSaving(true);
    try {
      await cmsAPI.createChallenge(challengeForm);
      toast.success('Challenge created!');
      setShowCreateChallenge(false);
      fetchAll();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const createReward = async () => {
    setSaving(true);
    try {
      await cmsAPI.createReward(rewardForm);
      toast.success('Reward created!');
      setShowCreateReward(false);
      fetchAll();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const awardPoints = async () => {
    if (!awardForm.user_id || !awardForm.points) return toast.error('Fill all fields');
    setSaving(true);
    try {
      await gamAPI.awardPoints(awardForm);
      toast.success(`${awardForm.points} points awarded!`);
      setShowAwardPoints(false);
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const p = dashboard?.profile || {};
  const level = p.level || 1;
  const levelName = LEVEL_NAMES[Math.min(level, 10)] || 'Elite';
  const levelColor = LEVEL_COLORS[Math.min(level, 10)] || '#eab308';

  const TABS = [
    { id: 'overview',   icon: Trophy,  label: 'Overview' },
    { id: 'challenges', icon: Target,  label: 'Challenges' },
    { id: 'rewards',    icon: Gift,    label: 'Rewards Shop' },
    { id: 'badges',     icon: Award,   label: 'Badges' },
  ] as const;

  if (loading) return (
    <DashboardLayout title="Gamification">
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-peach-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title="Gamification">
      <div className="space-y-5">
        {/* Hero card */}
        <div className="rounded-2xl overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${levelColor}22, ${levelColor}44)`, border: `1px solid ${levelColor}44` }}>
          <div className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-lg" style={{ background: `${levelColor}22`, border: `2px solid ${levelColor}` }}>
                  {level >= 8 ? '👑' : level >= 6 ? '🏆' : level >= 4 ? '⭐' : '🎯'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shadow" style={{ background: levelColor }}>
                  {level}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Current Level</p>
                <h2 className="text-2xl font-black text-gray-900">{levelName}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1.5">
                    <Star size={14} style={{ color: levelColor }} />
                    <span className="font-bold text-gray-800">{p.total_points || 0}</span>
                    <span className="text-sm text-gray-400">pts</span>
                  </div>
                  {p.streak_days > 0 && (
                    <div className="flex items-center gap-1 text-orange-500">
                      <Flame size={14} />
                      <span className="text-sm font-semibold">{p.streak_days} day streak</span>
                    </div>
                  )}
                  <div className="text-sm text-gray-400">Rank #{dashboard?.rank || '—'}</div>
                </div>
              </div>
            </div>

            <div className="hidden md:block text-right">
              <p className="text-sm text-gray-500 mb-1">{dashboard?.next_level_points} pts to next level</p>
              <div className="w-48">
                <div className="progress-bar h-2">
                  <div className="progress-fill h-full" style={{ width: `${dashboard?.level_progress || 0}%`, background: `linear-gradient(90deg, ${levelColor}, ${levelColor}cc)` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{dashboard?.level_progress || 0}% to Level {level + 1}</p>
              </div>
            </div>

            {isAdmin && (
              <button onClick={() => setShowAwardPoints(true)}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: levelColor }}>
                <Plus size={14} /> Award Points
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between">
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
          {isAdmin && tab === 'challenges' && (
            <button onClick={() => setShowCreateChallenge(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={14} /> New Challenge
            </button>
          )}
          {isAdmin && tab === 'rewards' && (
            <button onClick={() => setShowCreateReward(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={14} /> New Reward
            </button>
          )}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Stats */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Points',   value: p.total_points || 0,        icon: Star,    color: 'bg-yellow-50 text-yellow-500' },
                { label: 'Current Level',  value: `L${level}`,                icon: TrendingUp, color: 'bg-blue-50 text-blue-500' },
                { label: 'Badges Earned',  value: dashboard?.earned_badges?.length || 0, icon: Award, color: 'bg-purple-50 text-purple-500' },
                { label: 'Streak Days',    value: p.streak_days || 0,         icon: Flame,   color: 'bg-orange-50 text-orange-500' },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="stat-card">
                    <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                      <Icon size={16} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Recent activity */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-3">Recent Activity</h3>
              <div className="space-y-2.5">
                {dashboard?.recent_activity?.map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-peach-50 flex items-center justify-center shrink-0">
                      <Zap size={12} className="text-peach-500" />
                    </div>
                    <p className="text-xs text-gray-600 flex-1 truncate">{a.description}</p>
                    <span className="text-xs font-bold text-peach-500 shrink-0">+{a.points}</span>
                  </div>
                ))}
                {!dashboard?.recent_activity?.length && (
                  <p className="text-sm text-gray-400 text-center py-4">No activity yet</p>
                )}
              </div>
            </div>

            {/* Active challenges */}
            {dashboard?.active_challenges?.length > 0 && (
              <div className="card p-5 lg:col-span-3">
                <h3 className="font-semibold text-gray-800 mb-3">Active Challenges</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dashboard.active_challenges.map((c: any) => (
                    <div key={c.challenge_id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-gray-800 text-sm">{c.title}</p>
                        {c.completed && <CheckCircle size={16} className="text-green-500 shrink-0" />}
                      </div>
                      <div className="progress-bar mb-1.5">
                        <div className="progress-fill" style={{ width: `${Math.min(((c.progress || 0) / (c.target_value || 1)) * 100, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{c.progress || 0}/{c.target_value}</span>
                        <span className="text-peach-500 font-semibold">+{c.points_reward} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CHALLENGES TAB ───────────────────────────────── */}
        {tab === 'challenges' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {challenges.length === 0 ? (
              <div className="col-span-full card flex flex-col items-center justify-center py-20">
                <Target size={40} className="text-gray-200 mb-3" />
                <p className="text-gray-400">No challenges yet</p>
                {isAdmin && <button onClick={() => setShowCreateChallenge(true)} className="btn-primary mt-3 text-sm">Create First Challenge</button>}
              </div>
            ) : challenges.map(c => (
              <div key={c.id} className={`card p-5 ${c.completed ? 'opacity-75' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                    <Target size={18} className="text-orange-500" />
                  </div>
                  {c.completed
                    ? <span className="badge badge-green text-xs flex items-center gap-1"><CheckCircle size={11} /> Done</span>
                    : c.ends_at
                      ? <span className="badge badge-yellow text-xs">{new Date(c.ends_at).toLocaleDateString()}</span>
                      : <span className="badge badge-blue text-xs">Active</span>
                  }
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">{c.title}</h3>
                {c.description && <p className="text-sm text-gray-400 mb-3 line-clamp-2">{c.description}</p>}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress: {c.progress || 0}/{c.target_value}</span>
                    <span className="font-semibold text-peach-500">+{c.points_reward} pts</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(((c.progress||0)/(c.target_value||1))*100, 100)}%` }} />
                  </div>
                </div>
                {!c.enrolled && !c.completed && (
                  <button onClick={() => joinChallenge(c.id)} className="btn-primary w-full text-sm py-2 flex items-center justify-center gap-2">
                    <Zap size={13} /> Join Challenge
                  </button>
                )}
                {c.enrolled && !c.completed && (
                  <p className="text-xs text-center text-gray-400">In progress — keep going! 💪</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── REWARDS SHOP TAB ─────────────────────────────── */}
        {tab === 'rewards' && (
          <div className="space-y-4">
            <div className="card p-3 flex items-center gap-3 bg-yellow-50 border-yellow-200">
              <Star size={18} className="text-yellow-500 shrink-0" />
              <p className="text-sm text-yellow-700">You have <strong>{p.total_points || 0} points</strong> to spend</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {rewards.length === 0 ? (
                <div className="col-span-full card flex flex-col items-center justify-center py-20">
                  <Gift size={40} className="text-gray-200 mb-3" />
                  <p className="text-gray-400">No rewards in the shop yet</p>
                  {isAdmin && <button onClick={() => setShowCreateReward(true)} className="btn-primary mt-3 text-sm">Add First Reward</button>}
                </div>
              ) : rewards.map(r => {
                const canAfford = (p.total_points || 0) >= r.points_cost;
                return (
                  <div key={r.id} className={`card p-5 ${r.redeemed ? 'opacity-60' : ''}`}>
                    <div className="text-4xl mb-3">{r.icon_url || '🎁'}</div>
                    <h3 className="font-semibold text-gray-800 mb-1">{r.title}</h3>
                    {r.description && <p className="text-sm text-gray-400 mb-3 line-clamp-2">{r.description}</p>}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1 font-bold text-gray-900">
                        <Star size={15} className="text-yellow-500" />
                        {r.points_cost} pts
                      </div>
                      {r.quantity && <span className="text-xs text-gray-400">{r.quantity - r.redeemed_count} left</span>}
                    </div>
                    <button
                      onClick={() => !r.redeemed && redeemReward(r.id, r.title)}
                      disabled={r.redeemed || !canAfford || redeeming === r.id}
                      className={`w-full py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2
                        ${r.redeemed ? 'bg-green-50 text-green-600 cursor-default'
                          : canAfford ? 'bg-peach-500 text-white hover:bg-peach-600'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                      {redeeming === r.id ? <RefreshCw size={14} className="animate-spin" />
                        : r.redeemed ? <><CheckCircle size={14} /> Redeemed</>
                        : canAfford ? <><Gift size={14} /> Redeem</>
                        : <><Lock size={14} /> Need {r.points_cost - (p.total_points||0)} more pts</>
                      }
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── BADGES TAB ───────────────────────────────────── */}
        {tab === 'badges' && (
          <div className="space-y-5">
            {dashboard?.earned_badges?.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" /> Earned ({dashboard.earned_badges.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                  {dashboard.earned_badges.map((b: any) => (
                    <div key={b.id} className="card p-4 flex flex-col items-center text-center border-green-100 bg-green-50/30">
                      <div className="text-4xl mb-2">{b.icon_url || '🏅'}</div>
                      <p className="font-semibold text-gray-800 text-xs">{b.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{b.description}</p>
                      <span className="badge badge-green text-xs mt-2">Earned</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Lock size={16} className="text-gray-400" /> All Badges
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                {[
                  { icon: '🎉', name: 'First Login',      description: 'Log in for the first time' },
                  { icon: '📚', name: 'Course Completer', description: 'Complete your first course' },
                  { icon: '🎯', name: 'Quiz Master',      description: 'Pass 5 quizzes' },
                  { icon: '🔥', name: '7-Day Streak',     description: '7 days in a row' },
                  { icon: '🏆', name: 'Top Performer',    description: 'Reach top 3 on leaderboard' },
                  { icon: '📋', name: 'SOP Champion',     description: 'Complete 10 SOPs' },
                  { icon: '⭐', name: 'Point Collector',  description: 'Earn 1000 points' },
                  { icon: '👑', name: 'Elite Learner',    description: 'Reach Level 10' },
                ].map((b, i) => {
                  const earned = dashboard?.earned_badges?.some((eb: any) => eb.name === b.name);
                  return (
                    <div key={i} className={`card p-4 flex flex-col items-center text-center ${earned ? 'border-green-100' : 'opacity-50'}`}>
                      <div className="text-4xl mb-2">{b.icon}</div>
                      <p className="font-semibold text-gray-800 text-xs">{b.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{b.description}</p>
                      {earned
                        ? <span className="badge badge-green text-xs mt-2">Earned</span>
                        : <span className="badge badge-yellow text-xs mt-2">Locked</span>
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Challenge Modal */}
      {showCreateChallenge && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Create Challenge</h3>
              <button onClick={() => setShowCreateChallenge(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={challengeForm.title} onChange={e => setChallengeForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Challenge title *" className="input" />
              <textarea value={challengeForm.description} onChange={e => setChallengeForm(f => ({ ...f, description: e.target.value }))}
                rows={2} className="input resize-none" placeholder="Description" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
                  <select value={challengeForm.challenge_type} onChange={e => setChallengeForm(f => ({ ...f, challenge_type: e.target.value }))} className="input">
                    {[
                      { value: 'complete_courses', label: 'Complete Courses' },
                      { value: 'pass_quizzes',     label: 'Pass Quizzes' },
                      { value: 'login_streak',     label: 'Login Streak' },
                      { value: 'earn_points',      label: 'Earn Points' },
                    ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Target</label>
                  <input value={challengeForm.target_value} onChange={e => setChallengeForm(f => ({ ...f, target_value: +e.target.value }))}
                    type="number" min={1} className="input" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Points Reward</label>
                  <input value={challengeForm.points_reward} onChange={e => setChallengeForm(f => ({ ...f, points_reward: +e.target.value }))}
                    type="number" min={1} className="input" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">End Date (optional)</label>
                  <input value={challengeForm.ends_at} onChange={e => setChallengeForm(f => ({ ...f, ends_at: e.target.value }))}
                    type="datetime-local" className="input text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCreateChallenge(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={createChallenge} disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Reward Modal */}
      {showCreateReward && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Create Reward</h3>
              <button onClick={() => setShowCreateReward(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={rewardForm.title} onChange={e => setRewardForm(f => ({ ...f, title: e.target.value }))} placeholder="Reward title *" className="input" />
              <textarea value={rewardForm.description} onChange={e => setRewardForm(f => ({ ...f, description: e.target.value }))}
                rows={2} className="input resize-none" placeholder="Description" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Points Cost</label>
                  <input value={rewardForm.points_cost} onChange={e => setRewardForm(f => ({ ...f, points_cost: +e.target.value }))}
                    type="number" min={1} className="input" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Reward Type</label>
                  <select value={rewardForm.reward_type} onChange={e => setRewardForm(f => ({ ...f, reward_type: e.target.value }))} className="input">
                    {['voucher','gift card','certificate','extra leave','custom'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <input value={rewardForm.reward_value} onChange={e => setRewardForm(f => ({ ...f, reward_value: e.target.value }))}
                placeholder="Reward value (e.g. ₹500 Amazon voucher code)" className="input" />
              <input value={rewardForm.icon_url} onChange={e => setRewardForm(f => ({ ...f, icon_url: e.target.value }))}
                placeholder="Emoji icon (e.g. 🎁) or image URL" className="input" />
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCreateReward(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={createReward} disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Award Points Modal */}
      {showAwardPoints && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Award Points</h3>
              <button onClick={() => setShowAwardPoints(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={awardForm.user_id} onChange={e => setAwardForm(f => ({ ...f, user_id: e.target.value }))}
                placeholder="User ID (from Team page)" className="input font-mono text-sm" />
              <input value={awardForm.points} onChange={e => setAwardForm(f => ({ ...f, points: +e.target.value }))}
                type="number" min={1} className="input" placeholder="Points to award" />
              <input value={awardForm.reason} onChange={e => setAwardForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Reason (shown in activity feed)" className="input" />
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAwardPoints(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={awardPoints} disabled={saving} className="btn-primary flex-1">{saving ? 'Awarding...' : 'Award Points'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
