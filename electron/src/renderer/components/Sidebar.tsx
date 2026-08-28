import { NavLink } from 'react-router-dom';
import { BarChart2, Settings, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  to: string;
  Icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Resoconto Personale', to: '/resoconto', Icon: BarChart2 },
  { label: 'Impostazioni', to: '/impostazioni', Icon: Settings },
];

export default function Sidebar() {
  return (
    <nav
      className="flex h-full w-56 flex-shrink-0 flex-col border-r border-border bg-card py-4 px-2"
      aria-label="Navigazione principale"
    >
      <div className="mb-6 px-3 py-1">
        <span className="text-sm font-semibold tracking-tight text-foreground">No Budget</span>
      </div>

      <ul role="list" className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ label, to, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    aria-hidden
                    className={isActive ? 'text-foreground' : 'text-muted-foreground'}
                  />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
