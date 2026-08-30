import { create } from 'zustand';
import type { DashboardKPI, SerieMensile, BreakdownCategoria, TrendYoY, RiepilogoMensileResult, PivotCategoriaRiga, TrendMensile } from '../../ipc/types';

interface DashboardState {
  anno: number;
  kpi: DashboardKPI | null;
  serieMensili: SerieMensile[];
  breakdownCategorie: BreakdownCategoria[];
  trend: TrendYoY | null;
  trendMensile: TrendMensile | null;
  riepilogoMensile: RiepilogoMensileResult | null;
  pivotUscite: PivotCategoriaRiga[];
  pivotEntrate: PivotCategoriaRiga[];
  loading: boolean;
  error: string | null;

  setAnno: (anno: number) => void;
  fetch: () => Promise<void>;
}

const currentYear = new Date().getFullYear();

export const useDashboardStore = create<DashboardState>()((set, get) => ({
  anno: currentYear,
  kpi: null,
  serieMensili: [],
  breakdownCategorie: [],
  trend: null,
  trendMensile: null,
  riepilogoMensile: null,
  pivotUscite: [],
  pivotEntrate: [],
  loading: false,
  error: null,

  setAnno: (anno) => {
    set({ anno });
    get().fetch();
  },

  fetch: async () => {
    const { anno } = get();
    set({ loading: true, error: null });
    try {
      const [kpi, serieMensili, breakdownCategorie, trend, trendMensile, riepilogoMensile, pivotUscite, pivotEntrate] =
        await Promise.all([
          window.electronAPI.dashboard.kpi(anno),
          window.electronAPI.dashboard.serieMensili(anno),
          window.electronAPI.dashboard.breakdownCategorie(anno),
          window.electronAPI.dashboard.trendYoY(anno),
          window.electronAPI.dashboard.trendMensile(anno),
          window.electronAPI.dashboard.riepilogoMensile(anno),
          window.electronAPI.dashboard.pivotCategorie(anno, 'uscita'),
          window.electronAPI.dashboard.pivotCategorie(anno, 'entrata'),
        ]);
      set({ kpi, serieMensili, breakdownCategorie, trend, trendMensile, riepilogoMensile, pivotUscite, pivotEntrate, loading: false });
    } catch (err) {
      set({ loading: false, error: String(err) });
    }
  },
}));
