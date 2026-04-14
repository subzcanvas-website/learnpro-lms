'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { certificatesAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Award, Download, Calendar, BookOpen, CheckCircle, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CertificatesPage() {
  const { user } = useAuthStore();
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    certificatesAPI.getAll().then(r => setCerts(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleDownload = (cert: any) => {
    // Generate HTML certificate and trigger print/download
    const html = generateCertHTML(cert);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  const generateCertHTML = (cert: any) => `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Certificate - ${cert.course_title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@300;400;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .cert { width: 900px; height: 640px; border: 3px solid #d4a843; padding: 50px 60px; position: relative; background: #fffdf7;
          box-shadow: inset 0 0 60px rgba(212,168,67,0.05); }
        .border-inner { position: absolute; inset: 12px; border: 1px solid #e8c96a; pointer-events: none; }
        .corner { position: absolute; width: 30px; height: 30px; border-color: #d4a843; border-style: solid; }
        .tl { top: 20px; left: 20px; border-width: 2px 0 0 2px; }
        .tr { top: 20px; right: 20px; border-width: 2px 2px 0 0; }
        .bl { bottom: 20px; left: 20px; border-width: 0 0 2px 2px; }
        .br { bottom: 20px; right: 20px; border-width: 0 2px 2px 0; }
        .logo { text-align: center; margin-bottom: 12px; }
        .logo-text { font-family: 'Cinzel', serif; font-size: 22px; color: #1a1a2e; letter-spacing: 4px; }
        .cert-title { font-family: 'Cinzel', serif; font-size: 13px; text-align: center; color: #888; letter-spacing: 6px; margin-bottom: 20px; }
        .presented { text-align: center; font-size: 13px; color: #666; margin-bottom: 8px; font-weight: 300; }
        .name { font-family: 'Cinzel', serif; font-size: 38px; text-align: center; color: #1a1a2e; margin-bottom: 8px; border-bottom: 2px solid #d4a843; padding-bottom: 12px; }
        .for { text-align: center; font-size: 13px; color: #888; margin-top: 16px; margin-bottom: 8px; }
        .course { font-size: 22px; font-weight: 600; text-align: center; color: #333; margin-bottom: 24px; }
        .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; }
        .sig { text-align: center; }
        .sig-line { border-top: 1px solid #555; width: 160px; margin-bottom: 6px; }
        .sig-name { font-size: 12px; color: #555; font-weight: 600; }
        .sig-title { font-size: 11px; color: #888; }
        .cert-no { text-align: center; }
        .cert-no-label { font-size: 10px; color: #aaa; letter-spacing: 2px; }
        .cert-no-val { font-size: 12px; color: #666; font-weight: 600; }
        .seal { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #d4a843, #f0c060); display: flex; align-items: center; justify-content: center; }
        .seal-text { text-align: center; color: white; font-size: 9px; font-weight: bold; letter-spacing: 0.5px; line-height: 1.4; }
        @media print { body { background: white; } .cert { box-shadow: none; } }
      </style>
    </head>
    <body>
      <div class="cert">
        <div class="border-inner"></div>
        <div class="corner tl"></div><div class="corner tr"></div>
        <div class="corner bl"></div><div class="corner br"></div>
        <div class="logo"><span class="logo-text">LearnPro</span></div>
        <div class="cert-title">CERTIFICATE OF COMPLETION</div>
        <div class="presented">This is to certify that</div>
        <div class="name">${cert.user_name || user?.name || 'Learner'}</div>
        <div class="for">has successfully completed the course</div>
        <div class="course">${cert.course_title || 'Course Name'}</div>
        <div class="footer">
          <div class="sig">
            <div class="sig-line"></div>
            <div class="sig-name">${cert.org_name || 'Organization'}</div>
            <div class="sig-title">Authorized Signatory</div>
          </div>
          <div class="seal"><div class="seal-text">VERIFIED<br/>COMPLETE</div></div>
          <div class="cert-no">
            <div class="cert-no-label">CERTIFICATE NO.</div>
            <div class="cert-no-val">${cert.certificate_number || 'CERT-000001'}</div>
            <div class="cert-no-label" style="margin-top:4px">ISSUED ON</div>
            <div class="cert-no-val">${new Date(cert.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return (
    <DashboardLayout title="My Certificates">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Certificates</h2>
          <p className="text-sm text-gray-400 mt-0.5">Complete courses to earn certificates</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => <div key={i} className="card h-48 animate-pulse bg-gray-50" />)}
          </div>
        ) : certs.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-24">
            <div className="w-20 h-20 rounded-full bg-yellow-50 flex items-center justify-center mb-4">
              <Award size={36} className="text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No certificates yet</h3>
            <p className="text-sm text-gray-400 mb-5">Complete a course to earn your first certificate</p>
            <a href="/courses" className="btn-primary">Browse Courses</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {certs.map(cert => (
              <div key={cert.id} className="card overflow-hidden group hover:shadow-lg transition-shadow">
                {/* Certificate preview banner */}
                <div className="h-36 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 border-b border-yellow-100 relative flex flex-col items-center justify-center p-4">
                  <div className="absolute inset-3 border border-yellow-200 rounded-lg pointer-events-none" />
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mb-2 shadow-lg">
                    <Award size={22} className="text-white" />
                  </div>
                  <p className="text-xs font-bold text-yellow-800 uppercase tracking-widest">Certificate of Completion</p>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-800 mb-0.5 line-clamp-2">{cert.course_title || 'Course'}</h3>
                  <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                    <BookOpen size={11} /> Completed course
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(cert.issued_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><CheckCircle size={11} className="text-green-500" /> Valid</span>
                  </div>
                  <p className="text-xs text-gray-300 mb-4 font-mono">{cert.certificate_number}</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleDownload(cert)} className="btn-primary flex items-center gap-1.5 text-sm py-2 flex-1 justify-center">
                      <Download size={13} /> Download
                    </button>
                    <button onClick={() => {
                      navigator.clipboard.writeText(cert.certificate_number || '');
                      toast.success('Certificate number copied!');
                    }} className="btn-secondary flex items-center gap-1 text-sm py-2 px-3">
                      <Share2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
