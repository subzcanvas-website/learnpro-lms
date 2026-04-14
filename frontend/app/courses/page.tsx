'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { coursesAPI } from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Plus, Search, BookOpen, Clock, Users, BarChart, Filter } from 'lucide-react';
import { useAuthStore } from '@/lib/store';

const LEVELS = ['all', 'beginner', 'intermediate', 'advanced'];
const CATEGORIES = ['all', 'onboarding', 'technical', 'compliance', 'soft-skills', 'leadership'];

export default function CoursesPage() {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [category, setCategory] = useState('all');

  const canCreate = ['super_admin', 'org_admin', 'trainer'].includes(user?.role || '');

  const fetchCourses = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (level !== 'all') params.level = level;
      if (category !== 'all') params.category = category;
      const { data } = await coursesAPI.getAll(params);
      setCourses(data);
    } catch { toast.error('Failed to load courses'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCourses(); }, [search, level, category]);

  const handleEnroll = async (courseId: string, e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await coursesAPI.enroll(courseId);
      toast.success('Enrolled successfully!');
      fetchCourses();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Enrollment failed');
    }
  };

  const levelColor: Record<string, string> = {
    beginner: 'badge-green',
    intermediate: 'badge-yellow',
    advanced: 'badge-red',
  };

  return (
    <DashboardLayout title="Courses">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Course Library</h2>
            <p className="text-sm text-gray-400 mt-0.5">{courses.length} courses available</p>
          </div>
          {canCreate && (
            <Link href="/courses/create" className="btn-primary flex items-center gap-2">
              <Plus size={16} /> New Course
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-48">
            <Search size={15} className="text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..." className="bg-transparent text-sm outline-none flex-1" />
          </div>
          <select value={level} onChange={e => setLevel(e.target.value)} className="input w-40">
            {LEVELS.map(l => <option key={l} value={l}>{l === 'all' ? 'All Levels' : l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input w-44">
            {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="h-40 bg-gray-100 rounded-xl mb-4" />
                <div className="h-4 bg-gray-100 rounded mb-2 w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20">
            <BookOpen size={48} className="text-gray-200 mb-4" />
            <p className="text-lg font-semibold text-gray-400">No courses found</p>
            <p className="text-sm text-gray-300 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {courses.map(course => (
              <Link key={course.id} href={`/courses/${course.id}`} className="card group hover:shadow-md transition-shadow overflow-hidden">
                {/* Thumbnail */}
                <div className="h-44 bg-gradient-to-br from-peach-100 to-primary-100 relative overflow-hidden">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <BookOpen size={40} className="text-peach-300" />
                    </div>
                  )}
                  {course.is_published && (
                    <span className="absolute top-3 right-3 badge badge-green text-xs">Published</span>
                  )}
                  {!course.is_published && (
                    <span className="absolute top-3 right-3 badge badge-yellow text-xs">Draft</span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-800 group-hover:text-peach-500 transition-colors line-clamp-2">{course.title}</h3>
                    {course.level && <span className={`badge ${levelColor[course.level] || 'badge-blue'} shrink-0 text-xs`}>{course.level}</span>}
                  </div>
                  {course.description && (
                    <p className="text-sm text-gray-400 line-clamp-2 mb-3">{course.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1"><Clock size={12} /> {course.duration_minutes || 0}m</span>
                    <span className="flex items-center gap-1"><BookOpen size={12} /> {course.lesson_count || 0} lessons</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {course.enrollment_count || 0}</span>
                  </div>
                  {course.enrollment_count > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>0%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: '0%' }} />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">By {course.creator_name || 'Trainer'}</span>
                    <button
                      onClick={(e) => handleEnroll(course.id, e)}
                      className="text-xs font-semibold text-peach-500 hover:text-peach-600 transition-colors"
                    >
                      Enroll →
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
