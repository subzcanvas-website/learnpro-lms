'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { adminAPI, coursesAPI, gamificationAPI, api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import {
  Users, BookOpen, Zap, TrendingUp, Star, Activity,
  ArrowUp, Trophy, Clock, CheckCircle, Play, Award
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const weekActivity = [
  { day: 'Mon', logins: 45, completions: 12 },
  { day: 'Tue', logins: 62, completions: 18 },
  { day: 'Wed', logins: 58, completions: 22 },
  { day: 'Thu', logins: 71, completions: 15 },
  { day: 'Fri', logins: 83, completions: 30 },
  { day: 'Sat', logins: 34, completions: 8 },
  { day: 'Sun', logins: 28, completions: 6 },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = ['super_admin', 'org_admin', 'manager'].includes(user?.role || '');
  const [adminData, setAdminData] = useState<any>(null);
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [myCerts, setMyCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p: Promise<any>[] = [
      coursesAPI.getAll().then(r => setMyCourses(r.data.slice(0, 4))).catch(() => {}),
      gamificationAPI.getProfile().then(r => setMyProfile(r.data)).catch(() => {}),
      api.get('/certificates').then(r => setMyCerts(r.data)).catch(() => {}),
    ];
    if (isAdmin) p.push(adminAPI.getDashboard().then(r => setAdminData(r.data)).catch(() => {}));
    Promise.allSettled(p).finally(() => setLoading(false));
  }, [isAdmin]);

  const s = adminData?.stats;

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">

        {/* Welcome banner */}
        <div className="rounded-2xl bg-gradient-to-r from-[#1a1a2e] to-[#16213e] p-6 flex items-center justify-between relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-white/50 text-sm mb-1">Welcome back 👋</p>
            <h2 className="text-2xl font-bold text-white mb-1">{user?.name || 'Learner'}</h2>
            <p className="text-white/40 text-sm capitalize">{user?.role?.replace('_', ' ')}</p>
            {myProfile?.total_points > 0 && (
              <span className="inline-flex items-center gap-1.5 mt-3 bg-peach-500/20 text-peach-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-peach-500/30">
                <Star size={11} /> {myProfile.total_points} pts · Level {myProfile.level}
              </span>
            )}
          </div>
          <div className="hidden md:flex items-center gap-2 relative z-10">
            <Link href="/courses" className="btn-primary flex items-center gap-2 text-sm py-2">
              <Play size={13} /> Continue Learning
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-xl border border-white/10 transition-colors">
              <Trophy size={13} /> Leaderboard
            </Link>
          </div>
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-peach-500/10 pointer-events-none" />
          <div className="absolute -right-4 -bottom-10 w-52 h-52 rounded-full bg-blue-500/8 pointer-events-none" />
        </div>

        {/* Admin org stats */}
        {isAdmin && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Users', value: s?.users?.total, sub: `${s?.users?.active ?? 0} active`, icon: Users, c: 'from-blue-400 to-blue-600' },
              { label: 'Courses', value: s?.courses?.total, sub: `${s?.courses?.published ?? 0} live`, icon: BookOpen, c: 'from-peach-400 to-primary-600' },
              { label: 'Quizzes', value: s?.quizzes?.total, sub: 'total', icon: Zap, c: 'from-violet-400 to-violet-600' },
              { label: 'Avg Completion', value: `${Math.round(s?.enrollments?.avg_completion ?? 0)}%`, sub: `${s?.enrollments?.total ?? 0} enrolled`, icon: TrendingUp, c: 'from-green-400 to-green-600' },
              { label: 'Points', value: s?.points?.total, sub: 'platform', icon: Star, c: 'from-yellow-400 to-yellow-600' },
              { label: 'New Leads', value: s?.leads?.new_leads, sub: `${s?.leads?.total ?? 0} total`, icon: Activity, c: 'from-pink-400 to-pink-600' },
            ].map(c => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="stat-card">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.c} flex items-center justify-center mb-3`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '—' : (c.value ?? '0')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUp size={11} className="text-green-500" />
                    <span className="text-xs text-green-500 font-medium">+12%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* My personal stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Courses', value: myCourses.length, icon: BookOpen, href: '/courses', cls: 'text-blue-500 bg-blue-50' },
            { label: 'Certificates', value: myCerts.length, icon: Award, href: '/certificates', cls: 'text-yellow-500 bg-yellow-50' },
            { label: 'My Points', value: myProfile?.total_points || 0, icon: Star, href: '/leaderboard', cls: 'text-peach-500 bg-peach-50' },
            { label: 'My Level', value: myProfile?.level || 1, icon: Trophy, href: '/leaderboard', cls: 'text-purple-500 bg-purple-50' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <Link key={s.label} href={s.href} className="stat-card group hover:border-peach-200 transition-all">
                <div className={`w-9 h-9 rounded-xl ${s.cls} flex items-center justify-center mb-3`}>
                  <Icon size={15} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{loading ? '—' : s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5 group-hover:text-peach-500 transition-colors">{s.label} →</p>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart — admin only */}
          {isAdmin && (
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">Platform Activity</h3>
                  <p className="text-xs text-gray-400">Logins & completions this week</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={weekActivity}>
                  <defs>
                    <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff7f5c" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#ff7f5c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,.08)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="logins" name="Logins" stroke="#ff7f5c" fill="url(#gl)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="completions" name="Completions" stroke="#6366f1" fill="url(#gc)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top learners / My courses */}
          <div className={`card p-5 ${!isAdmin ? 'lg:col-span-2' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">{isAdmin ? 'Top Learners' : 'My Courses'}</h3>
              <Link href={isAdmin ? '/leaderboard' : '/courses'} className="text-xs text-peach-500 hover:underline">View all →</Link>
            </div>
            {isAdmin ? (
              <div className="space-y-3">
                {(adminData?.top_learners || []).map((l: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`w-5 text-xs font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-300'}`}>#{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-peach-100 flex items-center justify-center text-xs font-bold text-peach-500">{l.name?.[0]}</div>
                    <p className="text-sm font-medium text-gray-700 flex-1 truncate">{l.name}</p>
                    <span className="text-sm font-bold text-peach-500">{l.total_points}</span>
                  </div>
                ))}
                {!adminData?.top_learners?.length && <p className="text-center text-sm text-gray-400 py-8">No data yet</p>}
              </div>
            ) : (
              <div className="space-y-3">
                {myCourses.map((c: any) => (
                  <Link key={c.id} href={`/courses/${c.id}`} className="flex items-center gap-3 group">
                    <div className="w-9 h-9 rounded-xl bg-peach-50 flex items-center justify-center shrink-0">
                      <BookOpen size={14} className="text-peach-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate group-hover:text-peach-500 transition-colors">{c.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-14 progress-bar h-1"><div className="progress-fill" style={{ width: `0%` }} /></div>
                        <span className="text-xs text-gray-400">0%</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {!myCourses.length && <div className="text-center py-8 text-sm text-gray-400">
                  <BookOpen size={28} className="mx-auto mb-2 text-gray-200" />
                  <Link href="/courses" className="text-peach-500 hover:underline">Browse courses →</Link>
                </div>}
              </div>
            )}
          </div>

          {/* Recent activity — admin */}
          {isAdmin && adminData?.recent_activity?.length > 0 && (
            <div className="card p-5 lg:col-span-3">
              <h3 className="font-semibold text-gray-800 mb-4">Recent Activity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
                {adminData.recent_activity.slice(0, 8).map((a: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-peach-50 flex items-center justify-center text-xs font-bold text-peach-500 shrink-0">{a.user_name?.[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700"><strong>{a.user_name}</strong> {a.description}</p>
                      <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-bold text-peach-500 shrink-0">+{a.points}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/courses/create', label: 'Create Course', icon: BookOpen, roles: ['super_admin', 'org_admin', 'trainer'] },
            { href: '/quiz', label: 'Take a Quiz', icon: Zap, roles: ['all'] },
            { href: '/sops', label: 'View SOPs', icon: Activity, roles: ['all'] },
            { href: '/live-classes', label: 'Live Classes', icon: Clock, roles: ['all'] },
          ].filter(l => l.roles.includes('all') || l.roles.includes(user?.role || '')).map(l => {
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href} className="card p-4 flex items-center gap-3 hover:border-peach-200 hover:bg-peach-50/20 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-peach-50 flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-peach-500" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-peach-600 transition-colors">{l.label}</span>
              </Link>
            );
          })}
        </div>

      </div>
    </DashboardLayout>
  );
}
