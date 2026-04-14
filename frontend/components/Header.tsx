'use client';
import { Bell, Search, Menu } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export default function Header({ title = 'Dashboard', onMenuClick }: HeaderProps) {
  const { user } = useAuthStore();

  return (
    <header
      className="fixed top-0 right-0 z-40 bg-white border-b border-gray-100"
      style={{ left: 'var(--sidebar-width)', height: 'var(--header-height)' }}
    >
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-4">
          <button onClick={onMenuClick} className="md:hidden text-gray-500 hover:text-gray-700">
            <Menu size={20} />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-60">
            <Search size={15} className="text-gray-400" />
            <input placeholder="Search..." className="bg-transparent text-sm outline-none flex-1 text-gray-600" />
          </div>

          {/* Notifications */}
          <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-50 text-gray-500">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-peach-400 rounded-full"></span>
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-peach-300 to-primary-500 flex items-center justify-center text-white text-sm font-semibold cursor-pointer">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
