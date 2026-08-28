import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import { Inbox } from 'lucide-react';
import { useThemeStore, getResolvedTheme } from '@/stores/theme';
import { getAgGridTheme } from '@/lib/ag-theme';
import type { MovimentoRow } from '@/types/movimento';

const COL_DEFS: ColDef<MovimentoRow>[] = [
  { field: 'data', flex: 1 },
  { field: 'descrizione', flex: 2 },
  { field: 'categoria', flex: 1 },
  { field: 'importo', flex: 1, type: 'numericColumn' },
];

function EmptyState() {
  return (
    <div
      role="status"
      className="flex h-full flex-col items-center justify-center gap-3 text-center"
    >
      <Inbox size={40} className="text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium text-foreground">Nessun movimento</p>
      <p className="text-xs text-muted-foreground">I movimenti inseriti appariranno qui.</p>
    </div>
  );
}

const ROW_DATA: MovimentoRow[] = [];

export default function MovimentiScreen() {
  const { theme } = useThemeStore();
  const isDark = getResolvedTheme(theme) === 'dark';
  const gridTheme = useMemo(() => getAgGridTheme(isDark), [isDark]);

  if (ROW_DATA.length === 0) {
    return (
      <div className="flex h-full flex-col gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">Tutti i movimenti</h2>
        <div className="flex-1 min-h-96 rounded-lg border border-border overflow-hidden">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <h2 className="text-sm font-medium text-muted-foreground">Tutti i movimenti</h2>
      <div className="flex-1 min-h-96 rounded-lg border border-border overflow-hidden">
        <AgGridReact<MovimentoRow>
          theme={gridTheme}
          rowData={ROW_DATA}
          columnDefs={COL_DEFS}
        />
      </div>
    </div>
  );
}
