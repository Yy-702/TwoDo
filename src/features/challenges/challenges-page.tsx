"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { UserAvatar } from "@/components/profile/user-avatar";
import {
  buildChallengeStats,
  pickDailyChallenge,
  toShanghaiChallengeDate,
  type ChallengeCheckinLite,
} from "@/features/challenges/challenge";
import { getAvatarPublicUrl, type ProfileAvatar } from "@/features/profile/avatar";
import type { Space } from "@/features/spaces/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type MemberOption = {
  userId: string;
  label: string;
  avatarUrl: string | null;
};

export function ChallengesPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const todayDate = useMemo(() => toShanghaiChallengeDate(), []);
  const todayChallenge = useMemo(() => pickDailyChallenge(todayDate), [todayDate]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<ProfileAvatar | null>(null);
  const [sharedSpace, setSharedSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [checkins, setCheckins] = useState<ChallengeCheckinLite[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<"idle" | "connected" | "reconnecting">(
    "idle"
  );

  const memberUserIds = useMemo(() => members.map((member) => member.userId), [members]);
  const stats = useMemo(
    () =>
      buildChallengeStats({
        memberUserIds,
        todayDate,
        checkins,
      }),
    [checkins, memberUserIds, todayDate]
  );

  const myCheckedIn = useMemo(() => {
    if (!userId) {
      return false;
    }

    return stats.todayCompletedUserIds.includes(userId);
  }, [stats.todayCompletedUserIds, userId]);

  const realtimeLabel =
    realtimeStatus === "connected"
      ? "实时同步中"
      : realtimeStatus === "reconnecting"
        ? "重连中"
        : "未连接";

  const loadCurrentUserProfile = useCallback(
    async (currentUserId: string) => {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, avatar_path")
        .eq("id", currentUserId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      setCurrentUserProfile({
        userId: currentUserId,
        displayName: data?.display_name ?? null,
        avatarPath: data?.avatar_path ?? null,
        avatarUrl: getAvatarPublicUrl(supabase, data?.avatar_path ?? null),
      });
    },
    [supabase]
  );

  const loadMembers = useCallback(
    async (spaceId: string, currentUserId: string) => {
      const { data, error: memberError } = await supabase.rpc(
        "rpc_get_space_member_profiles",
        {
          target_space_id: spaceId,
        }
      );

      if (memberError) {
        throw memberError;
      }

      const nextMembers: MemberOption[] = (data ?? []).map(
        (
          member: Database["public"]["Functions"]["rpc_get_space_member_profiles"]["Returns"][number]
        ) => {
          if (member.user_id === currentUserId) {
            return {
              userId: member.user_id,
              label: "我",
              avatarUrl: getAvatarPublicUrl(supabase, member.avatar_path),
            };
          }

          return {
            userId: member.user_id,
            label: member.display_name?.trim() || "TA",
            avatarUrl: getAvatarPublicUrl(supabase, member.avatar_path),
          };
        }
      );

      setMembers(nextMembers.slice(0, 2));
    },
    [supabase]
  );

  const loadCheckins = useCallback(
    async (spaceId: string) => {
      const { data, error: checkinError } = await supabase
        .from("challenge_checkins")
        .select("challenge_date, user_id")
        .eq("space_id", spaceId)
        .order("challenge_date", { ascending: false })
        .limit(180);

      if (checkinError) {
        throw checkinError;
      }

      setCheckins((data ?? []) as ChallengeCheckinLite[]);
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

    const { error: ensureError } = await supabase.rpc("rpc_ensure_personal_space");
    if (ensureError) {
      setError("初始化空间失败，请稍后重试");
      setLoading(false);
      return;
    }

    try {
      await loadCurrentUserProfile(user.id);
    } catch {
      setError("加载用户信息失败，请稍后重试");
      setLoading(false);
      return;
    }

    const { data: spaces, error: spacesError } = await supabase
      .from("spaces")
      .select("*")
      .order("created_at", { ascending: true });

    if (spacesError) {
      setError("加载空间失败，请稍后重试");
      setLoading(false);
      return;
    }

    const targetSharedSpace = (spaces ?? []).find((space) => space.type === "shared") ?? null;
    setSharedSpace(targetSharedSpace);

    if (!targetSharedSpace) {
      setMembers([]);
      setCheckins([]);
      setLoading(false);
      return;
    }

    try {
      await Promise.all([
        loadMembers(targetSharedSpace.id, user.id),
        loadCheckins(targetSharedSpace.id),
      ]);
    } catch {
      setError("加载挑战数据失败，请稍后重试");
    }

    setLoading(false);
  }, [loadCheckins, loadCurrentUserProfile, loadMembers, router, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInitial();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadInitial]);

  useEffect(() => {
    if (!sharedSpace) {
      return;
    }

    const channel = supabase
      .channel(`challenge_checkins:${sharedSpace.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "challenge_checkins",
          filter: `space_id=eq.${sharedSpace.id}`,
        },
        () => {
          void loadCheckins(sharedSpace.id);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("reconnecting");
          return;
        }

        setRealtimeStatus("idle");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadCheckins, sharedSpace, supabase]);

  async function toggleMyCheckin() {
    if (!sharedSpace || !userId) {
      return;
    }

    setSubmitting(true);
    setError(null);

    if (myCheckedIn) {
      const { error: deleteError } = await supabase
        .from("challenge_checkins")
        .delete()
        .eq("space_id", sharedSpace.id)
        .eq("challenge_date", todayDate)
        .eq("user_id", userId);

      if (deleteError) {
        setError("取消打卡失败，请稍后重试");
        setSubmitting(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from("challenge_checkins").insert({
        space_id: sharedSpace.id,
        challenge_date: todayDate,
        user_id: userId,
      });

      if (insertError) {
        setError("打卡失败，请稍后重试");
        setSubmitting(false);
        return;
      }
    }

    try {
      await loadCheckins(sharedSpace.id);
    } catch {
      setError("状态已更新，但刷新失败，请手动刷新页面");
    }

    setSubmitting(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <AppShell
      title="每日双人挑战"
      subtitle={`${todayDate} · ${sharedSpace?.name ?? "未连接共享空间"}`}
      activeNav="challenges"
      currentUserAvatarUrl={currentUserProfile?.avatarUrl ?? null}
      currentUserDisplayName={currentUserProfile?.displayName ?? null}
      onSignOut={signOut}
      actions={
        <span
          className={`hidden rounded-full px-3 py-1 text-xs font-bold md:inline-flex ${
            realtimeStatus === "connected"
              ? "bg-emerald-100 text-emerald-700"
              : realtimeStatus === "reconnecting"
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-500"
          }`}
        >
          {realtimeLabel}
        </span>
      }
    >
      {loading ? (
        <div className="rounded-3xl border border-slate-100 bg-white px-4 py-16 text-center text-sm text-slate-500">
          正在加载今日挑战...
        </div>
      ) : !sharedSpace ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
          <h3 className="font-display text-2xl font-bold text-slate-900">双人挑战仅支持共享空间</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
            你还没有加入双人共享空间，先去邀请伙伴，挑战功能就会自动开启。
          </p>
          <button
            type="button"
            className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 transition hover:opacity-90"
            onClick={() => router.push("/app/invite")}
          >
            去邀请伙伴
          </button>
        </section>
      ) : (
        <>
          <section className="rounded-3xl border border-primary/15 bg-gradient-to-br from-white to-orange-50 p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">TODAY&apos;S CHALLENGE</p>
                <h3 className="mt-2 font-display text-3xl font-bold text-slate-900 sm:text-4xl">
                  {todayChallenge.emoji} {todayChallenge.title}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  {todayChallenge.description}
                </p>
              </div>

              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <p className="font-semibold text-slate-900">今日进度</p>
                <p className="mt-1 text-2xl font-black text-primary">{stats.todayProgressLabel}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex -space-x-2">
                {members.map((member) => {
                  const done = stats.todayCompletedUserIds.includes(member.userId);
                  return (
                    <div
                      key={member.userId}
                      className={`relative rounded-full ${done ? "ring-2 ring-emerald-400" : "opacity-70"}`}
                    >
                      <UserAvatar
                        src={member.avatarUrl}
                        name={member.label}
                        className="size-10 border-2 border-white"
                        textClassName="text-xs"
                      />
                      {done ? (
                        <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-[10px] text-white">
                          ✓
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <p className="text-sm text-slate-500">
                {stats.todayAllCompleted ? "今天你们都完成了挑战，太棒了！" : "等对方打卡后即可达成当日挑战。"}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void toggleMyCheckin()}
                disabled={submitting}
              >
                {submitting ? "提交中..." : myCheckedIn ? "取消我的打卡" : "我已完成"}
              </button>

              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                onClick={() => router.push("/app")}
              >
                返回控制面板
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">连续挑战</p>
              <p className="mt-2 font-display text-4xl font-black text-slate-900">
                {stats.currentStreakDays}
                <span className="ml-1 text-lg font-bold text-slate-500">天</span>
              </p>
              <p className="mt-2 text-sm text-slate-500">仅在双方当天都完成时累计连击。</p>
            </article>

            <article className="rounded-2xl border border-primary/20 bg-primary p-5 text-white shadow-md shadow-primary/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">甜蜜值</p>
              <p className="mt-2 font-display text-4xl font-black">{stats.totalSweetPoints}</p>
              <p className="mt-2 text-sm text-white/80">每次个人打卡 +10，双方当天都完成额外 +20。</p>
            </article>
          </section>
        </>
      )}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </AppShell>
  );
}
