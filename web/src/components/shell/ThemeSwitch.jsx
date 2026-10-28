import { Monitor, Moon, Sun } from '@/components/icons.jsx';
import { Popover } from '@/components/ui/popover.jsx';
import { cn } from '@/lib/utils.js';
import { useT } from '@/i18n.jsx';
import { useTheme } from '@/theme.jsx';

const ITEMS = [
  { value: 'system', Icon: Monitor },
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
];

/**
 * System, light or dark, as three toggle buttons with aria-pressed (shop
 * ThemeSwitch): every choice is visible at once and a screen reader announces
 * which one is on. The labels show where there is room and stay readable to
 * a screen reader where there is not.
 */
export function ThemeSwitch({ showLabels = false, className, onChoose }) {
  const { choice, setChoice } = useTheme();
  const t = useT();
  return (
    <div
      role="group"
      aria-label={t('theme.label')}
      className={cn('inline-flex w-fit overflow-hidden rounded-md border-[1.5px] border-input', className)}
    >
      {ITEMS.map(({ value, Icon }, i) => (
        <button
          key={value}
          type="button"
          aria-pressed={choice === value}
          title={showLabels ? undefined : t(`theme.${value}`)}
          onClick={() => { setChoice(value); onChoose?.(); }}
          className={cn(
            'inline-flex min-h-11 min-w-11 flex-1 cursor-pointer items-center justify-center gap-1.5 px-2.5 text-small font-semibold transition-colors duration-150',
            // The group clips its corners, so the focus ring is drawn inside.
            'focus-visible:outline-offset-[-3px]',
            i > 0 && 'border-l-[1.5px] border-input',
            'text-foreground hover:bg-muted aria-pressed:bg-foreground aria-pressed:text-background',
          )}
        >
          <Icon className="size-[1.15rem] shrink-0" />
          <span className={showLabels ? undefined : 'sr-only'}>{t(`theme.${value}`)}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * The switch for the top bar. From 640 px the three buttons sit in the bar;
 * below that one button shows the current theme and opens them in a popover,
 * so the bar keeps room for the page title down to 320 px.
 */
export function TopBarThemeSwitch() {
  const { choice } = useTheme();
  const t = useT();
  const Current = ITEMS.find(i => i.value === choice)?.Icon ?? Monitor;
  return (
    <>
      <ThemeSwitch className="hidden sm:inline-flex" showLabels={false} />
      <div className="sm:hidden">
        <Popover
          label={t('theme.label')}
          buttonLabel={`${t('theme.label')}: ${t(`theme.${choice}`)}`}
          buttonContent={<Current className="size-6" />}
          panelClassName="w-auto"
        >
          {close => (
            <div className="grid gap-2">
              <p className="kicker text-muted-foreground">{t('theme.label')}</p>
              <ThemeSwitch showLabels onChoose={close} />
            </div>
          )}
        </Popover>
      </div>
    </>
  );
}
