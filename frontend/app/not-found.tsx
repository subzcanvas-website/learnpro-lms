import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-3xl bg-peach-50 flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">🔍</span>
        </div>
        <h1 className="text-6xl font-black text-gray-900 mb-3">404</h1>
        <h2 className="text-xl font-bold text-gray-700 mb-2">Page not found</h2>
        <p className="text-gray-400 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 bg-peach-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-peach-600 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
