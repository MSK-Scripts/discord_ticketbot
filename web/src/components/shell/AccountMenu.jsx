import { useId } from 'react';
import { CaretDown, SignOut, UserCircle } from '@/components/icons.jsx';
import { Button } from '@/components/ui/button.jsx';
import { fieldClassName } from '@/components/ui/input.jsx';
import { Popover } from '@/components/ui/popover.jsx';
import { cn } from '@/lib/utils.js';
import { useI18n } from '@/i18n.jsx';

/**
 * Per-user language picker. The list is whatever locale files exist (see
 * i18n.jsx), so a new translation appears here on its own. The choice is
 * personal and lives in localStorage, so it changes nothing for anyone else.
 *
 * A native <select>: it also sits in popovers and on the signed-out page, and
 * a Radix list would open in a portal below a popover's top layer.
 */
export function LanguagePicker({ className }) {
  const { lang, languages, setLang, t } = useI18n();
  const id = useId();
  if (languages.length < 2) return null;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="kicker text-muted-foreground">{t('common.language')}</label>
      <select
        id={id}
        value={lang}
        onChange={e => setLang(e.target.value)}
        className={cn(fieldClassName, 'min-h-11 cursor-pointer')}
      >
        {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
      </select>
    </div>
  );
}

function Avatar({ src, className }) {
  return src
    ? <img src={src} alt="" className={cn('size-7 shrink-0 rounded-full bg-muted object-cover', className)} />
    : <UserCircle className={cn('size-7 shrink-0 text-muted-foreground', className)} />;
}

/**
 * The account entry of the top bar (shop AccountMenu): avatar and name, and a
 * panel with the role, the language and signing out. The name stays part of
 * the button's accessible name, so a voice command can say what is written.
 */
export function AccountMenu({ me, onSignOut }) {
  const { t } = useI18n();
  const role = me.isOwner ? t('app.serverOwner') : t('app.permissionCount', { count: me.permissions.length });
  return (
    <Popover
      label={t('app.account')}
      buttonClassName="max-w-[16rem]"
      buttonContent={(
        <>
          <Avatar src={me.user.avatar} />
          <span className="sr-only">{t('app.account')}: </span>
          <span className="hidden min-w-0 truncate font-semibold md:inline">{me.user.name}</span>
          <span className="sr-only md:hidden">{me.user.name}</span>
          <CaretDown className="hidden size-4 shrink-0 text-muted-foreground md:block" />
        </>
      )}
    >
      <div className="grid gap-4">
        <div className="flex items-center gap-3">
          <Avatar src={me.user.avatar} className="size-10" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{me.user.name}</p>
            <p className="text-small text-muted-foreground">{role}</p>
          </div>
        </div>
        <LanguagePicker />
        <Button variant="outline" className="w-full" onClick={onSignOut}>
          <SignOut /> {t('app.signOut')}
        </Button>
      </div>
    </Popover>
  );
}
