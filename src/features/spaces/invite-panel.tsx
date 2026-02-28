"use client";

import { useMemo, useState } from "react";
import type {
  CloseSharedSpaceState,
  InviteJoinResult,
} from "@/features/spaces/invite";

type InvitePanelProps = {
  inviteCode: string | null;
  creatingSharedSpace: boolean;
  canCreateSharedSpace: boolean;
  canInviteByCode: boolean;
  hasSharedSpace: boolean;
  joinDisabledReason: string | null;
  closeState: CloseSharedSpaceState | null;
  closeActionLoading: boolean;
  onCreateSharedSpace: () => Promise<void>;
  onCopy: () => Promise<void>;
  onJoin: (inviteCode: string) => Promise<InviteJoinResult>;
  onRequestClose: () => Promise<void>;
  onConfirmClose: () => Promise<void>;
  onCancelClose: () => Promise<void>;
};

function joinMessage(result: InviteJoinResult) {
  switch (result) {
    case "space_full":
      return "该空间已满（最多 2 人）";
    case "already_member":
      return "你已经在该空间中";
    case "already_has_shared_space":
      return "你已拥有共享空间，不能加入新的共享空间";
    case "invalid_code":
      return "邀请码无效，请检查后重试";
    default:
      return "加入成功";
  }
}

