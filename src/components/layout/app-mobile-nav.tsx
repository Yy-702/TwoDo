import Link from "next/link";

export type AppNavKey =
  | "dashboard"
  | "invite"
  | "challenges"
  | "memories"
  | "anniversaries";

type AppNavItemId = AppNavKey | "todos";

type AppNavItem = {
  id: AppNavItemId;
  href: string;
  label: string;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    id: "dashboard",
    href: "/app",
    label: "控制面板",
  },
  {
    id: "todos",
    href: "/app#todo-board",
    label: "任务清单",
  },
  {
    id: "invite",
    href: "/app/invite",
    label: "邀请伙伴",
  },
  {
    id: "challenges",
    href: "/app/challenges",
    label: "双人挑战",
  },
  {
    id: "memories",
    href: "/app/memories",
    label: "回忆墙",
  },
  {
    id: "anniversaries",
    href: "/app/anniversaries",
    label: "纪念日",
  },
];

type AppMobileNavProps = {
  activeNav: AppNavKey;
};

function mobileNavClass(active: boolean) {
  if (active) {
    return "flex min-w-0 flex-1 items-center justify-center rounded-2xl bg-primary px-3 py-2 text-xs font-bold text-white shadow-md shadow-primary/20";
  }

  return "flex min-w-0 flex-1 items-center justify-center rounded-2xl px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50";
}

export function AppMobileNav({ activeNav }: AppMobileNavProps) {
  return (
    <nav
      data-testid="app-mobile-nav"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-xl items-center gap-2">
        {APP_NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={mobileNavClass(item.id === activeNav)}
            aria-current={item.id === activeNav ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
