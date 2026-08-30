import { useEffect, useMemo } from 'react';
import { AgCharts } from 'ag-charts-react';
import type { AgChartOptions, AgChartTheme } from 'ag-charts-community';
import { TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, PieChart } from 'lucide-react';
import { useThemeStore, getResolvedTheme } from '@/stores/theme';
import { useDashboardStore } from '@/stores/dashboard';
import type { RiepilogoMensileResult, PivotCategoriaRiga } from '../../../ipc/types';

const COLOR_ENTRATE = '#22c55e';
const COLOR_USCITE = '#ef4444';

const DONUT_COLORS = [
  '#3b82f6',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
  '#84cc16',
  '#14b8a6',
];

const EURO_FMT = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const EURO_FMT_DEC = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

function formatEuro(v: number): string {
  return Math.abs(v) >= 1000 ? EURO_FMT.format(v) : EURO_FMT_DEC.format(v);
}

function buildBarTheme(isDark: boolean): AgChartTheme {
  return {
    baseTheme: isDark ? 'ag-default-dark' : 'ag-default',
    palette: {
      fills: [COLOR_ENTRATE, COLOR_USCITE],
      strokes: [COLOR_ENTRATE, COLOR_USCITE],
    },
  };
}

function buildDonutTheme(isDark: boolean): AgChartTheme {
  return {
    baseTheme: isDark ? 'ag-default-dark' : 'ag-default',
    palette: {
      fills: DONUT_COLORS,
      strokes: DONUT_COLORS,
    },
  };
}

interface TrendBadgeProps {
  pct: number | null;
  invert?: boolean;
}

function TrendBadge({ pct, invert = false }: TrendBadgeProps) {
  if (pct === null) return <span className="text-xs text-muted-foreground">—</span>;

  const positive = invert ? pct < 0 : pct > 0;
  const neutral = pct === 0;
  const abs = Math.abs(pct).toFixed(1);

  const colorCls = neutral
    ? 'text-muted-foreground'
    : positive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  const Icon = neutral ? Minus : positive ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${colorCls}`}>
      <Icon size={12} aria-hidden />
      {pct > 0 ? '+' : ''}{abs}% vs anno prec.
    </span>
  );
}

interface KpiTileProps {
  label: string;
  value: number;
  colorCls?: string;
  trendPct: number | null;
  invertTrend?: boolean;
}

function KpiTile({ label, value, colorCls, trendPct, invertTrend }: KpiTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={`text-2xl font-semibold tabular-nums ${colorCls ?? 'text-foreground'}`}>
        {formatEuro(value)}
      </span>
      <TrendBadge pct={trendPct} invert={invertTrend} />
    </div>
  );
}

interface MesiRossoTileProps {
  count: number;
  delta: number | null;
}

function MesiRossoTile({ count, delta }: MesiRossoTileProps) {
  const deltaLabel =
    delta === null ? null : delta === 0 ? (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        <Minus size={12} aria-hidden />
        invariato
      </span>
    ) : delta > 0 ? (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-600 dark:text-red-400">
        <TrendingUp size={12} aria-hidden />+{delta} vs anno prec.
      </span>
    ) : (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400">
        <TrendingDown size={12} aria-hidden />{delta} vs anno prec.
      </span>
    );

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <span className="text-xs font-medium text-muted-foreground">Mesi in rosso</span>
      <span
        className={`text-2xl font-semibold tabular-nums ${
          count > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'
        }`}
      >
        {count}
      </span>
      {deltaLabel ?? (
        <span className="text-xs text-muted-foreground">
          mese{count !== 1 ? 'i' : ''} con saldo negativo
        </span>
      )}
    </div>
  );
}

function EmptyState({ anno }: { anno: number }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-24 text-center"
    >
      <PieChart size={40} className="text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium text-foreground">Nessun movimento nel {anno}</p>
      <p className="text-xs text-muted-foreground">
        Aggiungi movimenti nella sezione Movimenti per vedere la dashboard.
      </p>
    </div>
  );
}

interface YearNavProps {
  anno: number;
  onPrev: () => void;
  onNext: () => void;
}

function YearNav({ anno, onPrev, onNext }: YearNavProps) {
  return (
    <div className="flex items-center gap-2" aria-label="Navigatore anno">
      <button
        onClick={onPrev}
        aria-label="Anno precedente"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <ChevronLeft size={16} aria-hidden />
      </button>
      <span className="min-w-12 text-center text-sm font-semibold tabular-nums text-foreground">
        {anno}
      </span>
      <button
        onClick={onNext}
        aria-label="Anno successivo"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <ChevronRight size={16} aria-hidden />
      </button>
    </div>
  );
}

function saldoColor(saldo: number): string {
  if (saldo > 0) return 'text-green-600 dark:text-green-400';
  if (saldo < 0) return 'text-red-600 dark:text-red-400';
  return 'text-foreground';
}

function DeltaCell({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-muted-foreground">—</span>;
  const colorCls =
    delta > 0
      ? 'text-green-600 dark:text-green-400'
      : delta < 0
      ? 'text-red-600 dark:text-red-400'
      : 'text-muted-foreground';
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 tabular-nums ${colorCls}`}>
      <Icon size={12} aria-hidden />
      {delta > 0 ? '+' : ''}
      {formatEuro(delta)}
    </span>
  );
}

