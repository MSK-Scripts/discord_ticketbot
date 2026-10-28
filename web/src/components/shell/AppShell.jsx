import { useState } from 'react';
import { List, Ticket, X } from '@/components/icons.jsx';
import { Drawer } from '@/components/ui/dialog.jsx';
import { cn } from '@/lib/utils.js';
import { useT } from '@/i18n.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { TopBarThemeSwitch } from './ThemeSwitch.jsx';

/**
 * The frame of the dashboard, after the shop's dashboard AppShell
 * (msk-shop components/dashboard/AppShell.tsx):
 *
 * - a sticky top bar with the 4 px accent stripe, the product name, below
 *   the sidebar breakpoint the menu button and the current page, and on the
 *   right the theme switch and the account menu;
 * - a sidebar with labelled groups from 1024 px, a drawer on the native
 *   <dialog> below that;
 * - on a phone the most used areas as a bar at the bottom as well, because
 *   hidden navigation is found about half as often;
 * - the one <main id="main"> the skip link points to, with a content column
 *   that stops at --app-content and is a size container for the views.
 *
 * Without `me` it is the signed-out frame: top bar and content only.
 */

/** A link that navigates inside the app but keeps its href for a new tab. */
function NavLink({ href, onNavigate, className, children, ...props }) {
  return (
    <a
      href={href}
      onClick={e => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onNavigate();
      }}
      className={className}
      {...props}
    >
      {children}
    </a>
  );
}

const navItemClass = cn(
  'flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-foreground transition-colors duration-150 hover:bg-muted',
  // Current page: soft accent surface, accent label and a bar at the inline
  // start, so it is not told by colour alone.
  'aria-[current=page]:bg-accent-soft aria-[current=page]:font-semibold aria-[current=page]:text-primary-text',
  'aria-[current=page]:shadow-[inset_3px_0_0_var(--primary-text)]',
);

function NavList({ groups, current, onNavigate, label }) {
  const t = useT();
  return (
    <nav aria-label={label} className="grid gap-5">
      {groups.map(group => (
        <div key={group.id} className="grid gap-1">
          {group.label && <h2 className="kicker px-3 text-muted-foreground">{group.label}</h2>}
          <ul className="grid gap-0.5">
            {group.items.map(({ id, href, icon: Icon }) => (
              <li key={id}>
                <NavLink
                  href={href}
                  onNavigate={() => onNavigate(id)}
                  aria-current={current === id ? 'page' : undefined}
                  className={navItemClass}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="min-w-0 truncate">{t(`nav.${id}`)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand({ href, onNavigate, compact = false }) {
  const t = useT();
  const content = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-primary-text">
        <Ticket className="size-5" weight="bold" />
      </span>
      {/* With a page title beside it, a phone shows only the mark. */}
      <span className={cn('font-display text-lead font-bold whitespace-nowrap', compact && 'max-sm:sr-only')}>{t('nav.brand')}</span>
    </>
  );
  if (!href) return <span className="flex min-h-11 shrink-0 items-center gap-2.5">{content}</span>;
  return (
    <NavLink href={href} onNavigate={onNavigate} className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2.5 rounded-md text-foreground">
      {content}
    </NavLink>
  );
}

function TopBar({ children }) {
  return (
    <header className="sticky top-0 z-40 border-t-4 border-b border-t-brand bg-card">
      <div className="flex min-h-[var(--app-topbar)] items-center gap-1.5 px-[var(--app-gutter)] sm:gap-2">
        {children}
      </div>
    </header>
  );
}

export function SkipLink() {
  const t = useT();
  return <a href="#main" className="skip-link">{t('app.skipToContent')}</a>;
}

export function AppShell({ me, groups, current, pageTitle, homeHref, onNavigate, onSignOut, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const t = useT();
  const items = groups.flatMap(g => g.items);
  const tabItems = items.filter(i => i.mobile).slice(0, 4);
  const showTabs = tabItems.length >= 2;
  const goHome = () => onNavigate(items[0]?.id);

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <TopBar>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-haspopup="dialog"
          className="-ml-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-muted lg:hidden"
        >
          <List className="size-6" />
          <span className="sr-only">{t('nav.menuOpen')}</span>
        </button>
        <Brand href={homeHref} onNavigate={goHome} compact={Boolean(pageTitle)} />
        {pageTitle && (
          // The page stays named on a phone, where the sidebar is folded away.
          <span className="ml-1 min-w-0 truncate border-l pl-3 text-muted-foreground lg:hidden">{pageTitle}</span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <TopBarThemeSwitch />
          <AccountMenu me={me} onSignOut={onSignOut} />
        </div>
      </TopBar>

      <div className="flex flex-1">
        {/* The aside runs the full height of the page; its content sticks below the top bar. */}
        <aside className="hidden w-[var(--app-sidebar)] shrink-0 border-r bg-card lg:block">
          <div className="sticky top-[calc(var(--app-topbar)+5px)] max-h-[calc(100dvh-var(--app-topbar)-5px)] overflow-y-auto p-3">
            <NavList groups={groups} current={current} onNavigate={onNavigate} label={t('nav.navigation')} />
          </div>
        </aside>

        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          label={t('nav.navigation')}
          header={(
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-t-4 border-b border-t-brand bg-card px-4 py-2">
              <span className="font-display text-lead font-bold">{t('nav.brand')}</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
              >
                <X className="size-5" />
                <span className="sr-only">{t('nav.menuClose')}</span>
              </button>
            </div>
          )}
        >
          <div className="p-3">
            <NavList
              groups={groups}
              current={current}
              onNavigate={id => { setDrawerOpen(false); onNavigate(id); }}
              label={t('nav.navigation')}
            />
          </div>
        </Drawer>

        <main
          id="main"
          tabIndex={-1}
          className={cn(
            'min-w-0 flex-1 px-[var(--app-gutter)] py-[var(--app-gutter-y)] focus-visible:outline-none',
            showTabs && 'pb-[calc(var(--app-tabbar)+var(--app-gutter-y))] lg:pb-[var(--app-gutter-y)]',
          )}
        >
          <div className="@container mx-auto w-full max-w-[var(--app-content)]">{children}</div>
        </main>
      </div>

      {showTabs && (
        <nav
          aria-label={t('nav.quickNav')}
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
        >
          <ul className="grid h-[var(--app-tabbar)] auto-cols-fr grid-flow-col">
            {tabItems.map(({ id, href, icon: Icon }) => (
              <li key={id} className="min-w-0">
                <NavLink
                  href={href}
                  onNavigate={() => onNavigate(id)}
                  aria-current={current === id ? 'page' : undefined}
                  className={cn(
                    'flex h-full min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-label font-semibold text-muted-foreground',
                    'aria-[current=page]:text-primary-text aria-[current=page]:shadow-[inset_0_3px_0_var(--primary-text)]',
                  )}
                >
                  <Icon className="size-5" />
                  <span className="w-full truncate text-center">{t(`nav.${id}`)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

/** The frame for the screens before or without access: top bar and content. */
export function SignedOutShell({ children }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <TopBar>
        <Brand />
        <div className="ml-auto flex shrink-0 items-center">
          <TopBarThemeSwitch />
        </div>
      </TopBar>
      <main id="main" tabIndex={-1} className="flex flex-1 items-start justify-center px-[var(--app-gutter)] py-[clamp(2rem,1rem+6vh,6rem)] focus-visible:outline-none">
        {children}
      </main>
    </div>
  );
}
