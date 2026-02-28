import Link from "next/link";
import type { ReactNode } from "react";
import { AppMobileNav, type AppNavKey } from "@/components/layout/app-mobile-nav";
import { AppTopbar } from "@/components/layout/app-topbar";
import { UserAvatar } from "@/components/profile/user-avatar";

type AppShellProps = {
  title: string;
  subtitle: string;
  activeNav: AppNavKey;
  actions?: ReactNode;
  currentUserAvatarUrl?: string | null;
  currentUserDisplayName?: string | null;
  onSignOut?: () => Promise<void> | void;
  onEditAvatar?: () => void;
  avatarUploading?: boolean;
  children: ReactNode;
};

function navClass(active: boolean) {
  if (active) {
    return "flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-white shadow-md shadow-primary/20";
  }

  return "flex items-center gap-3 rounded-2xl px-4 py-3 text-slate-600 transition-colors hover:bg-slate-50";
}

export function AppShell({
  title,
  subtitle,
  activeNav,
  actions,
  currentUserAvatarUrl = null,
  currentUserDisplayName = null,
  onSignOut,
  onEditAvatar,
  avatarUploading = false,
  children,
}: AppShellProps) {
  return (
    <div className="relative flex min-h-dvh w-full overflow-hidden bg-background lg:h-screen">
      <aside className="hidden h-full w-80 shrink-0 border-r border-slate-100 bg-white shadow-sm lg:flex">
        <div className="flex h-full w-full flex-col justify-between p-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 p-2">
              <div className="relative">
                <button
                  type="button"
                  className="rounded-full ring-4 ring-primary-soft transition hover:scale-[1.03] disabled:cursor-not-allowed"
                  onClick={onEditAvatar}
                  disabled={!onEditAvatar || avatarUploading}
                >
                  <UserAvatar
                    src={currentUserAvatarUrl}
                    name={currentUserDisplayName}
                    className="size-14 border-0"
                    textClassName="text-base"
                  />
                </button>
                <span className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-white bg-emerald-500" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900">咱们俩</h1>
                <p className="text-sm font-medium text-slate-500">
                  {avatarUploading ? "头像上传中..." : "点击头像可修改"}
                </p>
              </div>
            </div>

            <nav className="flex flex-col gap-2">
              <Link href="/app" className={navClass(activeNav === "dashboard")}>
                <span className="text-lg">▦</span>
                <span className="font-display text-base font-bold">控制面板</span>
              </Link>

              <a href="#todo-board" className={navClass(false)}>
                <span className="text-lg">✓</span>
                <span className="font-display text-base font-semibold">任务清单</span>
              </a>

              <Link href="/app/invite" className={navClass(activeNav === "invite")}>
                <span className="text-lg">❤</span>
                <span className="font-display text-base font-semibold">邀请伙伴</span>
              </Link>

              <Link href="/app/challenges" className={navClass(activeNav === "challenges")}>
                <span className="text-lg">🔥</span>
                <span className="font-display text-base font-semibold">双人挑战</span>
              </Link>

              <Link href="/app/memories" className={navClass(activeNav === "memories")}>
                <span className="text-lg">📷</span>
                <span className="font-display text-base font-semibold">回忆墙</span>
              </Link>

              <Link
                href="/app/anniversaries"
                className={navClass(activeNav === "anniversaries")}
              >
                <span className="text-lg">🗓</span>
                <span className="font-display text-base font-semibold">纪念日</span>
              </Link>

              <span className="flex items-center gap-3 rounded-2xl px-4 py-3 text-slate-400">
                <span className="text-lg">⚙</span>
                <span className="font-display text-base font-semibold">设置</span>
              </span>
            </nav>
          </div>

          <Link
            href="/app/memories"
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white shadow-lg transition hover:bg-slate-700"
          >
            ＋ 记录新回忆
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-grid-paper pb-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:pb-0">
        <AppTopbar
          activeNav={activeNav}
          title={title}
          subtitle={subtitle}
          currentUserAvatarUrl={currentUserAvatarUrl}
          currentUserDisplayName={currentUserDisplayName}
          onSignOut={onSignOut}
          rightActions={actions}
        />

        <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-3 pb-16 sm:p-4 sm:pb-20 md:gap-8 md:p-8">
          {children}
        </section>
      </main>

      <AppMobileNav activeNav={activeNav} />
    </div>
  );
}
