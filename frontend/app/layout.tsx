import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'LearnPro — Enterprise LMS',
  description: 'Modern enterprise learning management system with SOPs, quizzes, live classes, gamification and performance tracking.',
  keywords: ['LMS', 'learning management', 'training', 'courses', 'quizzes', 'enterprise'],
  authors: [{ name: 'LearnPro' }],
  openGraph: {
    title: 'LearnPro LMS',
    description: 'Enterprise-grade learning management platform',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }} className="bg-gray-50 text-gray-900">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: '10px', background: '#1a1a2e', color: '#fff', fontSize: '14px' },
            success: { iconTheme: { primary: '#ff7f5c', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
