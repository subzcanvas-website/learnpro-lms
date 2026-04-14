'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, FileText, Trophy, BarChart2,
  Users, CreditCard, MessageSquare, Video, Award, LogOut,
  Zap, Building2, UserCircle, Sparkles, Settings
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',     roles: ['all'] },
  { href: '/courses',      icon: BookOpen,        label: 'Courses',       roles: ['all'] },
  { href: '/ai-builder',   icon: Sparkles,        label: 'AI Builder',    roles: ['all'] },
  { href: '/sops',         icon: FileText,        label: 'SOPs',          roles: ['all'] },
  { href: '/quiz',         icon: Zap,             label: 'Quizzes',       roles: ['all'] },
  { href: '/live-classes', icon: Video,           label: 'Live Classes',  roles: ['all'] },
  { href: '/certificates', icon: Award,           label: 'Certificates',  roles: ['all'] },
  { href: '/gamification', icon: Trophy,          label: 'Gamification',  roles: ['all'] },
  { href: '/leaderboard',  icon: BarChart2,       label: 'Leaderboard',   roles: ['all'] },
  { href: '/kpi',          icon: BarChart2,       label: 'KPI',           roles: ['super_admin','org_admin','manager'] },
  { href: '/crm',          icon: MessageSquare,   label: 'CRM',           roles: ['super_admin','org_admin','manager'] },
  { href: '/admin',        icon: Users,           label: 'Team',          roles: ['super_admin','org_admin','manager'] },
  { href: '/admin/orgs',   icon: Building2,       label: 'Organizations', roles: ['super_admin'] },
  { href: '/cms',          icon: Settings,        label: 'CMS Settings',  roles: ['super_admin','org_admin'] },
  { href: '/subscription', icon: CreditCard,      label: 'Subscription',  roles: ['super_admin','org_admin'] },
  { href: '/profile',      icon: UserCircle,      label: 'My Profile',    roles: ['all'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const visibleItems = navItems.filter(item =>
    item.roles.includes('all') || item.roles.includes(user?.role || '')
  );

  return (
    <aside className="sidebar flex flex-col">
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-peach-400 to-primary-600 flex items-center justify-center">
            <BookOpen size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">LearnPro</p>
            <p className="text-xs text-gray-400">Enterprise LMS</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-peach-400/20 flex items-center justify-center text-sm font-bold text-peach-300">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`sidebar-link ${active ? 'active' : ''}`}>
              <Icon size={17} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button onClick={handleLogout} className="sidebar-link w-full hover:bg-red-500/10 hover:text-red-400">
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
