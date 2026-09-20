'use client';
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-ink/55 z-[150] flex items-center justify-center p-5" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-DEFAULT w-full max-w-md p-6 shadow-2xl content-fade">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="text-slate2-light hover:text-ink text-lg leading-none">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
