import Link from "next/link";
import type { ReactNode } from "react";
import { UserAvatar } from "@/components/profile/user-avatar";

type AppShellProps = {
  title: string;
  subtitle: string;
  activeNav: "dashboard" | "invite";
  actions?: ReactNode;
  currentUserAvatarUrl?: string | null;
  currentUserDisplayName?: string | null;
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
  onEditAvatar,
  avatarUploading = false,
  children,
}: AppShellProps) {
  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background">
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

              <span className="flex items-center gap-3 rounded-2xl px-4 py-3 text-slate-400">
                <span className="text-lg">🗓</span>
                <span className="font-display text-base font-semibold">专属日历</span>
              </span>

              <span className="flex items-center gap-3 rounded-2xl px-4 py-3 text-slate-400">
                <span className="text-lg">⚙</span>
                <span className="font-display text-base font-semibold">设置</span>
              </span>
            </nav>
          </div>

          <button
            type="button"
            className="h-12 w-full rounded-2xl bg-slate-900 text-sm font-bold text-white shadow-lg"
            disabled
          >
            ＋ 记录新回忆
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-grid-paper">
        <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/85 px-4 py-4 backdrop-blur md:px-8 md:py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-yellow-100 text-lg text-yellow-600">
                ☀
              </span>
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">{title}</h2>
                <p className="text-xs font-medium text-slate-500">{subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <button
                type="button"
                className="relative flex size-10 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-600 shadow-sm"
              >
                🔔
                <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
              </button>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-600 shadow-sm"
              >
                🔎
              </button>
              {actions}
            </div>
          </div>
        </header>

        <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 pb-20 md:p-8">
          {children}
        </section>
      </main>
    </div>
  );
}
