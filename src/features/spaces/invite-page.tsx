"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { InvitePanel } from "@/features/spaces/invite-panel";
import {
  deriveCloseSharedSpaceState,
  extractCloseErrorCode,
  extractJoinErrorCode,
  mapCloseActionResult,
  mapCloseErrorCodeMessage,
  mapJoinErrorCode,
  mapJoinSystemErrorMessage,
  toInviteCode,
  type CloseSharedSpaceState,
  type InviteJoinResult,
  type SharedSpaceContext,
} from "@/features/spaces/invite";
import { getAvatarPublicUrl } from "@/features/profile/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function InvitePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [closeActionLoading, setCloseActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string | null>(null);
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);
  const [sharedContext, setSharedContext] = useState<SharedSpaceContext | null>(null);

  const loadSharedSpaceContext = useCallback(async () => {
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace("/login");
      return;
    }

    setCurrentUserId(user.id);

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, avatar_path")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileError) {
      setCurrentUserDisplayName(profileData?.display_name ?? null);
      setCurrentUserAvatarUrl(getAvatarPublicUrl(supabase, profileData?.avatar_path ?? null));
    }

    const { data, error: contextError } = await supabase.rpc(
      "rpc_get_my_shared_space_context"
    );

    if (contextError) {
      setError("加载共享空间状态失败，请稍后重试");
      return;
    }

    const nextContext = data?.[0];

    if (!nextContext) {
      setSharedContext(null);
      return;
    }

    setSharedContext({
      spaceId: nextContext.space_id,
      ownerUserId: nextContext.owner_user_id,
      inviteCode: nextContext.invite_code,
      memberCount: nextContext.member_count,
      closeRequestInitiatorUserId: nextContext.close_request_initiator_user_id,
      closeRequestCreatedAt: nextContext.close_request_created_at,
    });
  }, [router, supabase]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadSharedSpaceContext();
      setLoading(false);
    })();
  }, [loadSharedSpaceContext]);

  async function createSharedSpace() {
    setCreating(true);
    setError(null);
    setHint(null);

    const { error: rpcError } = await supabase.rpc(
      "rpc_create_shared_space",
      {
        space_name: "我们的共享空间",
      }
    );

    setCreating(false);

    if (rpcError) {
      const rawError = [
        rpcError.code,
        rpcError.message,
        rpcError.details,
        rpcError.hint,
      ]
        .filter(Boolean)
        .join(" | ")
        .toUpperCase();

      if (rawError.includes("ALREADY_HAS_SHARED_SPACE")) {
        setError("你已拥有共享空间，不能再创建新的共享空间");
        await loadSharedSpaceContext();
        return;
      }

      setError("创建共享空间失败，请稍后重试");
      return;
    }

    await loadSharedSpaceContext();
    setHint("共享空间已创建，可复制邀请码邀请对方");
  }

  async function copyCode() {
    const inviteCode = sharedContext?.inviteCode;
    if (!inviteCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteCode);
      setHint("已复制邀请码");
    } catch {
      setError("复制失败，请手动复制邀请码");
    }
  }

  async function joinByCode(rawCode: string): Promise<InviteJoinResult> {
    if (sharedContext) {
      return "already_has_shared_space";
    }

    const normalizedCode = toInviteCode(rawCode);
    setError(null);
    setHint(null);

    const { error: firstError } = await supabase.rpc("rpc_join_shared_space", {
      invite_code: normalizedCode,
    });

    if (!firstError) {
      router.push("/app/invite/success");
      return "ok";
    }

    const firstRaw = [
      firstError.code,
      firstError.message,
      firstError.details,
      firstError.hint,
    ]
      .filter(Boolean)
      .join(" | ");

    const systemErrorMessage = mapJoinSystemErrorMessage(firstRaw);

    if (systemErrorMessage) {
      setError(systemErrorMessage);
    }

    const code = extractJoinErrorCode(firstRaw);
    return mapJoinErrorCode(code);
  }

  async function requestCloseSharedSpace() {
    if (!sharedContext) {
      return;
    }

    setCloseActionLoading(true);
    setError(null);
    setHint(null);

    const { data, error: rpcError } = await supabase.rpc(
      "rpc_request_close_shared_space",
      {
        target_space_id: sharedContext.spaceId,
      }
    );

    setCloseActionLoading(false);

    if (rpcError) {
      const rawError = [
        rpcError.code,
        rpcError.message,
        rpcError.details,
        rpcError.hint,
      ]
        .filter(Boolean)
        .join(" | ");

      const closeCode = extractCloseErrorCode(rawError);
      setError(mapCloseErrorCodeMessage(closeCode));
      return;
    }

    const actionResult = mapCloseActionResult(data ?? "");
    if (actionResult === "closed") {
      router.replace("/app");
      router.refresh();
      return;
    }

    if (actionResult === "already_pending") {
      setHint("已存在待确认的关闭请求");
    } else {
      setHint("关闭请求已发起，等待对方确认");
    }

    await loadSharedSpaceContext();
  }

  async function confirmCloseSharedSpace() {
    if (!sharedContext) {
      return;
    }

    setCloseActionLoading(true);
    setError(null);
    setHint(null);

    const { data, error: rpcError } = await supabase.rpc(
      "rpc_confirm_close_shared_space",
      {
        target_space_id: sharedContext.spaceId,
      }
    );

    setCloseActionLoading(false);

    if (rpcError) {
      const rawError = [
        rpcError.code,
        rpcError.message,
        rpcError.details,
        rpcError.hint,
      ]
        .filter(Boolean)
        .join(" | ");

      const closeCode = extractCloseErrorCode(rawError);
      setError(mapCloseErrorCodeMessage(closeCode));
      return;
    }

    const actionResult = mapCloseActionResult(data ?? "");
    if (actionResult === "closed") {
      router.replace("/app");
      router.refresh();
      return;
    }

    await loadSharedSpaceContext();
  }

  async function cancelCloseSharedSpace() {
    if (!sharedContext) {
      return;
    }

    setCloseActionLoading(true);
    setError(null);
    setHint(null);

    const { data, error: rpcError } = await supabase.rpc(
      "rpc_cancel_close_shared_space",
      {
        target_space_id: sharedContext.spaceId,
      }
    );

    setCloseActionLoading(false);

    if (rpcError) {
      const rawError = [
        rpcError.code,
        rpcError.message,
        rpcError.details,
        rpcError.hint,
      ]
        .filter(Boolean)
        .join(" | ");

      const closeCode = extractCloseErrorCode(rawError);
      setError(mapCloseErrorCodeMessage(closeCode));
      return;
    }

    const actionResult = mapCloseActionResult(data ?? "");
    if (actionResult === "cancelled") {
      setHint("已取消关闭请求");
    }

    await loadSharedSpaceContext();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const hasSharedSpace = sharedContext !== null;
  const isSharedOwner =
    sharedContext !== null &&
    currentUserId !== null &&
    sharedContext.ownerUserId === currentUserId;
  const canInviteByCode =
    sharedContext !== null &&
    sharedContext.memberCount < 2 &&
    isSharedOwner;
  const canCreateSharedSpace = !hasSharedSpace;

  const closeState: CloseSharedSpaceState | null =
    sharedContext && currentUserId
      ? deriveCloseSharedSpaceState(sharedContext, currentUserId)
      : null;

  const joinDisabledReason = hasSharedSpace
    ? "你已拥有共享空间，不能加入其他邀请码"
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-[#f6f7f8] font-brand text-slate-900">
      <AppTopbar
        activeNav="invite"
        title="邀请伙伴"
        subtitle="连接你们的共享空间"
        currentUserAvatarUrl={currentUserAvatarUrl}
        currentUserDisplayName={currentUserDisplayName}
        onSignOut={signOut}
      />

      <main className="flex flex-1 justify-center px-4 py-8 md:px-10 md:py-10">
        <div className="flex w-full max-w-[900px] flex-col items-center gap-8">
          <div className="space-y-3 text-center">
            <h2 className="text-4xl font-black tracking-tight text-slate-900 md:text-6xl">Invite Partner</h2>
            <p className="text-base text-slate-500 md:text-lg">
              Who is your other half? Share the magic code to connect.
            </p>
          </div>

          {loading ? (
            <div className="w-full rounded-xl border border-slate-100 bg-white px-4 py-12 text-center text-sm text-slate-500">
              正在加载邀请信息...
            </div>
          ) : (
            <InvitePanel
              inviteCode={canInviteByCode ? sharedContext?.inviteCode ?? null : null}
              creatingSharedSpace={creating}
              canCreateSharedSpace={canCreateSharedSpace}
              canInviteByCode={canInviteByCode}
              hasSharedSpace={hasSharedSpace}
              joinDisabledReason={joinDisabledReason}
              closeState={closeState}
              closeActionLoading={closeActionLoading}
              onCreateSharedSpace={createSharedSpace}
              onCopy={copyCode}
              onJoin={joinByCode}
              onRequestClose={requestCloseSharedSpace}
              onConfirmClose={confirmCloseSharedSpace}
              onCancelClose={cancelCloseSharedSpace}
            />
          )}

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {hint ? <p className="text-sm text-emerald-600">{hint}</p> : null}

          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400 md:gap-6">
            <a href="#" className="transition-colors hover:text-primary">Help Center</a>
            <a href="#" className="transition-colors hover:text-primary">Privacy Policy</a>
            <a href="#" className="transition-colors hover:text-primary">Contact Support</a>
          </div>
        </div>
      </main>
    </div>
  );
}
