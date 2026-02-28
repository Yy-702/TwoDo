"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { AnniversaryEditorModal } from "@/features/anniversaries/anniversary-editor-modal";
import {
  buildSortedAnniversaryView,
  computeAnniversaryStatus,
  createAnniversaryRecord,
  deleteAnniversaryRecord,
  loadSpaceAnniversaries,
  type Anniversary,
  type AnniversaryCreateInput,
  type AnniversaryListState,
} from "@/features/anniversaries/anniversary";
import { getAvatarPublicUrl } from "@/features/profile/avatar";
import type { Space } from "@/features/spaces/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AnniversariesPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [listState, setListState] = useState<AnniversaryListState>("idle");
  const [creating, setCreating] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string | null>(null);
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null);
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);

  const loadCurrentUserProfile = useCallback(
    async (nextUserId: string) => {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, avatar_path")
        .eq("id", nextUserId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      setCurrentUserDisplayName(data?.display_name ?? null);
      setCurrentUserAvatarUrl(getAvatarPublicUrl(supabase, data?.avatar_path ?? null));
    },
    [supabase]
  );

  const loadAnniversaries = useCallback(
    async (spaceId: string) => {
      setListState("loading");
      setError(null);

      try {
        const rows = await loadSpaceAnniversaries({
          supabase,
          spaceId,
        });
        setAnniversaries(rows);
        setListState("ready");
      } catch {
        setListState("error");
        setError("加载纪念日失败，请稍后重试");
      }
    },
    [supabase]
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return;
    }

    setUserId(user.id);

    try {
      await loadCurrentUserProfile(user.id);
    } catch {
      setError("加载用户信息失败，请稍后重试");
      setLoading(false);
      return;
    }

    const { error: ensureError } = await supabase.rpc("rpc_ensure_personal_space");
    if (ensureError) {
      setError("初始化空间失败，请稍后重试");
      setLoading(false);
      return;
    }

    const { data: spaceList, error: spacesError } = await supabase
      .from("spaces")
      .select("*")
      .order("created_at", { ascending: true });

    if (spacesError) {
      setError("加载空间失败，请稍后重试");
      setLoading(false);
      return;
    }

    const nextSpaces = spaceList ?? [];
    setSpaces(nextSpaces);

    if (nextSpaces.length === 0) {
      setCurrentSpaceId(null);
      setAnniversaries([]);
      setListState("ready");
      setLoading(false);
      return;
    }

    const storedSpaceId = window.localStorage.getItem("twodo.currentSpaceId");
    const preferredSpaceId =
      nextSpaces.find((space) => space.id === storedSpaceId)?.id ?? nextSpaces[0].id;
    setCurrentSpaceId(preferredSpaceId);
    window.localStorage.setItem("twodo.currentSpaceId", preferredSpaceId);

    await loadAnniversaries(preferredSpaceId);
    setLoading(false);
  }, [loadAnniversaries, loadCurrentUserProfile, router, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInitial();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadInitial]);

  const currentSpace = useMemo(() => {
    return spaces.find((space) => space.id === currentSpaceId) ?? null;
  }, [currentSpaceId, spaces]);

  const listItems = useMemo(() => {
    return buildSortedAnniversaryView(anniversaries, dayjs());
  }, [anniversaries]);

  const heroItem = useMemo(() => {
    return listItems.find((item) => item.status.daysUntil >= 0) ?? null;
  }, [listItems]);

  const timelineItems = useMemo(() => {
    const today = dayjs().startOf("day");
    return anniversaries
      .filter((anniversary) => !dayjs(anniversary.eventDate).startOf("day").isAfter(today))
      .sort((left, right) => right.eventDate.localeCompare(left.eventDate))
      .map((anniversary) => ({
        ...anniversary,
        status: computeAnniversaryStatus(anniversary, dayjs()),
      }));
  }, [anniversaries]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function handleCreateAnniversary(value: AnniversaryCreateInput) {
    if (!userId || !currentSpaceId) {
      setCreateError("当前空间信息缺失，请刷新后重试");
      return;
    }

    setCreating(true);
    setCreateError(null);

    const result = await createAnniversaryRecord({
      supabase,
      spaceId: currentSpaceId,
      userId,
      input: value,
    });

    setCreating(false);

    if (!result.ok) {
      setCreateError(result.message);
      return;
    }

    setCreateModalOpen(false);
    setCreateError(null);
    await loadAnniversaries(currentSpaceId);
  }

  async function handleDeleteAnniversary(anniversary: Anniversary) {
    if (!currentSpaceId) {
      setError("当前空间信息缺失，请刷新后重试");
      return;
    }

    const confirmed = window.confirm("确定删除这个纪念日吗？删除后不可恢复。");
    if (!confirmed) {
      return;
    }

    const result = await deleteAnniversaryRecord({
      supabase,
      anniversaryId: anniversary.id,
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }

    await loadAnniversaries(currentSpaceId);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#fff7f2] font-brand text-[#181311]">
      <AppTopbar
        activeNav="anniversaries"
        title="纪念日与倒计时"
        subtitle={currentSpace ? `${currentSpace.name} · 记录每一个重要时刻` : "记录每一个重要时刻"}
        currentUserAvatarUrl={currentUserAvatarUrl}
        currentUserDisplayName={currentUserDisplayName}
        onSignOut={signOut}
        rightActions={
          <button
            type="button"
            className="rounded-full bg-[#f06e42] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#f06e42]/20 transition hover:bg-[#df6137] sm:text-sm"
            onClick={() => {
              setCreateError(null);
              setCreateModalOpen(true);
            }}
            disabled={!currentSpaceId || loading}
          >
            新建纪念日
          </button>
        }
      />

      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-10 top-12 text-6xl text-[#f06e42]/10">❤</div>
        <div className="pointer-events-none absolute right-20 top-40 text-5xl text-[#f06e42]/10">✦</div>
        <div className="pointer-events-none absolute bottom-24 left-1/3 text-7xl text-[#f06e42]/5">♡</div>

        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-tight text-[#181311] md:text-5xl">纪念日与倒计时</h1>
          <p className="mt-2 text-base font-medium text-[#896b61]">
            把每个重要日子都留在这里
            {currentSpace ? ` · ${currentSpace.name}` : ""}
          </p>
        </div>

        {loading ? (
          <div className="relative z-10 rounded-2xl border border-[#eeddd5] bg-white px-5 py-12 text-center text-sm text-[#896b61]">
            正在加载纪念日...
          </div>
        ) : (
          <>
            <section className="relative z-10">
              {heroItem ? (
                <article className="overflow-hidden rounded-3xl border border-[#f3d8cb] bg-white shadow-[0_14px_32px_-12px_rgba(240,110,66,0.35)]">
                  <div className="flex flex-col gap-6 bg-gradient-to-r from-[#fff6ef] via-[#fffdfc] to-[#fff4ec] p-6 md:flex-row md:items-end md:justify-between md:p-8">
                    <div>
                      <p className="inline-flex rounded-full bg-[#ffe7dc] px-3 py-1 text-xs font-bold text-[#cf532d]">
                        最近纪念日
                      </p>
                      <h2 className="mt-4 text-3xl font-black tracking-tight text-[#181311] md:text-4xl">
                        {heroItem.title}
                      </h2>
                      <p className="mt-2 text-base font-semibold text-[#5f4a43]">{heroItem.status.statusText}</p>
                      <p className="mt-2 text-sm text-[#896b61]">
                        发生日期：{dayjs(heroItem.eventDate).format("YYYY年MM月DD日")}
                      </p>
                      {heroItem.note ? (
                        <p className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm text-[#5f4a43]">
                          {heroItem.note}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid w-full grid-cols-2 gap-3 rounded-2xl border border-[#f3d8cb] bg-white p-4 text-center md:w-[260px]">
                      <div>
                        <p className="text-xs font-semibold text-[#896b61]">倒计时</p>
                        <p className="mt-2 text-3xl font-black text-[#f06e42]">
                          {Math.max(heroItem.status.daysUntil, 0)}
                        </p>
                        <p className="text-xs font-semibold text-[#896b61]">天</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#896b61]">是否每年重复</p>
                        <p className="mt-2 text-base font-bold text-[#181311]">
                          {heroItem.isYearly ? "是" : "否"}
                        </p>
                        <p className="mt-1 text-xs text-[#896b61]">
                          {heroItem.isYearly ? "循环纪念" : "一次性事件"}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ) : (
                <div className="rounded-3xl border border-dashed border-[#eeddd5] bg-white px-6 py-14 text-center">
                  <p className="text-lg font-bold text-[#5f4a43]">还没有即将到来的纪念日</p>
                  <p className="mt-2 text-sm text-[#896b61]">点击“新建纪念日”开始记录第一件重要时刻。</p>
                </div>
              )}
            </section>

            <section className="relative z-10">
              <h2 className="mb-4 text-2xl font-black tracking-tight text-[#181311]">纪念日列表</h2>

              {listState === "loading" ? (
                <div className="rounded-2xl border border-[#eeddd5] bg-white px-5 py-10 text-center text-sm text-[#896b61]">
                  正在同步纪念日...
                </div>
              ) : null}

              {listState !== "loading" ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {listItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#eeddd5] bg-white px-5 py-12 text-center text-sm text-[#896b61] md:col-span-2">
                      暂无纪念日，点击“新建纪念日”开始创建。
                    </div>
                  ) : (
                    listItems.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-2xl border border-[#f2ddd4] bg-white p-5 shadow-[0_8px_24px_-16px_rgba(240,110,66,0.45)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h3 className="text-xl font-bold text-[#181311]">{item.title}</h3>
                            <p className="text-sm font-medium text-[#f06e42]">{item.status.statusText}</p>
                            <p className="text-xs text-[#896b61]">
                              {dayjs(item.eventDate).format("YYYY年MM月DD日")}
                              {item.isYearly ? " · 每年重复" : " · 一次性"}
                            </p>
                          </div>

                          <button
                            type="button"
                            className="rounded-full bg-[#fff0eb] px-3 py-1 text-xs font-semibold text-[#c6512e] transition hover:bg-[#ffe4db]"
                            aria-label={`删除-${item.title}`}
                            onClick={() => void handleDeleteAnniversary(item)}
                          >
                            删除
                          </button>
                        </div>

                        {item.note ? (
                          <p className="mt-4 rounded-xl bg-[#fff8f4] px-3 py-2 text-sm text-[#5f4a43]">{item.note}</p>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              ) : null}
            </section>

            <section className="relative z-10 pb-4">
              <h2 className="mb-4 text-2xl font-black tracking-tight text-[#181311]">回忆时间线</h2>

              {timelineItems.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#eeddd5] bg-white px-5 py-12 text-center text-sm text-[#896b61]">
                  还没有可回顾的纪念日。
                </div>
              ) : (
                <div className="space-y-3 border-l-2 border-[#f1ddd3] pl-5">
                  {timelineItems.map((item) => (
                    <article key={item.id} className="relative rounded-xl border border-[#f2ddd4] bg-white px-4 py-3">
                      <span className="absolute -left-[29px] top-4 size-3 rounded-full bg-[#f06e42]" />
                      <p className="text-xs font-semibold text-[#896b61]">
                        {dayjs(item.eventDate).format("YYYY年MM月DD日")}
                      </p>
                      <h3 className="mt-1 text-base font-bold text-[#181311]">{item.title}</h3>
                      <p className="mt-1 text-sm text-[#5f4a43]">{item.status.statusText}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {error ? <p className="relative z-10 text-sm font-medium text-rose-600">{error}</p> : null}
      </main>

      {createModalOpen ? (
        <AnniversaryEditorModal
          submitting={creating}
          error={createError}
          onClose={() => {
            if (creating) {
              return;
            }
            setCreateModalOpen(false);
          }}
          onSubmit={handleCreateAnniversary}
        />
      ) : null}
    </div>
  );
}
