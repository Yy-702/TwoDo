import Link from "next/link";

export type AppNavKey =
  | "dashboard"
  | "invite"
  | "challenges"
  | "memories"
  | "anniversaries";

type AppNavItemId = Exclude<AppNavKey, "invite">;

type AppNavItem = {
  id: AppNavItemId;
  href: string;
  label: string;
  mobileLabel: string;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    id: "dashboard",
    href: "/app",
    label: "控制面板",
    mobileLabel: "首页",
  },
  {
    id: "challenges",
    href: "/app/challenges",
    label: "双人挑战",
    mobileLabel: "挑战",
  },
  {
    id: "memories",
    href: "/app/memories",
    label: "回忆墙",
    mobileLabel: "回忆",
  },
  {
    id: "anniversaries",
    href: "/app/anniversaries",
    label: "纪念日",
    mobileLabel: "纪念",
  },
];

type AppMobileNavProps = {
  activeNav: AppNavKey;
};

function mobileNavClass(active: boolean) {
  const baseClass =
    "group flex h-10 min-w-0 flex-1 items-center justify-center rounded-xl px-1.5 text-[11px] font-semibold leading-none tracking-tight transition-all duration-200";

  if (active) {
    return `${baseClass} bg-primary text-white shadow-[0_8px_16px_rgba(240,110,66,0.32)] ring-1 ring-primary/30`;
  }

  return `${baseClass} text-slate-600 hover:bg-white hover:text-slate-900 active:scale-[0.98]`;
}

export function AppMobileNav({ activeNav }: AppMobileNavProps) {
  return (
    <nav
      data-testid="app-mobile-nav"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/70 bg-linear-to-b from-white/92 to-[#fff7f2] px-2 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 shadow-[0_-10px_22px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex max-w-xl items-center gap-1 rounded-2xl border border-slate-100/90 bg-white/90 p-1 shadow-sm">
        {APP_NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={mobileNavClass(item.id === activeNav)}
            aria-label={item.label}
            aria-current={item.id === activeNav ? "page" : undefined}
          >
            <span
              className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-center"
              style={{ whiteSpace: "nowrap" }}
            >
              {item.mobileLabel}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
