import { NavLink, Outlet, useMatch } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Dashboard', to: '/resoconto/dashboard' },
  { label: 'Movimenti', to: '/resoconto/movimenti' },
] as const;

function TabChip({ label, to }: { label: string; to: string }) {
  const match = useMatch(to);
  const isActive = !!match;

  return (
    <NavLink
      to={to}
      end
      role="tab"
      aria-selected={isActive}
      className={cn(
        'rounded-full px-4 py-1 text-sm font-medium transition-colors',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {label}
    </NavLink>
  );
}

export default function ResocontoLayout() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-6 py-3">
        <h1 className="mb-3 text-base font-semibold text-foreground">Resoconto Personale</h1>

        <div className="flex gap-1" role="tablist" aria-label="Sezioni resoconto">
          {TABS.map((tab) => (
            <TabChip key={tab.to} {...tab} />
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