export function InvitePanel({
  inviteCode,
  creatingSharedSpace,
  canCreateSharedSpace,
  canInviteByCode,
  hasSharedSpace,
  joinDisabledReason,
  closeState,
  closeActionLoading,
  onCreateSharedSpace,
  onCopy,
  onJoin,
  onRequestClose,
  onConfirmClose,
  onCancelClose,
}: InvitePanelProps) {
  const [joinInput, setJoinInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinStatus, setJoinStatus] = useState<InviteJoinResult | null>(null);
  const [copyInfo, setCopyInfo] = useState<string | null>(null);

  const codeChars = useMemo(() => {
    if (!inviteCode) {
      return [] as string[];
    }

    return inviteCode.split("");
  }, [inviteCode]);

  return (
    <div className="w-full rounded-xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8 md:p-12">
      <section className="flex w-full flex-col items-center gap-6">
        <h2 className="rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary sm:text-sm">
          Your Unique Love Code
        </h2>

        {inviteCode && canInviteByCode ? (
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
            {codeChars.map((char, index) => {
              if (index === 3) {
                return (
                  <div
                    key={`dash-${char}-${index}`}
                    className="flex items-center justify-center px-1 md:px-2"
                  >
                    <span className="block h-1 w-6 rounded-full bg-slate-200" />
                  </div>
                );
              }

              return (
                <div key={`${char}-${index}`} className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-amber-200/30 blur-sm" />
                  <div className="relative flex h-14 w-12 items-center justify-center rounded-2xl border-2 border-slate-100 bg-white text-3xl font-bold text-slate-900 md:h-20 md:w-16 md:text-4xl">
                    {char}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full max-w-[560px] rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
            {!hasSharedSpace ? (
              <p className="text-sm text-slate-500">你还没有共享空间，先创建邀请码吧。</p>
            ) : (
              <p className="text-sm text-slate-500">
                {canInviteByCode
                  ? "可继续复制邀请码邀请对方"
                  : "已拥有共享空间，不允许再邀请或创建新共享空间"}
              </p>
            )}
          </div>
        )}

        <div className="flex w-full max-w-[560px] flex-col gap-4 sm:flex-row">
          <button
            type="button"
            className="h-12 flex-1 rounded-full bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/30 transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 sm:h-14 sm:text-lg"
            onClick={async () => {
              if (inviteCode && canInviteByCode) {
                await onCopy();
                setCopyInfo("已复制邀请码");
                window.setTimeout(() => setCopyInfo(null), 1200);
                return;
              }

              if (canCreateSharedSpace) {
                await onCreateSharedSpace();
              }
            }}
            disabled={creatingSharedSpace || (!canCreateSharedSpace && !(inviteCode && canInviteByCode))}
          >
            {inviteCode && canInviteByCode
              ? "📋 Copy Code"
              : creatingSharedSpace
                ? "创建中..."
                : canCreateSharedSpace
                  ? "创建共享空间并生成邀请码"
                  : "已拥有共享空间"}
          </button>
          <button
            type="button"
            className="h-12 flex-1 rounded-full border-2 border-slate-100 bg-white px-4 text-sm font-bold text-slate-900 transition-all hover:scale-[1.02] hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 sm:h-14 sm:text-lg"
            onClick={async () => {
              if (!inviteCode || !canInviteByCode) {
                return;
              }

              try {
                await navigator.clipboard.writeText(inviteCode);
                setJoinInput(inviteCode);
                setCopyInfo("邀请码已填入加入输入框");
              } catch {
                setCopyInfo("无法自动复制，请手动输入邀请码");
              }

              window.setTimeout(() => setCopyInfo(null), 1200);
            }}
            disabled={!inviteCode || !canInviteByCode}
          >
            🔗 Share Link
          </button>
        </div>

        {copyInfo ? <p className="text-sm text-emerald-600">{copyInfo}</p> : null}
      </section>

      <div className="my-8 h-px w-full bg-slate-100" />

      <section className="w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">输入邀请码加入</h3>
            <p className="mt-1 text-sm text-slate-500">输入对方分享的 8 位邀请码</p>

            <input
              value={joinInput}
              onChange={(event) => {
                setJoinInput(event.target.value.toUpperCase());
                setJoinStatus(null);
              }}
              placeholder="例如：8A2F91B4"
              className="mt-4 h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-center text-base font-bold tracking-[0.12em] text-slate-800 outline-none transition focus:border-primary disabled:bg-slate-100 sm:px-4 sm:text-lg sm:tracking-[0.2em]"
              maxLength={8}
              disabled={hasSharedSpace}
            />

            {joinDisabledReason ? (
              <p className="mt-2 text-xs font-semibold text-slate-500">{joinDisabledReason}</p>
            ) : null}

            {joinStatus ? (
              <p
                className={`mt-3 text-sm ${
                  joinStatus === "ok" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {joinMessage(joinStatus)}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className="h-12 rounded-full bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/30 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 sm:px-8"
            disabled={joining || joinInput.trim().length === 0 || hasSharedSpace}
            onClick={async () => {
              setJoining(true);
              const result = await onJoin(joinInput);
              setJoinStatus(result);
              setJoining(false);
            }}
          >
            {joining ? "加入中..." : "加入共享空间"}
          </button>
        </div>
      </section>

      {closeState ? (
        <section className="mt-6 w-full rounded-2xl border border-dashed border-rose-200 bg-rose-50/60 p-6">
          <h3 className="text-xl font-bold text-slate-900">关闭共享空间</h3>
          <p className="mt-1 text-sm text-slate-600">
            关闭后会解散当前共享空间，并将快照写入归档记录。
          </p>

          {closeState === "none" ? (
            <button
              type="button"
              className="mt-4 h-11 rounded-full bg-rose-600 px-6 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
              disabled={closeActionLoading}
              onClick={() => void onRequestClose()}
            >
              {closeActionLoading ? "处理中..." : "发起关闭共享空间"}
            </button>
          ) : null}

          {closeState === "pending_by_me" ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-amber-700">已发起关闭请求，等待对方确认</p>
              <button
                type="button"
                className="h-10 rounded-full border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60"
                disabled={closeActionLoading}
                onClick={() => void onCancelClose()}
              >
                {closeActionLoading ? "处理中..." : "取消关闭请求"}
              </button>
            </div>
          ) : null}

          {closeState === "pending_by_partner" ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-amber-700">对方已发起关闭请求，请确认</p>
              <button
                type="button"
                className="h-10 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                disabled={closeActionLoading}
                onClick={() => void onConfirmClose()}
              >
                {closeActionLoading ? "处理中..." : "确认关闭"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mt-6 w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6">
        <div className="flex items-center gap-4">
          <div className="flex size-20 items-center justify-center rounded-full bg-amber-100 text-4xl">
            🐱
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Waiting for connection...</h3>
            <p className="mt-1 text-sm text-slate-500">
              The kitty is sleeping until your partner joins. Send them the code to wake it up!
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
              ● Listening
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
