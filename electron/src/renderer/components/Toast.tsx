import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useMovimentiStore } from '@/stores/movimenti';

export default function Toast() {
  const { lastDeleted, clearLastDeleted, restore } = useMovimentiStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!lastDeleted) return;
    timerRef.current = setTimeout(() => clearLastDeleted(), 3500);
    return () => clearTimeout(timerRef.current);
  }, [lastDeleted, clearLastDeleted]);

  useEffect(() => {
    if (!lastDeleted) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') clearLastDeleted();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lastDeleted, clearLastDeleted]);

  if (!lastDeleted) return null;

  async function handleUndo() {
    try {
      clearTimeout(timerRef.current);
      await restore();
    } catch {
      // error surfaced via store.error
    }
  }

  return (
    <div
      role="status"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-md"
    >
      <span className="text-sm text-foreground">Movimento eliminato</span>
      <button
        onClick={handleUndo}
        className="text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
      >
        Annulla
      </button>
      <button
        onClick={clearLastDeleted}
        aria-label="Chiudi notifica"
        className="ml-1 rounded text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
