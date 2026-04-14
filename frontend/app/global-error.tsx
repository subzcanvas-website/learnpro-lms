'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-5">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-400 mb-2">{error.message || 'An unexpected error occurred.'}</p>
            {error.digest && (
              <p className="text-xs text-gray-300 font-mono mb-6">Error ID: {error.digest}</p>
            )}
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 bg-peach-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-peach-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
