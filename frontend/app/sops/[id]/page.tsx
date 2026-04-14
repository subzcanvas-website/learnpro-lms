'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { sopsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckCircle, Circle, ArrowLeft, ChevronLeft, ChevronRight, Clock, FileText, History } from 'lucide-react';

export default function SOPDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sop, setSop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    sopsAPI.getOne(id).then(r => setSop(r.data)).catch(() => toast.error('SOP not found')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <DashboardLayout title="Loading...">
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-2 border-peach-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (!sop) return (
    <DashboardLayout title="Not Found">
      <div className="card flex flex-col items-center justify-center py-20">
        <p className="text-gray-400">SOP not found</p>
        <button onClick={() => router.push('/sops')} className="btn-primary mt-4">Back to SOPs</button>
      </div>
    </DashboardLayout>
  );

  // Get steps from current version
  const steps: any[] = sop.steps || sop.versions?.[0]?.steps || [];
  const currentStep = steps[activeStep];
  const allDone = steps.length > 0 && completedSteps.size === steps.length;

  const markStep = (idx: number) => {
    setCompletedSteps(prev => {
      const n = new Set(prev);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  const goNext = () => {
    markStep(activeStep);
    if (activeStep < steps.length - 1) setActiveStep(i => i + 1);
  };

  const getYouTubeId = (url: string) => {
    const match = url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?/\s]{11})/);
    return match?.[1];
  };

  return (
    <DashboardLayout title={sop.title}>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/sops')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-peach-500">
              <ArrowLeft size={16} /> Back
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{sop.title}</h2>
              <p className="text-xs text-gray-400 flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1"><FileText size={11} /> Version {sop.current_version}</span>
                <span className="flex items-center gap-1"><Clock size={11} /> Updated {new Date(sop.updated_at).toLocaleDateString()}</span>
                {sop.created_by_name && <span>by {sop.created_by_name}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {allDone && (
              <span className="flex items-center gap-2 text-sm font-semibold text-green-600 bg-green-50 px-3 py-2 rounded-xl">
                <CheckCircle size={16} /> All Steps Done!
              </span>
            )}
            {sop.versions?.length > 1 && (
              <button onClick={() => setShowVersions(v => !v)} className="btn-secondary flex items-center gap-2 text-sm">
                <History size={14} /> Version History
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Step list sidebar */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/60">
              <p className="text-sm font-semibold text-gray-700">Steps ({steps.length})</p>
              <div className="progress-bar mt-2">
                <div className="progress-fill" style={{ width: `${steps.length ? (completedSteps.size / steps.length) * 100 : 0}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{completedSteps.size}/{steps.length} completed</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {steps.map((step: any, i: number) => {
                const done = completedSteps.has(i);
                const active = activeStep === i;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveStep(i)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 last:border-0
                      ${active ? 'bg-peach-50 border-l-2 border-l-peach-400' : 'hover:bg-gray-50'}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {done
                        ? <CheckCircle size={16} className="text-green-500" />
                        : <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                            ${active ? 'border-peach-400 bg-peach-400' : 'border-gray-300'}`}>
                            {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                      }
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${active ? 'text-peach-600' : done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                        Step {i + 1}
                      </p>
                      <p className="text-xs text-gray-400 truncate max-w-36">{step.title}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step content */}
          <div className="lg:col-span-2 space-y-4">
            {currentStep ? (
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-full bg-peach-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {activeStep + 1}
                  </div>
                  <h3 className="font-bold text-gray-900 text-xl">{currentStep.title}</h3>
                  {completedSteps.has(activeStep) && (
                    <span className="badge badge-green ml-auto">Completed</span>
                  )}
                </div>

                {/* Step image */}
                {currentStep.image_url && (
                  <div className="mb-5 rounded-xl overflow-hidden border border-gray-100">
                    <img src={currentStep.image_url} alt={currentStep.title} className="w-full max-h-64 object-cover" loading="lazy" />
                  </div>
                )}

                {/* Step video */}
                {currentStep.video_url && getYouTubeId(currentStep.video_url) && (
                  <div className="mb-5 aspect-video rounded-xl overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeId(currentStep.video_url)}`}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Step content */}
                {currentStep.content && (
                  <div className="text-gray-700 leading-relaxed whitespace-pre-line mb-6">
                    {currentStep.content}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <button
                    onClick={() => setActiveStep(i => Math.max(0, i - 1))}
                    disabled={activeStep === 0}
                    className="btn-secondary flex items-center gap-2 disabled:opacity-40 text-sm"
                  >
                    <ChevronLeft size={15} /> Previous
                  </button>
                  <button
                    onClick={() => markStep(activeStep)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                      ${completedSteps.has(activeStep)
                        ? 'bg-green-50 text-green-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-peach-50 hover:text-peach-600'
                      }`}
                  >
                    {completedSteps.has(activeStep) ? <><CheckCircle size={15} /> Marked Done</> : <><Circle size={15} /> Mark Done</>}
                  </button>
                  {activeStep < steps.length - 1 ? (
                    <button onClick={goNext} className="btn-primary flex items-center gap-2 text-sm">
                      Next Step <ChevronRight size={15} />
                    </button>
                  ) : (
                    <button
                      onClick={() => markStep(activeStep)}
                      className="btn-primary flex items-center gap-2 text-sm bg-green-500 hover:bg-green-600"
                    >
                      <CheckCircle size={15} /> Complete SOP
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="card flex flex-col items-center justify-center py-20">
                <FileText size={40} className="text-gray-200 mb-3" />
                <p className="text-gray-400">No steps in this SOP yet</p>
              </div>
            )}

            {/* SOP description */}
            {sop.description && (
              <div className="card p-4 bg-blue-50/50 border-blue-100">
                <p className="text-sm text-blue-700"><strong>About this SOP:</strong> {sop.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Version history */}
        {showVersions && sop.versions?.length > 1 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Version History</h3>
            <div className="space-y-2">
              {sop.versions.map((v: any) => (
                <div key={v.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className={`badge ${v.version_number === sop.current_version ? 'badge-green' : 'badge-blue'}`}>
                    v{v.version_number}
                  </span>
                  <span className="text-sm text-gray-600">{v.change_notes || 'No notes'}</span>
                  <span className="text-xs text-gray-400 ml-auto">{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
