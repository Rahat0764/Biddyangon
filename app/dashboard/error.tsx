'use client';
import { useEffect } from 'react';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="card p-8 max-w-sm text-center">
        <div className="text-2xl mb-3">⚠</div>
        <h2 className="font-serif text-lg font-semibold text-ink mb-2">Something went wrong</h2>
        <p className="text-sm text-slate2-light mb-5">This page couldn't load. It's been logged — try again, or head back to the dashboard.</p>
        <div className="flex gap-2 justify-center">
          <button onClick={reset} className="bg-indigo text-white text-sm font-semibold px-4 py-2 rounded-sm">Try Again</button>
          <a href="/dashboard" className="border border-line text-sm font-semibold px-4 py-2 rounded-sm">Dashboard</a>
        </div>
      </div>
    </div>
  );
}
