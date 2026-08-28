import { create } from 'zustand';
import type { DashboardKPI, SerieMensile, BreakdownCategoria, TrendYoY } from '../../ipc/types';

interface DashboardState {
  anno: number;
  kpi: DashboardKPI | null;
  serieMensili: SerieMensile[];
  breakdownCategorie: BreakdownCategoria[];
  trend: TrendYoY | null;
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
      const [kpi, serieMensili, breakdownCategorie, trend] = await Promise.all([
        window.electronAPI.dashboard.kpi(anno),
        window.electronAPI.dashboard.serieMensili(anno),
        window.electronAPI.dashboard.breakdownCategorie(anno),
        window.electronAPI.dashboard.trendYoY(anno),
      ]);
      set({ kpi, serieMensili, breakdownCategorie, trend, loading: false });
    } catch (err) {
      set({ loading: false, error: String(err) });
    }
  },
}));
