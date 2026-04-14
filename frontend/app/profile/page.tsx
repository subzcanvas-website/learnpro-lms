'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { certificatesAPI, gamificationAPI, coursesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';
import { BookOpen, Award, Zap, Star, TrendingUp, CheckCircle, Clock } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);

  useEffect(() => {
    gamificationAPI.getProfile().then(r => setProfile(r.data)).catch(() => {});
    coursesAPI.getAll().then(r => {
      setEnrollments(r.data.filter((c: any) => c.enrollment_count > 0));
    }).catch(() => {});
    certificatesAPI.getAll().then(r => setCerts(r.data)).catch(() => {});
  }, []);

  const stats = [
    { label: 'Courses Enrolled', value: enrollments.length, icon: BookOpen, color: 'from-blue-400 to-blue-600' },
    { label: 'Certificates', value: certs.length, icon: Award, color: 'from-yellow-400 to-yellow-600' },
    { label: 'Total Points', value: profile?.total_points || 0, icon: Star, color: 'from-peach-400 to-primary-600' },
    { label: 'Current Level', value: profile?.level || 1, icon: TrendingUp, color: 'from-green-400 to-green-600' },
  ];

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile header */}
        <div className="card p-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-peach-300 to-primary-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-gray-400 text-sm capitalize mt-0.5">{user?.role?.replace('_', ' ')} · {user?.email || user?.phone}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className="badge badge-peach">Level {profile?.level || 1}</span>
              {profile?.level_name && <span className="badge badge-blue">{profile.level_name}</span>}
              {profile?.streak_days > 0 && (
                <span className="badge badge-green">🔥 {profile.streak_days} day streak</span>
              )}
            </div>
          </div>
          {profile?.total_points > 0 && (
            <div className="text-right">
              <p className="text-3xl font-black text-peach-500">{profile.total_points}</p>
              <p className="text-xs text-gray-400">total points</p>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="stat-card text-center">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mx-auto mb-2`}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* My courses */}
        {enrollments.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">My Learning</h3>
            <div className="space-y-3">
              {enrollments.map((c: any) => (
                <Link key={c.id} href={`/courses/${c.id}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-peach-50 flex items-center justify-center">
                    <BookOpen size={16} className="text-peach-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate group-hover:text-peach-500 transition-colors">{c.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="progress-bar w-24 h-1.5">
                        <div className="progress-fill" style={{ width: `${c.completion_pct || 0}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{Math.round(c.completion_pct || 0)}%</span>
                    </div>
                  </div>
                  {c.completion_pct === 100 && <CheckCircle size={16} className="text-green-500 shrink-0" />}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Certificates */}
        {certs.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Certificates Earned</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {certs.map((cert: any) => (
                <div key={cert.id} className="flex items-center gap-3 p-3 rounded-xl bg-yellow-50 border border-yellow-100">
                  <Award size={20} className="text-yellow-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{cert.course_title}</p>
                    <p className="text-xs text-gray-400">{new Date(cert.issued_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
