import { useEffect, useMemo } from 'react';
import { AgCharts } from 'ag-charts-react';
import type { AgCartesianChartOptions, AgPolarChartOptions } from 'ag-charts-types';
import { usePatrimonioStore } from '@/stores/patrimonio';
import type { PatrimonioGruppo, PatrimonioValore, PatrimonioVoce } from '../../../ipc/types';

const MESI_LABEL = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const QUARTERS_LABEL = ['Q1', 'Q2', 'Q3', 'Q4'];
const QUARTER_MESI = [3, 6, 9, 12];

function mesiForGranularita(granularita: 'mese' | 'quarter'): { label: string; mese: number }[] {
  if (granularita === 'mese') {
    return MESI_LABEL.map((label, i) => ({ label, mese: i + 1 }));
  }
  return QUARTERS_LABEL.map((label, i) => ({ label, mese: QUARTER_MESI[i] }));
}

function getLastValore(valori: PatrimonioValore[], voceId: number, anno: number, mese: number): number {
  const v = valori.find((x) => x.voce_id === voceId && x.anno === anno && x.mese === mese);
  return v?.importo ?? 0;
}

function formatEur(v: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}

interface EmptyChartProps {
  label: string;
}

function EmptyChart({ label }: EmptyChartProps) {
  return (
    <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-card">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// --- Line chart: Patrimonio Netto ---

interface NettoLineChartProps {
  anno: number;
  granularita: 'mese' | 'quarter';
  voci: PatrimonioVoce[];
  valori: PatrimonioValore[];
}

function NettoLineChart({ anno, granularita, voci, valori }: NettoLineChartProps) {
  const periodi = mesiForGranularita(granularita);

  const data = useMemo(() => {
    return periodi.map(({ label, mese }) => {
      let attivi = 0;
      let passivi = 0;
      for (const voce of voci) {
        const imp = getLastValore(valori, voce.id, anno, mese);
        if (voce.tipo === 'attivo') attivi += imp;
        else passivi += imp;
      }
      return { periodo: label, patrimonioNetto: attivi - passivi };
    });
  }, [periodi, voci, valori, anno]);

  const hasData = data.some((d) => d.patrimonioNetto !== 0);
  if (!hasData) return <EmptyChart label="Nessun dato per il periodo selezionato" />;

  const options: AgCartesianChartOptions = {
    data,
    series: [
      {
        type: 'line',
        xKey: 'periodo',
        yKey: 'patrimonioNetto',
        yName: 'Patrimonio Netto',
        tooltip: {
          renderer: (params: any) =>
            `${params.datum.periodo}: ${formatEur(params.datum.patrimonioNetto)}`,
        },
      },
    ],
    axes: {
      x: { type: 'category' },
      y: {
        type: 'number',
        label: { formatter: ({ value }: { value: number }) => formatEur(value) },
      },
    },
    background: { fill: 'transparent' },
  };

  return (
    <div style={{ height: 240 }}>
      <AgCharts options={options} style={{ height: '100%' }} />
    </div>
  );
}

// --- Area chart: Attivi e Passivi ---

interface AttiviPassiviAreaChartProps {
  anno: number;
  granularita: 'mese' | 'quarter';
  voci: PatrimonioVoce[];
  valori: PatrimonioValore[];
}

function AttiviPassiviAreaChart({ anno, granularita, voci, valori }: AttiviPassiviAreaChartProps) {
  const periodi = mesiForGranularita(granularita);

  const data = useMemo(() => {
    return periodi.map(({ label, mese }) => {
      let attivi = 0;
      let passivi = 0;
      for (const voce of voci) {
        const imp = getLastValore(valori, voce.id, anno, mese);
        if (voce.tipo === 'attivo') attivi += imp;
        else passivi += imp;
      }
      return { periodo: label, attivi, passivi };
    });
  }, [periodi, voci, valori, anno]);

  const hasData = data.some((d) => d.attivi !== 0 || d.passivi !== 0);
  if (!hasData) return <EmptyChart label="Nessun dato per il periodo selezionato" />;

  const options: AgCartesianChartOptions = {
    data,
    series: [
      {
        type: 'area',
        xKey: 'periodo',
        yKey: 'attivi',
        yName: 'Attivi',
        stacked: true,
        tooltip: {
          renderer: (params: any) =>
            `${params.datum.periodo}: ${formatEur(params.datum.attivi)}`,
        },
      },
      {
        type: 'area',
        xKey: 'periodo',
        yKey: 'passivi',
        yName: 'Passivi',
        stacked: true,
        tooltip: {
          renderer: (params: any) =>
            `${params.datum.periodo}: ${formatEur(params.datum.passivi)}`,
        },
      },
    ],
    axes: {
      x: { type: 'category' },
      y: {
        type: 'number',
        label: { formatter: ({ value }: { value: number }) => formatEur(value) },
      },
    },
    background: { fill: 'transparent' },
  };

  return (
    <div style={{ height: 240 }}>
      <AgCharts options={options} style={{ height: '100%' }} />
    </div>
  );
}

// --- Donut chart helper ---

interface DonutEntry {
  gruppo: string;
  importo: number;
}

function buildDonutData(
  tipo: 'attivo' | 'passivo',
  voci: PatrimonioVoce[],
  gruppi: PatrimonioGruppo[],
  valori: PatrimonioValore[],
  anno: number,
  granularita: 'mese' | 'quarter',
): DonutEntry[] {
  const periodi = mesiForGranularita(granularita);
  const lastMese = periodi[periodi.length - 1].mese;

  const vociTipo = voci.filter((v) => v.tipo === tipo && v.attiva === 1);
  const byGruppo = new Map<string, number>();

  for (const voce of vociTipo) {
    const imp = getLastValore(valori, voce.id, anno, lastMese);
    if (imp === 0) continue;
    const gruppoNome = gruppi.find((g) => g.id === voce.gruppo_id)?.nome ?? 'Senza gruppo';
    byGruppo.set(gruppoNome, (byGruppo.get(gruppoNome) ?? 0) + imp);
  }

  return Array.from(byGruppo.entries())
    .map(([gruppo, importo]) => ({ gruppo, importo }))
    .filter((e) => e.importo > 0);
}

interface DonutChartProps {
  title: string;
  data: DonutEntry[];
}

function DonutChart({ title, data }: DonutChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <EmptyChart label="Nessun dato per il periodo selezionato" />
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.importo, 0);

  const options: AgPolarChartOptions = {
    data,
    series: [
      {
        type: 'donut',
        calloutLabelKey: 'gruppo',
        angleKey: 'importo',
        sectorLabelKey: 'importo',
        tooltip: {
          renderer: (params: any) =>
            `${params.datum.gruppo}: ${formatEur(params.datum.importo)} (${((params.datum.importo / total) * 100).toFixed(1)}%)`,
        },
      },
    ],
    background: { fill: 'transparent' },
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <div style={{ height: 240 }}>
        <AgCharts options={options} style={{ height: '100%' }} />
      </div>
    </div>
  );
}

// --- Screen ---

export default function PatrimonioAnalisiScreen() {
  const { anno, granularita, voci, gruppi, valori, fetchVoci } = usePatrimonioStore();

  useEffect(() => {
    fetchVoci(anno);
  }, [anno, granularita, fetchVoci]);

  const attiviDonut = useMemo(
    () => buildDonutData('attivo', voci, gruppi, valori, anno, granularita),
    [voci, gruppi, valori, anno, granularita],
  );

  const passiviDonut = useMemo(
    () => buildDonutData('passivo', voci, gruppi, valori, anno, granularita),
    [voci, gruppi, valori, anno, granularita],
  );

  return (
    <div className="space-y-8">
      <section aria-label="Patrimonio Netto nel tempo">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Patrimonio Netto</h2>
        <NettoLineChart anno={anno} granularita={granularita} voci={voci} valori={valori} />
      </section>

      <section aria-label="Attivi e Passivi nel tempo">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Attivi e Passivi</h2>
        <AttiviPassiviAreaChart anno={anno} granularita={granularita} voci={voci} valori={valori} />
      </section>

      <section aria-label="Composizione per gruppo">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Composizione</h2>
        <div className="grid grid-cols-2 gap-6">
          <DonutChart title="Attivi per gruppo" data={attiviDonut} />
          <DonutChart title="Passivi per gruppo" data={passiviDonut} />
        </div>
      </section>
    </div>
  );
}
