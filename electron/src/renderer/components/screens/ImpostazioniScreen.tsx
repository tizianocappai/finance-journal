import { useThemeStore, type Theme } from '@/stores/theme';
import { cn } from '@/lib/utils';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Chiaro' },
  { value: 'dark', label: 'Scuro' },
  { value: 'system', label: 'Sistema' },
];

export default function ImpostazioniScreen() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="max-w-lg space-y-8">
      <section aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" className="mb-1 text-sm font-semibold text-foreground">
          Aspetto
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Scegli il tema dell&apos;applicazione.
        </p>

        <div className="flex gap-2" role="group" aria-label="Tema">
          {THEME_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={cn(
                'rounded-md border px-4 py-2 text-sm transition-colors',
                'outline-none focus-visible:ring-2 focus-visible:ring-ring',
                theme === value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="about-heading">
        <h2 id="about-heading" className="mb-1 text-sm font-semibold text-foreground">
          Informazioni
        </h2>
        <dl className="space-y-1 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <dt className="font-medium text-foreground">Versione</dt>
            <dd>0.1.0</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium text-foreground">Nome</dt>
            <dd>No Budget</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
