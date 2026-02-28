"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { UserAvatar } from "@/components/profile/user-avatar";
import { getAvatarPublicUrl } from "@/features/profile/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SuccessMember = {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export function InviteSuccessPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<SuccessMember[]>([]);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string | null>(null);
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_path")
        .eq("id", user.id)
        .maybeSingle();

      setCurrentUserDisplayName(profileData?.display_name ?? "我");
      setCurrentUserAvatarUrl(getAvatarPublicUrl(supabase, profileData?.avatar_path ?? null));

      const { data: context, error: contextError } = await supabase.rpc(
        "rpc_get_my_shared_space_context"
      );

      if (contextError || !context?.[0]?.space_id) {
        setMembers([
          {
            userId: user.id,
            displayName: profileData?.display_name ?? "我",
            avatarUrl: getAvatarPublicUrl(supabase, profileData?.avatar_path ?? null),
          },
        ]);
        setLoading(false);
        return;
      }

      const { data: memberData, error: memberError } = await supabase.rpc(
        "rpc_get_space_member_profiles",
        {
          target_space_id: context[0].space_id,
        }
      );

      if (memberError) {
        setMembers([]);
        setLoading(false);
        return;
      }

      setMembers(
        (memberData ?? []).map((member) => ({
          userId: member.user_id,
          displayName: member.display_name,
          avatarUrl: getAvatarPublicUrl(supabase, member.avatar_path),
        }))
      );
      setLoading(false);
    })();
  }, [router, supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const leftMember = members[0] ?? null;
  const rightMember = members[1] ?? null;

  return (
    <div className="soft-dots-bg relative flex min-h-dvh flex-col">
      <AppTopbar
        activeNav="invite"
        title="连结成功"
        subtitle="共享空间已建立"
        currentUserAvatarUrl={currentUserAvatarUrl}
        currentUserDisplayName={currentUserDisplayName}
        onSignOut={signOut}
      />

      <main className="relative flex flex-1 items-center justify-center px-4 py-8 sm:py-10">
        <section className="relative w-full max-w-[640px] overflow-hidden rounded-3xl border border-white/60 bg-white/70 px-5 py-10 text-center shadow-sm backdrop-blur-xl sm:px-6 sm:py-12 md:p-12">
          <div className="absolute left-0 top-6 flex w-full justify-center opacity-10">
            <p className="text-8xl font-extrabold tracking-widest text-primary">TWODO</p>
          </div>

          <div className="relative mt-4 flex h-40 items-center justify-center sm:h-48 md:h-64">
            <div className="absolute left-1/2 top-1/2 h-1 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200" />

            <div className="absolute left-1/2 top-1/2 -translate-x-[96px] -translate-y-1/2 sm:-translate-x-[120px] md:-translate-x-[145px]">
              <UserAvatar
                src={leftMember?.avatarUrl ?? null}
                name={leftMember?.displayName ?? "我"}
                className="size-20 border-4 border-white shadow-lg sm:size-24"
                textClassName="text-2xl sm:text-3xl"
              />
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-y-1/2 translate-x-[26px] sm:translate-x-[36px] md:translate-x-[50px]">
              <UserAvatar
                src={rightMember?.avatarUrl ?? null}
                name={rightMember?.displayName ?? "TA"}
                className="size-20 border-4 border-white shadow-lg sm:size-24"
                textClassName="text-2xl sm:text-3xl"
              />
            </div>

            <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl border-2 border-primary/20 bg-white p-3 shadow-md">
              <span className="text-3xl text-primary">❤</span>
              <span className="mt-1 text-[10px] font-bold tracking-wider text-primary">TWODO</span>
            </div>

            <span className="absolute left-1/3 top-1/4 text-xl text-yellow-400">✦</span>
            <span className="absolute bottom-1/4 right-1/3 text-lg text-primary/60">✧</span>
          </div>

          <div className="mx-auto mt-2 flex max-w-[480px] flex-col items-center gap-4">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              连结成功！欢迎来到 TWODO 小屋
            </h1>
            <p className="max-w-[420px] text-sm leading-relaxed text-slate-500 sm:text-base">
              你们已经成功绑定，准备好开始共同记录生活了吗？
              <br />
              这是属于你们两个人的私密空间。
            </p>
            {loading ? <p className="text-sm text-slate-400">头像加载中...</p> : null}
          </div>

          <div className="mt-8 flex flex-col items-center gap-4 pt-2">
            <Link
              href="/app"
              className="group relative flex h-14 w-full max-w-[320px] items-center justify-center rounded-full bg-[#f0427c] px-8 text-base font-bold text-white shadow-lg shadow-[#f0427c]/20 transition-all active:scale-95"
            >
              <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative">进入 TWODO 小屋 →</span>
            </Link>
            <Link href="/app" className="text-sm font-medium text-slate-500 transition-colors hover:text-primary">
              稍后再设置
            </Link>
          </div>
        </section>

        <p className="absolute bottom-6 hidden text-xs text-slate-400 sm:block">TWODO · 您的数据已加密并安全存储</p>
      </main>
    </div>
  );
}
