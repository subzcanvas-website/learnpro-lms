'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { gamificationAPI } from '@/lib/api';
import { Trophy, Star, Shield, Zap, Award, Crown } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

const LEVEL_CONFIG: Record<number, { name: string; color: string; icon: any }> = {
  1: { name: 'Beginner', color: 'text-gray-500', icon: Star },
  2: { name: 'Learner', color: 'text-blue-500', icon: Zap },
  3: { name: 'Practitioner', color: 'text-green-500', icon: Shield },
  4: { name: 'Expert', color: 'text-purple-500', icon: Award },
  5: { name: 'Master', color: 'text-yellow-500', icon: Crown },
};

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [board, setBoard] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      gamificationAPI.getLeaderboard(),
      gamificationAPI.getProfile(),
      gamificationAPI.getBadges(),
    ]).then(([lb, pr, bg]) => {
      setBoard(lb.data);
      setProfile(pr.data);
      setBadges(bg.data);
    }).finally(() => setLoading(false));
  }, []);

  const top3 = board.slice(0, 3);
  const rest = board.slice(3);

  const podiumOrder = top3.length === 3
    ? [top3[1], top3[0], top3[2]]
    : top3;

  const podiumHeights = ['h-24', 'h-32', 'h-20'];
  const podiumColors = ['bg-gray-100', 'bg-yellow-100', 'bg-orange-100'];
  const podiumRankColors = ['text-gray-500', 'text-yellow-600', 'text-orange-500'];
  const podiumRanks = [2, 1, 3];

  return (
    <DashboardLayout title="Leaderboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">🏆 Leaderboard</h2>
            <p className="text-sm text-gray-400">Top learners this period</p>
          </div>
          {profile && (
            <div className="card px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-peach-100 flex items-center justify-center text-sm font-bold text-peach-500">
                {user?.name?.[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Your rank</p>
                <p className="text-xs text-gray-400">#{profile.rank || '—'} · {profile.total_points || 0} pts</p>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-peach-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length > 0 && (
              <div className="card p-8">
                <div className="flex items-end justify-center gap-6 mb-6">
                  {podiumOrder.map((p, i) => {
                    if (!p) return <div key={i} className="w-24" />;
                    const LevelIcon = LEVEL_CONFIG[p.level || 1]?.icon || Star;
                    return (
                      <div key={p.user_id} className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-peach-300 to-primary-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                          {p.name?.[0]}
                        </div>
                        <p className="font-semibold text-gray-800 text-sm text-center max-w-20 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.total_points} pts</p>
                        <div className={`${podiumHeights[i]} ${podiumColors[i]} w-24 rounded-t-xl flex items-center justify-center`}>
                          <span className={`text-2xl font-black ${podiumRankColors[i]}`}>#{podiumRanks[i]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Full table */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Full Rankings</h3>
                <span className="text-xs text-gray-400">{board.length} participants</span>
              </div>
              <div className="divide-y divide-gray-50">
                {board.map((entry, i) => {
                  const isMe = entry.user_id === user?.id;
                  const levelCfg = LEVEL_CONFIG[entry.level || 1] || LEVEL_CONFIG[1];
                  const LevelIcon = levelCfg.icon;
                  return (
                    <div key={entry.user_id} className={`flex items-center gap-4 px-5 py-3.5 transition-colors
                      ${isMe ? 'bg-peach-50 border-l-4 border-peach-400' : 'hover:bg-gray-50'}`}>
                      <span className={`w-8 text-center font-bold text-sm
                        ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-500' : i === 2 ? 'text-orange-500' : 'text-gray-400'}`}>
                        #{entry.rank}
                      </span>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-peach-200 to-primary-400 flex items-center justify-center text-white text-sm font-bold">
                        {entry.name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800 text-sm">{entry.name} {isMe && <span className="text-peach-500 text-xs">(You)</span>}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <LevelIcon size={11} className={levelCfg.color} />
                          <span className={`text-xs ${levelCfg.color}`}>{levelCfg.name}</span>
                          {entry.department && <span className="text-xs text-gray-400">· {entry.department}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">{entry.total_points}</p>
                        <p className="text-xs text-gray-400">points</p>
                      </div>
                    </div>
                  );
                })}
                {board.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Trophy size={40} className="text-gray-200 mb-3" />
                    <p className="text-gray-400">No rankings yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Badges */}
            {badges.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4">Badges</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
                  {badges.map(b => (
                    <div key={b.id} className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center
                      ${b.earned ? 'border-peach-200 bg-peach-50' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                        ${b.earned ? 'bg-peach-100' : 'bg-gray-100'}`}>
                        {b.icon_url ? <img src={b.icon_url} alt="" className="w-8 h-8" loading="lazy" /> : '🏅'}
                      </div>
                      <p className="text-xs font-semibold text-gray-700">{b.name}</p>
                      {b.earned && <span className="badge badge-green text-xs">Earned</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
