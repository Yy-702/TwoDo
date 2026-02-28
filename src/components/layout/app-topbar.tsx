import Link from "next/link";
import type { ReactNode } from "react";
import { UserAvatar } from "@/components/profile/user-avatar";

export type AppTopbarActiveNav =
  | "dashboard"
  | "invite"
  | "challenges"
  | "memories"
  | "anniversaries";

type AppTopbarProps = {
  activeNav: AppTopbarActiveNav;
  title?: string;
  subtitle?: string;
  currentUserAvatarUrl?: string | null;
  currentUserDisplayName?: string | null;
  onSignOut?: () => Promise<void> | void;
  rightActions?: ReactNode;
};

type NavItem = {
  id: string;
  href: string;
  label: string;
  isActive: boolean;
};

function navItemClass(active: boolean) {
  if (active) {
    return "inline-flex shrink-0 items-center rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm sm:px-4 sm:text-sm";
  }

  return "inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary sm:px-4 sm:text-sm";
}

export function AppTopbar({
  activeNav,
  title = "咱们俩",
  subtitle,
  currentUserAvatarUrl = null,
  currentUserDisplayName = null,
  onSignOut,
  rightActions,
}: AppTopbarProps) {
  const navItems: NavItem[] = [
    {
      id: "dashboard",
      href: "/app",
      label: "控制面板",
      isActive: activeNav === "dashboard",
    },
    {
      id: "todos",
      href: "/app#todo-board",
      label: "任务清单",
      isActive: false,
    },
    {
      id: "invite",
      href: "/app/invite",
      label: "邀请伙伴",
      isActive: activeNav === "invite",
    },
    {
      id: "challenges",
      href: "/app/challenges",
      label: "双人挑战",
      isActive: activeNav === "challenges",
    },
    {
      id: "memories",
      href: "/app/memories",
      label: "回忆墙",
      isActive: activeNav === "memories",
    },
    {
      id: "anniversaries",
      href: "/app/anniversaries",
      label: "纪念日",
      isActive: activeNav === "anniversaries",
    },
  ];

  const shouldRenderUserArea =
    onSignOut !== undefined || currentUserAvatarUrl !== null || currentUserDisplayName !== null;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 px-3 py-3 backdrop-blur sm:px-4 md:px-8 md:py-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
        <div className="flex items-start justify-between gap-3 sm:items-center sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg text-primary sm:size-10">
              ❤
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg font-bold text-slate-900 sm:text-xl">{title}</h2>
              {subtitle ? (
                <p className="truncate text-xs font-medium text-slate-500 sm:text-sm">{subtitle}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">
            {rightActions}

            {onSignOut ? (
              <button
                type="button"
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 sm:text-sm"
                onClick={() => {
                  void onSignOut();
                }}
              >
                退出
              </button>
            ) : null}

            {shouldRenderUserArea ? (
              <UserAvatar
                src={currentUserAvatarUrl}
                name={currentUserDisplayName}
                className="size-9 border border-slate-100 sm:size-10"
                textClassName="text-xs sm:text-sm"
              />
            ) : null}
          </div>
        </div>

        <nav className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={navItemClass(item.isActive)}
              aria-current={item.isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
