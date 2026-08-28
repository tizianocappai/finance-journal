import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AgCharts } from 'ag-charts-react';
import type { ColDef } from 'ag-grid-community';
import type { AgChartOptions } from 'ag-charts-community';
import { useThemeStore, getResolvedTheme } from '@/stores/theme';
import { getAgGridTheme, getAgChartsTheme } from '@/lib/ag-theme';
import type { MovimentoRow } from '@/types/movimento';

const SAMPLE_ROW_DATA: MovimentoRow[] = [
  { data: '2026-08-01', descrizione: 'Spesa supermercato', importo: -85.4, categoria: 'Alimentari' },
  { data: '2026-08-05', descrizione: 'Stipendio', importo: 2400, categoria: 'Entrate' },
  { data: '2026-08-10', descrizione: 'Bolletta luce', importo: -62.0, categoria: 'Utenze' },
];

const COL_DEFS: ColDef<MovimentoRow>[] = [
  { field: 'data', flex: 1 },
  { field: 'descrizione', flex: 2 },
  { field: 'categoria', flex: 1 },
  { field: 'importo', flex: 1, type: 'numericColumn' },
];

const CHART_DATA = [
  { mese: 'Giu', entrate: 2400, uscite: 1800 },
  { mese: 'Lug', entrate: 2400, uscite: 2100 },
  { mese: 'Ago', entrate: 2600, uscite: 1950 },
];

export default function DashboardScreen() {
  const { theme } = useThemeStore();
  const isDark = getResolvedTheme(theme) === 'dark';

  const gridTheme = useMemo(() => getAgGridTheme(isDark), [isDark]);

  const chartOptions = useMemo<AgChartOptions>(
    () => ({
      theme: getAgChartsTheme(isDark),
      data: CHART_DATA,
      series: [
        { type: 'bar', xKey: 'mese', yKey: 'entrate', yName: 'Entrate' },
        { type: 'bar', xKey: 'mese', yKey: 'uscite', yName: 'Uscite' },
      ],
    }),
    [isDark],
  );

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="grid-heading">
        <h2 id="grid-heading" className="mb-3 text-sm font-medium text-muted-foreground">
          Ultimi movimenti
        </h2>
        <div className="h-52 w-full rounded-lg border border-border overflow-hidden">
          <AgGridReact<MovimentoRow>
            theme={gridTheme}
            rowData={SAMPLE_ROW_DATA}
            columnDefs={COL_DEFS}
          />
        </div>
      </section>

      <section aria-labelledby="chart-heading">
        <h2 id="chart-heading" className="mb-3 text-sm font-medium text-muted-foreground">
          Andamento mensile
        </h2>
        <div className="h-64 w-full rounded-lg border border-border overflow-hidden">
          <AgCharts options={chartOptions} />
        </div>
      </section>
    </div>
  );
}