interface RiepilogoMensileTableProps {
  data: RiepilogoMensileResult;
}

function RiepilogoMensileTable({ data }: RiepilogoMensileTableProps) {
  const { righe, totale, media, mediana } = data;

  return (
    <section aria-labelledby="riepilogo-heading">
      <h3 id="riepilogo-heading" className="mb-3 text-sm font-medium text-muted-foreground">
        Riepilogo mensile
      </h3>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th scope="col" className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                Mese
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-right font-medium text-muted-foreground"
              >
                Entrate
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-right font-medium text-muted-foreground"
              >
                Uscite
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-right font-medium text-muted-foreground"
              >
                Saldo
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-right font-medium text-muted-foreground"
              >
                Δ vs mese prec.
              </th>
            </tr>
          </thead>
          <tbody>
            {righe.map((r) => (
              <tr
                key={r.mese}
                className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
              >
                <td className="px-4 py-2 font-medium text-foreground">{r.nome_mese}</td>
                <td className="px-4 py-2 text-right tabular-nums text-green-600 dark:text-green-400">
                  {r.entrate > 0 ? formatEuro(r.entrate) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-red-600 dark:text-red-400">
                  {r.uscite > 0 ? formatEuro(r.uscite) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className={`px-4 py-2 text-right tabular-nums ${saldoColor(r.saldo)}`}>
                  {formatEuro(r.saldo)}
                </td>
                <td className="px-4 py-2 text-right">
                  <DeltaCell delta={r.delta} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {(
              [
                { label: 'Totale', row: totale },
                { label: 'Media', row: media },
                { label: 'Mediana', row: mediana },
              ] as const
            ).map(({ label, row }) => (
              <tr key={label} className="border-t border-border bg-muted/40 font-medium">
                <td className="px-4 py-2 text-foreground">{label}</td>
                <td className="px-4 py-2 text-right tabular-nums text-green-600 dark:text-green-400">
                  {formatEuro(row.entrate)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-red-600 dark:text-red-400">
                  {formatEuro(row.uscite)}
                </td>
                <td className={`px-4 py-2 text-right tabular-nums ${saldoColor(row.saldo)}`}>
                  {formatEuro(row.saldo)}
                </td>
                <td className="px-4 py-2" />
              </tr>
            ))}
          </tfoot>
        </table>
      </div>
    </section>
  );
}

const NOMI_MESI_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

interface PivotCategorieTableProps {
  righe: PivotCategoriaRiga[];
  tipo: 'uscita' | 'entrata';
}

function PivotCategorieTable({ righe, tipo }: PivotCategorieTableProps) {
  const headingId = `pivot-${tipo}-heading`;
  const label = tipo === 'uscita' ? 'Uscite per Categoria' : 'Entrate per Categoria';
  const amountCls =
    tipo === 'uscita' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';

  if (righe.length === 0) {
    return (
      <section aria-labelledby={headingId}>
        <h3 id={headingId} className="mb-3 text-sm font-medium text-muted-foreground">
          {label}
        </h3>
        <p className="text-xs text-muted-foreground">
          Nessun {tipo === 'uscita' ? "uscita" : "entrata"} registrata per quest'anno.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="mb-3 text-sm font-medium text-muted-foreground">
        {label}
      </h3>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-muted/40 px-4 py-2.5 text-left font-medium text-muted-foreground"
              >
                Categoria
              </th>
              {NOMI_MESI_SHORT.map((m) => (
                <th
                  key={m}
                  scope="col"
                  className="px-3 py-2.5 text-right font-medium text-muted-foreground"
                >
                  {m}
                </th>
              ))}
              <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                Totale
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                Media
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                Mediana
              </th>
            </tr>
          </thead>
          <tbody>
            {righe.map((r) => (
              <tr
                key={r.categoria}
                className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
              >
                <td className="sticky left-0 z-10 bg-card px-4 py-2 font-medium text-foreground whitespace-nowrap hover:bg-muted/20">
                  {r.categoria}
                </td>
                {r.mesi.map((v, i) => (
                  <td key={i} className={`px-3 py-2 text-right tabular-nums ${v === 0 ? 'text-muted-foreground' : amountCls}`}>
                    {v === 0 ? '—' : formatEuro(v)}
                  </td>
                ))}
                <td className={`px-3 py-2 text-right tabular-nums font-medium ${amountCls}`}>
                  {formatEuro(r.totale)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {formatEuro(r.media)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {formatEuro(r.mediana)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function DashboardScreen() {
  const { theme } = useThemeStore();
  const isDark = getResolvedTheme(theme) === 'dark';

  const {
    anno, kpi, serieMensili, breakdownCategorie, trend, riepilogoMensile,
    pivotUscite, pivotEntrate, loading, error, fetch, setAnno,
  } = useDashboardStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  const hasData = kpi !== null && (kpi.entrate > 0 || kpi.uscite > 0);

  const barOptions = useMemo(
    () =>
      ({
        theme: buildBarTheme(isDark),
        data: serieMensili,
        series: [
          { type: 'bar', xKey: 'nome_mese', yKey: 'entrate', yName: 'Entrate' },
          { type: 'bar', xKey: 'nome_mese', yKey: 'uscite', yName: 'Uscite' },
        ],
        legend: { position: 'bottom' },
      }) as AgChartOptions,
    [isDark, serieMensili],
  );

  const donutOptions = useMemo(
    () =>
      ({
        theme: buildDonutTheme(isDark),
        data: breakdownCategorie,
        series: [
          {
            type: 'donut',
            angleKey: 'totale',
            calloutLabelKey: 'categoria_nome',
            innerRadiusRatio: 0.6,
          },
        ],
        legend: { position: 'right' },
      }) as AgChartOptions,
    [isDark, breakdownCategorie],
  );

  return (
    <div className="flex flex-col gap-6" aria-busy={loading}>
      {/* Header: navigatore anno */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Anno finanziario</h2>
        <YearNav
          anno={anno}
          onPrev={() => setAnno(anno - 1)}
          onNext={() => setAnno(anno + 1)}
        />
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" aria-label="Caricamento KPI">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          Errore nel caricamento della dashboard: {error}
        </div>
      )}

      {!loading && !error && !hasData && <EmptyState anno={anno} />}

      {!loading && !error && hasData && kpi && (
        <>
          {/* KPI tiles */}
          <section aria-labelledby="kpi-heading">
            <h3 id="kpi-heading" className="sr-only">KPI annuali</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiTile
                label="Entrate"
                value={kpi.entrate}
                colorCls="text-green-600 dark:text-green-400"
                trendPct={trend?.delta_entrate_pct ?? null}
              />
              <KpiTile
                label="Uscite"
                value={kpi.uscite}
                colorCls="text-red-600 dark:text-red-400"
                trendPct={trend?.delta_uscite_pct ?? null}
                invertTrend
              />
              <KpiTile
                label="Saldo"
                value={kpi.saldo}
                colorCls={saldoColor(kpi.saldo)}
                trendPct={trend?.delta_saldo_pct ?? null}
              />
              <MesiRossoTile
                count={kpi.mesi_in_rosso}
                delta={trend?.delta_mesi_in_rosso ?? null}
              />
            </div>
          </section>

          {riepilogoMensile && <RiepilogoMensileTable data={riepilogoMensile} />}

          <PivotCategorieTable righe={pivotUscite} tipo="uscita" />
          <PivotCategorieTable righe={pivotEntrate} tipo="entrata" />

          {/* Grafici */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section aria-labelledby="bar-heading" className="lg:col-span-2">
              <h3 id="bar-heading" className="mb-3 text-sm font-medium text-muted-foreground">
                Andamento mensile
              </h3>
              <div className="h-64 w-full rounded-lg border border-border overflow-hidden">
                <AgCharts options={barOptions} style={{ height: '100%' }} />
              </div>
            </section>

            {breakdownCategorie.length > 0 && (
              <section aria-labelledby="donut-heading">
                <h3 id="donut-heading" className="mb-3 text-sm font-medium text-muted-foreground">
                  Uscite per categoria
                </h3>
                <div className="h-64 w-full rounded-lg border border-border overflow-hidden">
                  <AgCharts options={donutOptions} style={{ height: '100%' }} />
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
