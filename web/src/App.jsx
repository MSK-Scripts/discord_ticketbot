import { useEffect, useState } from 'react';
import { ChartBar, GearSix, Info, Palette, Robot, ShieldCheck, SignIn, SignOut, Ticket, Tray, WarningCircle } from '@/components/icons.jsx';
import { api, logout } from './api.js';
import { useRouter, parseRoute, viewPath } from './router.js';
import { useI18n } from './i18n.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { AppShell, SignedOutShell } from '@/components/shell/AppShell.jsx';
import { LanguagePicker } from '@/components/shell/AccountMenu.jsx';

import Tickets from './views/Tickets.jsx';
import MyTickets from './views/MyTickets.jsx';
import Stats from './views/Stats.jsx';
import Config from './views/Config.jsx';
import BotControl from './views/BotControl.jsx';
import Access from './views/Access.jsx';
import Settings from './views/Settings.jsx';

/**
 * Navigation is derived from the permissions the SERVER reported. This is only
 * cosmetic: every route is enforced server-side as well. Hiding a nav item the
 * user cannot use is a UX decision, never the security boundary.
 *
 * The order is the order of the sidebar and decides the landing view (the
 * first one allowed). `group` places an item under a labelled group, `mobile`
 * also puts it in the bar at the bottom of a phone (at most four are shown).
 */
const NAV = [
  { id: 'mine',     icon: Ticket,      permission: null,                               group: 'support', mobile: true },
  { id: 'tickets',  icon: Tray,        permission: 'tickets.view',                     group: 'support', mobile: true },
  { id: 'stats',    icon: ChartBar,    permission: 'stats.view',                       group: 'support', mobile: true },
  { id: 'config',   icon: GearSix,     permission: ['config.view', 'config.edit'],     group: 'bot' },
  { id: 'bot',      icon: Robot,       permission: 'bot.control',                      group: 'bot',     mobile: true },
  { id: 'access',   icon: ShieldCheck, permission: 'access.manage',                    group: 'admin' },
  { id: 'settings', icon: Palette,     permission: ['settings.view', 'settings.edit'], group: 'admin' },
];

const GROUPS = [
  { id: 'support', labelKey: 'nav.groupSupport' },
  { id: 'bot',     labelKey: 'nav.groupBot' },
  { id: 'admin',   labelKey: 'nav.groupAdmin' },
];

const allowed = (me, item) => {
  if (!item.permission) return true;
  if (me.isOwner) return true;
  const list = Array.isArray(item.permission) ? item.permission : [item.permission];
  return list.some(p => me.permissions.includes(p));
};

function navGroups(me, t) {
  const items = NAV.filter(n => allowed(me, n)).map(n => ({ ...n, href: viewPath(n.id) }));
  return GROUPS
    .map(g => ({ id: g.id, label: t(g.labelKey), items: items.filter(i => i.group === g.id) }))
    .filter(g => g.items.length > 0);
}

export default function App() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);
  const { path, navigate } = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    api.me()
      .then(setMe)
      .catch(err => setError({ message: err.message, portalClosed: err.portalClosed === true }));
  }, []);

  // The view comes from the URL, gated by what this member may see. An unknown or
  // off-limits path falls back to the first view they are allowed to open.
  const route = parseRoute(path);
  const allowedViews = me ? NAV.filter(n => allowed(me, n)).map(n => n.id) : [];
  const view = me
    ? (route.view && allowedViews.includes(route.view) ? route.view : (allowedViews[0] ?? 'mine'))
    : null;
  const param = view === route.view ? route.param : null;

  // Keep the address bar canonical: "/" or an off-limits path is rewritten to the
  // effective view (replace, so it adds no history entry). This is what puts the
  // real page in the URL and makes F5 reload the same page instead of the first.
  useEffect(() => {
    if (!me) return;
    const want = viewPath(view, param);
    if (window.location.pathname !== want) navigate(want, { replace: true });
  }, [me, view, param, navigate]);

  // The tab title names the page, so several open tabs and the history list
  // can be told apart (WCAG 2.4.2).
  useEffect(() => {
    document.title = view ? `${t(`nav.${view}`)} · ${t('app.title')}` : t('app.title');
  }, [view, t]);

  if (error) {
    // Staff-only dashboard + this member has no access: offer a way OUT (sign out),
    // not a sign-in button that would just bounce them straight back here.
    return (
      <SignedOutShell>
        <div className="grid w-full max-w-[34rem] gap-5">
          <h1 className="font-display text-h1 font-bold">{t('app.title')}</h1>
          {error.portalClosed ? (
            <Alert variant="info">
              <Info />
              <AlertDescription><p>{error.message} {t('app.askAdmin')}</p></AlertDescription>
            </Alert>
          ) : (
            <Alert variant="danger" role="alert">
              <WarningCircle />
              <AlertDescription><p>{error.message}</p></AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-3">
            {error.portalClosed
              ? <Button variant="outline" onClick={logout}><SignOut /> {t('app.signOut')}</Button>
              : <Button asChild><a href="/auth/login"><SignIn /> {t('app.signIn')}</a></Button>}
          </div>
          <LanguagePicker className="max-w-[16rem]" />
        </div>
      </SignedOutShell>
    );
  }

  if (!me) {
    return (
      <SignedOutShell>
        <p role="status" className="text-muted-foreground">{t('common.loading')}</p>
      </SignedOutShell>
    );
  }

  const select = (id) => navigate(viewPath(id));

  return (
    <AppShell
      me={me}
      groups={navGroups(me, t)}
      current={view}
      pageTitle={t(`nav.${view}`)}
      homeHref={viewPath(allowedViews[0] ?? 'mine')}
      onNavigate={select}
      onSignOut={logout}
    >
      {view === 'mine'    && <MyTickets me={me} ticketId={param}
        onOpen={id => navigate(viewPath('mine', id))} onClose={() => navigate(viewPath('mine'))} />}
      {view === 'tickets' && <Tickets me={me} ticketId={param}
        onOpen={id => navigate(viewPath('tickets', id))} onClose={() => navigate(viewPath('tickets'))} />}
      {view === 'stats'   && <Stats />}
      {view === 'config'  && <Config me={me} />}
      {view === 'bot'     && <BotControl />}
      {view === 'access'  && <Access me={me} />}
      {view === 'settings' && <Settings me={me} />}
    </AppShell>
  );
}
