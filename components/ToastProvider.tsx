'use client';
import { createContext, useCallback, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; title: string; msg?: string; type: ToastType; }
const ToastCtx = createContext<(title: string, msg?: string, type?: ToastType) => void>(() => {});

export function useToast() { return useContext(ToastCtx); }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((title: string, msg?: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, title, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4800);
  }, []);

  const border = { success: 'border-l-[#3FBE73]', error: 'border-l-[#E5605C]', info: 'border-l-brass' };
  const icon = { success: '✓', error: '⚠', info: 'ℹ' };

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2.5 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <div key={t.id} className={`bg-ink text-white rounded-sm p-3.5 flex gap-3 items-start shadow-xl border-l-[3px] ${border[t.type]}`}>
            <div className="text-sm mt-0.5">{icon[t.type]}</div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{t.title}</div>
              {t.msg && <div className="text-xs text-[#B7BBD9] mt-0.5">{t.msg}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
