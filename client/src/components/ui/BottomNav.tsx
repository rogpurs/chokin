import { NavLink } from "react-router-dom";

interface NavItemProps {
  to: string;
  end?: boolean;
  label: string;
  iconActive: JSX.Element;
  iconInactive: JSX.Element;
}

const NavItem = ({ to, end, label, iconActive, iconInactive }: NavItemProps): JSX.Element => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex flex-col items-center justify-center gap-0.5 min-w-[52px] py-1 transition-all ${
        isActive ? "text-primary" : "text-[var(--color-text-secondary)]"
      }`
    }
  >
    {({ isActive }) => (
      <>
        <span className="flex h-7 w-7 items-center justify-center">
          {isActive ? iconActive : iconInactive}
        </span>
        <span className="text-[10px] font-medium leading-none">{label}</span>
      </>
    )}
  </NavLink>
);

const BottomNav = (): JSX.Element => {
  const s = 26; // icon size

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 glass shadow-nav"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)" }}
    >
      <div className="flex items-end justify-around px-2 pt-2">
        {/* Home */}
        <NavItem
          to="/"
          end
          label="ホーム"
          iconActive={
            <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.293 2.293a1 1 0 011.414 0l8 8A1 1 0 0120 12v9a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9a1 1 0 01.293-.707l7-7z" />
            </svg>
          }
          iconInactive={
            <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
            </svg>
          }
        />

        {/* History */}
        <NavItem
          to="/history"
          label="履歴"
          iconActive={
            <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 3a2 2 0 00-2 2v14a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H8zm1 2h6v1a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm-1 5h8v1H8v-1zm0 3h8v1H8v-1zm0 3h6v1H8v-1z" />
            </svg>
          }
          iconInactive={
            <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
          }
        />

        {/* Record FAB */}
        <NavLink
          to="/record"
          className="relative -top-3 flex h-[54px] w-[54px] items-center justify-center rounded-full bg-primary text-white shadow-hero transition-all active:scale-95"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </NavLink>

        {/* Goals */}
        <NavItem
          to="/goals"
          label="目標"
          iconActive={
            <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 3a7 7 0 110 14A7 7 0 0112 5zm0 3a4 4 0 100 8 4 4 0 000-8zm0 2a2 2 0 110 4 2 2 0 010-4z" />
            </svg>
          }
          iconInactive={
            <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          }
        />

        {/* Settings */}
        <NavItem
          to="/settings"
          label="設定"
          iconActive={
            <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65a.5.5 0 00.12-.64l-2-3.46a.5.5 0 00-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.49.49 0 0014 2h-4a.49.49 0 00-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.49.49 0 00-.61.22l-2 3.46a.48.48 0 00.12.64l2.11 1.65A7.3 7.3 0 004 12c0 .34.03.67.07.98l-2.11 1.65a.48.48 0 00-.12.64l2 3.46c.13.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.07.38.39.62.49.42h4a.49.49 0 00.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.22.08.48 0 .61-.22l2-3.46a.48.48 0 00-.12-.64l-2.11-1.66z" />
            </svg>
          }
          iconInactive={
            <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          }
        />
      </div>
    </nav>
  );
};

export default BottomNav;
