'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { coursesAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Play, CheckCircle, Circle, Lock, BookOpen, Clock, Users,
  ChevronDown, ChevronRight, ArrowLeft, FileText, Youtube,
  Award, BarChart2, Bookmark
} from 'lucide-react';

type ContentType = 'video' | 'youtube' | 'text' | 'pdf';

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    coursesAPI.getOne(id).then(r => {
      setCourse(r.data);
      // Auto-expand first module, auto-select first lesson
      if (r.data.modules?.length) {
        const first = r.data.modules[0];
        setExpandedModules(new Set([first.id]));
        if (first.lessons?.length) setActiveLesson(first.lessons[0]);
      }
    }).catch(() => toast.error('Failed to load course'))
    .finally(() => setLoading(false));
  }, [id]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await coursesAPI.enroll(id);
      toast.success('Enrolled! Start learning.');
      const r = await coursesAPI.getOne(id);
      setCourse(r.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Enrollment failed');
    } finally { setEnrolling(false); }
  };

  const markComplete = async (lessonId: string) => {
    try {
      await coursesAPI.updateProgress(id, { lesson_id: lessonId, completed: true, progress_seconds: 0 });
      const r = await coursesAPI.getOne(id);
      setCourse(r.data);
      toast.success('Lesson marked complete! +5 pts');
    } catch { toast.error('Failed to update progress'); }
  };

  const toggleModule = (modId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(modId) ? next.delete(modId) : next.add(modId);
      return next;
    });
  };

  const isCompleted = (lessonId: string) => course?.progress?.[lessonId] === true;

  const getLessonIcon = (type: ContentType) => {
    if (type === 'youtube' || type === 'video') return Play;
    if (type === 'pdf') return FileText;
    return BookOpen;
  };

  if (loading) return (
    <DashboardLayout title="Loading...">
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-peach-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (!course) return (
    <DashboardLayout title="Not Found">
      <div className="card flex flex-col items-center justify-center py-20">
        <p className="text-gray-400">Course not found</p>
        <button onClick={() => router.push('/courses')} className="btn-primary mt-4">Back to Courses</button>
      </div>
    </DashboardLayout>
  );

  const enrolled = !!course.enrollment;
  const completion = course.enrollment?.completion_pct || 0;
  const totalLessons = course.modules?.reduce((a: number, m: any) => a + (m.lessons?.filter(Boolean).length || 0), 0) || 0;
  const doneLessons = Object.values(course.progress || {}).filter(Boolean).length;

  return (
    <DashboardLayout title={course.title}>
      <div className="space-y-4">
        {/* Back button */}
        <button onClick={() => router.push('/courses')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-peach-500 transition-colors">
          <ArrowLeft size={16} /> Back to Courses
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* LEFT — Lesson Player */}
          <div className="xl:col-span-2 space-y-4">
            {/* Player area */}
            <div className="card overflow-hidden">
              {activeLesson ? (
                <>
                  {/* Video / YouTube embed */}
                  {(activeLesson.content_type === 'youtube' || activeLesson.content_type === 'video') && activeLesson.content_url ? (
                    <div className="aspect-video bg-black">
                      {activeLesson.content_type === 'youtube' ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${getYouTubeId(activeLesson.content_url)}?rel=0`}
                          className="w-full h-full"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      ) : (
                        <video src={activeLesson.content_url} controls className="w-full h-full" />
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                      <div className="text-center">
                        <BookOpen size={48} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">Text / PDF Lesson</p>
                      </div>
                    </div>
                  )}

                  {/* Lesson content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs text-peach-500 font-medium mb-1 uppercase tracking-wide">
                          {activeLesson.content_type}
                        </p>
                        <h2 className="text-lg font-bold text-gray-900">{activeLesson.title}</h2>
                      </div>
                      {enrolled && (
                        <button
                          onClick={() => markComplete(activeLesson.id)}
                          disabled={isCompleted(activeLesson.id)}
                          className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                            ${isCompleted(activeLesson.id)
                              ? 'bg-green-50 text-green-600 cursor-default'
                              : 'bg-peach-500 text-white hover:bg-peach-600'
                            }`}
                        >
                          {isCompleted(activeLesson.id)
                            ? <><CheckCircle size={15} /> Completed</>
                            : <><CheckCircle size={15} /> Mark Complete</>
                          }
                        </button>
                      )}
                    </div>

                    {activeLesson.content_body && (
                      <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed border-t border-gray-50 pt-4 mt-4">
                        <div dangerouslySetInnerHTML={{ __html: activeLesson.content_body.replace(/\n/g, '<br/>') }} />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="aspect-video flex flex-col items-center justify-center bg-gradient-to-br from-peach-50 to-primary-50">
                  <Play size={56} className="text-peach-300 mb-4" />
                  <p className="text-gray-500 font-medium">Select a lesson to begin</p>
                  {!enrolled && (
                    <button onClick={handleEnroll} disabled={enrolling} className="btn-primary mt-4">
                      {enrolling ? 'Enrolling...' : 'Enroll to Start Learning'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Progress bar */}
            {enrolled && (
              <div className="card p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700">Course Progress</span>
                    <span className="font-bold text-peach-500">{Math.round(completion)}%</span>
                  </div>
                  <div className="progress-bar h-3">
                    <div className="progress-fill" style={{ width: `${completion}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">{doneLessons} of {totalLessons} lessons completed</p>
                </div>
                {completion === 100 && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-xl">
                    <Award size={18} />
                    <span className="text-sm font-semibold">Certificate Earned!</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT — Sidebar: Course info + Module list */}
          <div className="space-y-4">
            {/* Course info card */}
            <div className="card p-5">
              {!enrolled ? (
                <>
                  <h3 className="font-bold text-gray-900 mb-1">{course.title}</h3>
                  {course.description && <p className="text-sm text-gray-400 mb-4">{course.description}</p>}
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center text-xs">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="font-bold text-gray-800">{totalLessons}</p>
                      <p className="text-gray-400">Lessons</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="font-bold text-gray-800">{course.duration_minutes || 0}m</p>
                      <p className="text-gray-400">Duration</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="font-bold text-gray-800 capitalize">{course.level || 'All'}</p>
                      <p className="text-gray-400">Level</p>
                    </div>
                  </div>
                  <button onClick={handleEnroll} disabled={enrolling} className="btn-primary w-full">
                    {enrolling ? 'Enrolling...' : 'Enroll Free'}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                    <CheckCircle size={20} className="text-green-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Enrolled</p>
                    <p className="text-xs text-gray-400">{Math.round(completion)}% complete</p>
                  </div>
                </div>
              )}
            </div>

            {/* Module accordion */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 text-sm">Course Content</h3>
                <span className="text-xs text-gray-400">{course.modules?.length || 0} modules · {totalLessons} lessons</span>
              </div>
              <div className="max-h-[520px] overflow-y-auto">
                {course.modules?.length === 0 && (
                  <div className="p-6 text-center text-sm text-gray-400">No content yet</div>
                )}
                {course.modules?.map((mod: any, mi: number) => {
                  const expanded = expandedModules.has(mod.id);
                  const lessons = (mod.lessons || []).filter(Boolean);
                  const modDone = lessons.filter((l: any) => isCompleted(l.id)).length;
                  return (
                    <div key={mod.id} className="border-b border-gray-50 last:border-0">
                      {/* Module header */}
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        {expanded ? <ChevronDown size={15} className="text-gray-400 shrink-0" /> : <ChevronRight size={15} className="text-gray-400 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm truncate">
                            {mi + 1}. {mod.title}
                          </p>
                          <p className="text-xs text-gray-400">{modDone}/{lessons.length} completed</p>
                        </div>
                      </button>
                      {/* Lessons */}
                      {expanded && (
                        <div className="bg-gray-50/50">
                          {lessons.map((lesson: any, li: number) => {
                            const Icon = getLessonIcon(lesson.content_type);
                            const done = isCompleted(lesson.id);
                            const active = activeLesson?.id === lesson.id;
                            return (
                              <button
                                key={lesson.id}
                                onClick={() => enrolled && setActiveLesson(lesson)}
                                disabled={!enrolled}
                                className={`w-full flex items-center gap-3 px-5 py-2.5 text-left text-sm transition-all
                                  ${active ? 'bg-peach-50 text-peach-600' : 'hover:bg-gray-100 text-gray-600'}
                                  ${!enrolled ? 'cursor-not-allowed opacity-60' : ''}`}
                              >
                                {done
                                  ? <CheckCircle size={15} className="text-green-500 shrink-0" />
                                  : enrolled
                                    ? <Circle size={15} className={active ? 'text-peach-400' : 'text-gray-300'} />
                                    : <Lock size={15} className="text-gray-300 shrink-0" />
                                }
                                <span className={`flex-1 truncate ${active ? 'font-medium' : ''}`}>
                                  {mi + 1}.{li + 1} {lesson.title}
                                </span>
                                <Icon size={12} className="text-gray-300 shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function getYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/\s]{11})/);
  return match?.[1] || url;
}
