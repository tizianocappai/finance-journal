import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useMovimentiStore } from '@/stores/movimenti';

export default function Toast() {
  const {
    lastDeleted, clearLastDeleted, restore,
    lastBulkDeleted, clearLastBulkDeleted, restoreAll,
  } = useMovimentiStore();

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isBulk = lastBulkDeleted !== null && lastBulkDeleted.length > 0;
  const isVisible = isBulk || lastDeleted !== null;

  const dismiss = isBulk ? clearLastBulkDeleted : clearLastDeleted;

  useEffect(() => {
    if (!isVisible) return;
    timerRef.current = setTimeout(() => dismiss(), 3500);
    return () => clearTimeout(timerRef.current);
  }, [isVisible, dismiss]);

  useEffect(() => {
    if (!isVisible) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isVisible, dismiss]);

  if (!isVisible) return null;

  async function handleUndo() {
    try {
      clearTimeout(timerRef.current);
      if (isBulk) {
        await restoreAll();
      } else {
        await restore();
      }
    } catch {
      // error surfaced via store.error
    }
  }

  const label = isBulk
    ? `${lastBulkDeleted!.length} moviment${lastBulkDeleted!.length === 1 ? 'o eliminato' : 'i eliminati'}`
    : 'Movimento eliminato';

  return (
    <div
      role="status"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-md"
    >
      <span className="text-sm text-foreground">{label}</span>
      <button
        onClick={handleUndo}
        className="text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
      >
        Annulla
      </button>
      <button
        onClick={dismiss}
        aria-label="Chiudi notifica"
        className="ml-1 rounded text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  );
}
