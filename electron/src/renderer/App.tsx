import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { AgCharts } from 'ag-charts-community';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app';

ModuleRegistry.registerModules([AllCommunityModule]);
void AgCharts;

export default function App() {
  const ready = useAppStore((s) => s.ready);

  return (
    <div
      className={cn(
        'flex h-screen w-screen flex-col items-center justify-center gap-6',
        'bg-background text-foreground',
      )}
    >
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight">No Budget</h1>
        <p className="text-sm text-muted-foreground">
          {ready ? 'Scaffold pronto — sviluppo in corso.' : 'Caricamento...'}
        </p>
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>React 19</span>
        <span>·</span>
        <span>Tailwind v4</span>
        <span>·</span>
        <span>AG Grid 36</span>
        <span>·</span>
        <span>AG Charts 14</span>
        <span>·</span>
        <span>Zustand 5</span>
      </div>
    </div>
  );
}
