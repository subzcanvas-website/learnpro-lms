'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { coursesAPI, modulesAPI, lessonsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight, Youtube, FileText, BookOpen, ArrowLeft, Save } from 'lucide-react';

type LessonType = 'youtube' | 'video' | 'text' | 'pdf';

interface Lesson {
  _id: string;
  title: string;
  content_type: LessonType;
  content_url: string;
  content_body: string;
  duration_minutes: number;
}

interface Module {
  _id: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

const genId = () => Math.random().toString(36).slice(2);

const LESSON_TYPE_ICONS: Record<LessonType, any> = {
  youtube: Youtube,
  video: BookOpen,
  text: FileText,
  pdf: FileText,
};

export default function CourseCreatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'beginner',
    thumbnail_url: '',
    is_published: false,
  });

  const [modules, setModules] = useState<Module[]>([
    { _id: genId(), title: 'Module 1', description: '', lessons: [] }
  ]);

  const updateCourse = (field: string, value: any) =>
    setCourseData(prev => ({ ...prev, [field]: value }));

  const addModule = () => {
    const newMod: Module = { _id: genId(), title: `Module ${modules.length + 1}`, description: '', lessons: [] };
    setModules(prev => [...prev, newMod]);
    setExpandedModules(prev => new Set(Array.from(prev).concat(newMod._id)));
  };

  const updateModule = (modId: string, field: string, value: string) =>
    setModules(prev => prev.map(m => m._id === modId ? { ...m, [field]: value } : m));

  const deleteModule = (modId: string) =>
    setModules(prev => prev.filter(m => m._id !== modId));

  const addLesson = (modId: string) => {
    const newLesson: Lesson = {
      _id: genId(),
      title: 'New Lesson',
      content_type: 'youtube',
      content_url: '',
      content_body: '',
      duration_minutes: 0,
    };
    setModules(prev => prev.map(m => m._id === modId ? { ...m, lessons: [...m.lessons, newLesson] } : m));
  };

  const updateLesson = (modId: string, lessonId: string, field: string, value: any) =>
    setModules(prev => prev.map(m =>
      m._id === modId
        ? { ...m, lessons: m.lessons.map(l => l._id === lessonId ? { ...l, [field]: value } : l) }
        : m
    ));

  const deleteLesson = (modId: string, lessonId: string) =>
    setModules(prev => prev.map(m =>
      m._id === modId ? { ...m, lessons: m.lessons.filter(l => l._id !== lessonId) } : m
    ));

  const toggleModule = (id: string) =>
    setExpandedModules(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const handleSave = async (publish = false) => {
    if (!courseData.title) return toast.error('Course title is required');
    setSaving(true);
    try {
      // 1. Create course
      const { data: course } = await coursesAPI.create({
        ...courseData,
        is_published: publish,
      });

      // 2. Create modules + lessons
      for (let mi = 0; mi < modules.length; mi++) {
        const mod = modules[mi];
        const { data: createdMod } = await modulesAPI.create({
          course_id: course.id,
          title: mod.title,
          description: mod.description,
          order_index: mi,
        });

        for (let li = 0; li < mod.lessons.length; li++) {
          const lesson = mod.lessons[li];
          await lessonsAPI.create({
            module_id: createdMod.id,
            title: lesson.title,
            content_type: lesson.content_type,
            content_url: lesson.content_url,
            content_body: lesson.content_body,
            duration_minutes: lesson.duration_minutes || 0,
            order_index: li,
          });
        }
      }

      toast.success(publish ? 'Course published!' : 'Course saved as draft!');
      router.push(`/courses/${course.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save course');
    } finally { setSaving(false); }
  };

  return (
    <DashboardLayout title="Create Course">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/courses')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-peach-500">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex gap-2">
            <button onClick={() => handleSave(false)} disabled={saving} className="btn-secondary flex items-center gap-2">
              <Save size={15} /> Save Draft
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? 'Publishing...' : '🚀 Publish Course'}
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Course Details</h3>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Course Title *</label>
            <input
              value={courseData.title}
              onChange={e => updateCourse('title', e.target.value)}
              placeholder="e.g. Customer Service Excellence"
              className="input text-base font-medium"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Description</label>
            <textarea
              value={courseData.description}
              onChange={e => updateCourse('description', e.target.value)}
              placeholder="What will learners gain from this course?"
              rows={3}
              className="input resize-none"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Category</label>
              <select value={courseData.category} onChange={e => updateCourse('category', e.target.value)} className="input">
                <option value="">Select category</option>
                {['onboarding', 'technical', 'compliance', 'soft-skills', 'leadership', 'sales', 'product'].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Level</label>
              <select value={courseData.level} onChange={e => updateCourse('level', e.target.value)} className="input">
                {['beginner', 'intermediate', 'advanced'].map(l => (
                  <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Thumbnail URL</label>
              <input
                value={courseData.thumbnail_url}
                onChange={e => updateCourse('thumbnail_url', e.target.value)}
                placeholder="https://..."
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Modules builder */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">Course Content</h3>
              <p className="text-xs text-gray-400 mt-0.5">{modules.length} modules · {modules.reduce((a, m) => a + m.lessons.length, 0)} lessons</p>
            </div>
            <button onClick={addModule} className="btn-secondary flex items-center gap-1.5 text-sm py-2">
              <Plus size={14} /> Add Module
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {modules.map((mod, mi) => {
              const expanded = expandedModules.has(mod._id);
              return (
                <div key={mod._id}>
                  {/* Module row */}
                  <div className="flex items-center gap-3 px-5 py-3 bg-gray-50/60">
                    <GripVertical size={16} className="text-gray-300 cursor-grab" />
                    <button onClick={() => toggleModule(mod._id)} className="text-gray-400">
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <input
                      value={mod.title}
                      onChange={e => updateModule(mod._id, 'title', e.target.value)}
                      className="flex-1 bg-transparent font-semibold text-gray-800 text-sm outline-none border-0 focus:bg-white focus:border focus:border-peach-300 px-2 py-1 rounded-lg transition"
                    />
                    <span className="text-xs text-gray-400">{mod.lessons.length} lessons</span>
                    <button onClick={() => deleteModule(mod._id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Lessons list */}
                  {expanded && (
                    <div className="pl-10">
                      {mod.lessons.map((lesson, li) => {
                        const Icon = LESSON_TYPE_ICONS[lesson.content_type];
                        return (
                          <div key={lesson._id} className="border-b border-gray-50 last:border-0 py-3 pr-5">
                            <div className="flex items-start gap-3">
                              <GripVertical size={14} className="text-gray-200 mt-3 cursor-grab shrink-0" />
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-peach-50 flex items-center justify-center shrink-0">
                                    <Icon size={13} className="text-peach-500" />
                                  </div>
                                  <input
                                    value={lesson.title}
                                    onChange={e => updateLesson(mod._id, lesson._id, 'title', e.target.value)}
                                    className="flex-1 text-sm font-medium text-gray-700 bg-transparent outline-none border-0 focus:bg-gray-50 px-2 py-1 rounded-lg transition"
                                    placeholder="Lesson title"
                                  />
                                  <select
                                    value={lesson.content_type}
                                    onChange={e => updateLesson(mod._id, lesson._id, 'content_type', e.target.value)}
                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-peach-400"
                                  >
                                    <option value="youtube">YouTube</option>
                                    <option value="video">Video URL</option>
                                    <option value="text">Text</option>
                                    <option value="pdf">PDF</option>
                                  </select>
                                  <button onClick={() => deleteLesson(mod._id, lesson._id)} className="w-6 h-6 rounded hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-500">
                                    <Trash2 size={12} />
                                  </button>
                                </div>

                                {(lesson.content_type === 'youtube' || lesson.content_type === 'video') && (
                                  <input
                                    value={lesson.content_url}
                                    onChange={e => updateLesson(mod._id, lesson._id, 'content_url', e.target.value)}
                                    placeholder={lesson.content_type === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...video.mp4'}
                                    className="input text-sm"
                                  />
                                )}
                                {lesson.content_type === 'text' && (
                                  <textarea
                                    value={lesson.content_body}
                                    onChange={e => updateLesson(mod._id, lesson._id, 'content_body', e.target.value)}
                                    placeholder="Lesson text content..."
                                    rows={3}
                                    className="input text-sm resize-none"
                                  />
                                )}
                                {lesson.content_type === 'pdf' && (
                                  <input
                                    value={lesson.content_url}
                                    onChange={e => updateLesson(mod._id, lesson._id, 'content_url', e.target.value)}
                                    placeholder="https://...document.pdf"
                                    className="input text-sm"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <button onClick={() => addLesson(mod._id)} className="flex items-center gap-2 text-sm text-peach-500 hover:text-peach-600 py-3 pl-3 transition-colors">
                        <Plus size={14} /> Add Lesson
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
