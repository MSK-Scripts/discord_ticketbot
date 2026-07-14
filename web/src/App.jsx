import { useEffect, useState } from 'react';
import {
  TicketIcon, InboxIcon, BarChart3Icon, SettingsIcon, TerminalIcon, ShieldCheckIcon,
  LogOutIcon, MenuIcon,
} from 'lucide-react';
import { api, logout } from './api.js';
import { cn } from '@/lib/utils.js';
import { Button } from '@/components/ui/button.jsx';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet.jsx';

import Tickets from './views/Tickets.jsx';
import MyTickets from './views/MyTickets.jsx';
import Stats from './views/Stats.jsx';
import Config from './views/Config.jsx';
import BotControl from './views/BotControl.jsx';
import Access from './views/Access.jsx';

/**
 * Navigation is derived from the permissions the SERVER reported. This is only
 * cosmetic — every route is enforced server-side as well. Hiding a nav item the
 * user cannot use is a UX decision, never the security boundary.
 */
const NAV = [
  { id: 'mine',    label: 'My tickets',    icon: TicketIcon,     permission: null },
  { id: 'tickets', label: 'Tickets',       icon: InboxIcon,      permission: 'tickets.view' },
  { id: 'stats',   label: 'Statistics',    icon: BarChart3Icon,  permission: 'stats.view' },
  { id: 'config',  label: 'Configuration', icon: SettingsIcon,   permission: ['config.view', 'config.edit'] },
  { id: 'bot',     label: 'Bot control',   icon: TerminalIcon,   permission: 'bot.control' },
  { id: 'access',  label: 'Permissions',   icon: ShieldCheckIcon, permission: 'access.manage' },
];

const allowed = (me, permission) => {
  if (!permission) return true;
  if (me.isOwner) return true;
  const list = Array.isArray(permission) ? permission : [permission];
  return list.some(p => me.permissions.includes(p));
};

function Brand() {
  return (
    <div className="flex items-center gap-2 px-2 font-display text-[15px] font-bold">
      <span className="size-2 rounded-full bg-primary" />
      Ticket Bot
    </div>
  );
}

function NavContent({ me, view, onSelect }) {
  const items = NAV.filter(n => allowed(me, n.permission));
  return (
    <div className="flex h-full flex-col gap-1 p-3">
      <div className="px-1 pb-3 pt-1"><Brand /></div>

      <nav className="flex flex-col gap-1">
        {items.map(item => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                  : 'text-sidebar-foreground hover:bg-white/5 hover:text-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-sidebar-border pt-3">
        <div className="mb-2.5 flex items-center gap-2.5 px-1">
          {me.user.avatar
            ? <img src={me.user.avatar} alt="" className="size-8 rounded-full" />
            : <div className="size-8 rounded-full bg-white/8" />}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{me.user.name}</div>
            <div className="text-muted-foreground text-xs">
              {me.isOwner ? 'Server owner' : `${me.permissions.length} permission(s)`}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={logout}>
          <LogOutIcon /> Sign out
        </Button>
      </div>
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    api.me()
      .then((data) => {
        setMe(data);
        const first = NAV.find(n => allowed(data, n.permission));
        setView(first?.id ?? 'mine');
      })
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
        <h1 className="font-display text-2xl font-bold">Ticket Bot Dashboard</h1>
        <div className="text-destructive bg-destructive/10 border-destructive/30 max-w-sm rounded-lg border px-4 py-3 text-sm">{error}</div>
        <Button asChild><a href="/auth/login">Sign in with Discord</a></Button>
      </div>
    );
  }

  if (!me) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const select = (id) => { setView(id); setMobileOpen(false); };

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="bg-sidebar hidden w-60 shrink-0 border-r border-sidebar-border md:block">
        <div className="sticky top-0 h-screen">
          <NavContent me={me} view={view} onSelect={select} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="bg-sidebar sticky top-0 z-30 flex items-center gap-2 border-b border-sidebar-border px-3 py-2.5 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><MenuIcon /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <NavContent me={me} view={view} onSelect={select} />
            </SheetContent>
          </Sheet>
          <Brand />
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {view === 'mine'    && <MyTickets me={me} />}
          {view === 'tickets' && <Tickets me={me} />}
          {view === 'stats'   && <Stats />}
          {view === 'config'  && <Config me={me} />}
          {view === 'bot'     && <BotControl />}
          {view === 'access'  && <Access me={me} />}
        </main>
      </div>
    </div>
  );
}
