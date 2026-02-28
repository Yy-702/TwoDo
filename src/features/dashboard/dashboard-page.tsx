"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { AppShell } from "@/components/layout/app-shell";
import { UserAvatar } from "@/components/profile/user-avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { SpaceSwitcher } from "@/features/spaces/space-switcher";
import { TodoList } from "@/features/todos/todo-list";
import { TodoEditorModal } from "@/features/todos/todo-editor-modal";
import { deriveAssigneeMode, mapAssigneeModeToUserId } from "@/features/todos/assignee";
import { MoodSelector } from "@/features/dashboard/mood-selector";
import { pickDailyChallenge, toShanghaiChallengeDate } from "@/features/challenges/challenge";
import { AvatarEditorModal } from "@/features/profile/avatar-editor-modal";
import {
  getAvatarPublicUrl,
  uploadAvatarWithProfileUpdate,
  type ProfileAvatar,
} from "@/features/profile/avatar";
import { PhotoStrip } from "@/features/photos/photo-strip";
import {
  deleteSpacePhotoWithRecord,
  getPhotoDeletePermission,
  loadRecentSpacePhotos,
  uploadSpacePhotoWithRecord,
  type PhotoListState,
  type SpacePhoto,
} from "@/features/photos/photo";
import type { Space } from "@/features/spaces/types";
import type { Todo, TodoEditorValue } from "@/features/todos/types";

type MemberOption = {
  userId: string;
  label: string;
  avatarUrl: string | null;
};

function splitDueAt(dueAt: string | null): { dueDate: string; dueTime: string } {
  if (!dueAt) {
    return { dueDate: "", dueTime: "" };
  }

  const time = dayjs(dueAt);
  return {
    dueDate: time.format("YYYY-MM-DD"),
    dueTime: time.format("HH:mm"),
  };
}

function buildDueAtIso(dueDate: string, dueTime: string): string | null {
  if (!dueDate) {
    return null;
  }

  if (!dueTime) {
    return dayjs(`${dueDate}T00:00:00`).toISOString();
  }

  return dayjs(`${dueDate}T${dueTime}:00`).toISOString();
}

export function DashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<ProfileAvatar | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [photos, setPhotos] = useState<SpacePhoto[]>([]);
  const [photoListState, setPhotoListState] = useState<PhotoListState>("idle");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<
    "idle" | "connected" | "reconnecting"
  >("idle");

  const [modalState, setModalState] = useState<
    | {
        mode: "create" | "edit";
        todo: Todo | null;
      }
    | null
  >(null);

  const loadTodos = useCallback(
    async (spaceId: string) => {
      const { data, error: loadError } = await supabase
        .from("todos")
        .select("*")
        .eq("space_id", spaceId)
        .order("created_at", { ascending: false });

      if (loadError) {
        throw loadError;
      }

      setTodos(data ?? []);
    },
    [supabase]
  );

  const loadPhotos = useCallback(
    async (spaceId: string) => {
      setPhotoError(null);
      setPhotoListState("loading");

      try {
        const nextPhotos = await loadRecentSpacePhotos({
          supabase,
          spaceId,
          limit: 20,
        });

        setPhotos(nextPhotos);
        setPhotoListState("ready");
      } catch (errorValue) {
        setPhotoListState("error");
        setPhotoError("加载照片失败，请稍后重试");
        throw errorValue;
      }
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

      const options: MemberOption[] = (data ?? []).map(
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

      setMembers(options);
    },
    [supabase]
  );

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
      setError("初始化个人空间失败，请刷新后重试");
      setLoading(false);
      return;
    }

    const { data: spaceList, error: spacesError } = await supabase
      .from("spaces")
      .select("*")
      .order("created_at", { ascending: true });

    if (spacesError) {
      setError(`加载空间失败：${spacesError.message}`);
      setLoading(false);
      return;
    }

    const nextSpaces = spaceList ?? [];
    setSpaces(nextSpaces);

    if (nextSpaces.length === 0) {
      setCurrentSpaceId(null);
      setTodos([]);
      setMembers([]);
      setPhotos([]);
      setPhotoListState("ready");
      setLoading(false);
      return;
    }

    const storedSpaceId = window.localStorage.getItem("twodo.currentSpaceId");
    const selectedSpaceId =
      nextSpaces.find((space) => space.id === storedSpaceId)?.id ?? nextSpaces[0].id;

    setCurrentSpaceId(selectedSpaceId);
    window.localStorage.setItem("twodo.currentSpaceId", selectedSpaceId);

    try {
      await Promise.all([
        loadTodos(selectedSpaceId),
        loadPhotos(selectedSpaceId),
        loadMembers(selectedSpaceId, user.id),
        loadCurrentUserProfile(user.id),
      ]);
    } catch (errorValue) {
      const message = errorValue instanceof Error ? errorValue.message : "未知错误";
      setError(`加载空间数据失败：${message}`);
    }

    setLoading(false);
  }, [loadCurrentUserProfile, loadMembers, loadPhotos, loadTodos, router, supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInitial();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadInitial]);

  useEffect(() => {
    if (!currentSpaceId) {
      return;
    }

    const channel = supabase
      .channel(`todos:${currentSpaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "todos",
          filter: `space_id=eq.${currentSpaceId}`,
        },
        () => {
          void loadTodos(currentSpaceId);
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
  }, [currentSpaceId, loadTodos, supabase]);

  useEffect(() => {
    if (!currentSpaceId) {
      return;
    }

    const channel = supabase
      .channel(`space_photos:${currentSpaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "space_photos",
          filter: `space_id=eq.${currentSpaceId}`,
        },
        () => {
          void loadPhotos(currentSpaceId).catch(() => {
            // 错误状态由 loadPhotos 内部统一设置，这里避免未处理 Promise 报错。
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentSpaceId, loadPhotos, supabase]);

  const openCreateModal = () => {
    setModalState({ mode: "create", todo: null });
  };

  const openEditModal = (todo: Todo) => {
    setModalState({ mode: "edit", todo });
  };

  const modalInitialValue: TodoEditorValue = useMemo(() => {
    if (!modalState || !modalState.todo) {
      return {
        title: "",
        description: "",
        priority: "medium",
        dueDate: "",
        dueTime: "",
        assigneeMode: "both",
        assigneeUserId: null,
      };
    }

    const due = splitDueAt(modalState.todo.due_at);
    const assignee = deriveAssigneeMode(modalState.todo.assignee_user_id);

    return {
      title: modalState.todo.title,
      description: modalState.todo.description ?? "",
      priority: modalState.todo.priority,
      dueDate: due.dueDate,
      dueTime: due.dueTime,
      assigneeMode: assignee.mode,
      assigneeUserId: assignee.assigneeUserId,
    };
  }, [modalState]);

  async function switchSpace(spaceId: string) {
    if (!userId) {
      return;
    }

    setCurrentSpaceId(spaceId);
    window.localStorage.setItem("twodo.currentSpaceId", spaceId);
    setError(null);

    try {
      await Promise.all([
        loadTodos(spaceId),
        loadPhotos(spaceId),
        loadMembers(spaceId, userId),
        loadCurrentUserProfile(userId),
      ]);
    } catch {
      setError("切换空间失败，请稍后重试");
    }
  }

  async function submitTodoForm(value: TodoEditorValue) {
    if (!currentSpaceId || !userId || !modalState) {
      return;
    }

    const payload = {
      title: value.title.trim(),
      description: value.description.trim() || null,
      priority: value.priority,
      due_at: buildDueAtIso(value.dueDate, value.dueTime),
      assignee_user_id: mapAssigneeModeToUserId(
        value.assigneeMode,
        value.assigneeUserId
      ),
    };

    if (payload.title.length === 0) {
      throw new Error("任务标题不能为空");
    }

    if (modalState.mode === "create") {
      const { error: insertError } = await supabase.from("todos").insert({
        ...payload,
        space_id: currentSpaceId,
        created_by: userId,
      });

      if (insertError) {
        throw insertError;
      }
    } else if (modalState.todo) {
      const { error: updateError } = await supabase
        .from("todos")
        .update(payload)
        .eq("id", modalState.todo.id);

      if (updateError) {
        throw updateError;
      }
    }

    await loadTodos(currentSpaceId);
    setModalState(null);
  }

  async function deleteTodo(todo: Todo) {
    if (!currentSpaceId) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("todos")
      .delete()
      .eq("id", todo.id);

    if (deleteError) {
      setError("删除任务失败，请稍后重试");
      return;
    }

    await loadTodos(currentSpaceId);
    setModalState(null);
  }

  async function toggleComplete(todo: Todo) {
    const { error: toggleError } = await supabase
      .from("todos")
      .update({
        is_completed: !todo.is_completed,
        completed_at: todo.is_completed ? null : new Date().toISOString(),
      })
      .eq("id", todo.id);

    if (toggleError) {
      setError("更新任务状态失败，请稍后重试");
      return;
    }

    if (currentSpaceId) {
      await loadTodos(currentSpaceId);
    }
  }

  async function createSharedSpace() {
    setSaving(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc("rpc_create_shared_space", {
      space_name: "我们的共享空间",
    });

    setSaving(false);

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
        router.push("/app/invite");
        return;
      }

      setError("创建共享空间失败，请稍后重试");
      return;
    }

    router.push("/app/invite");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function submitAvatar(file: File) {
    if (!userId) {
      setAvatarError("登录状态已失效，请重新登录");
      return;
    }

    setAvatarUploading(true);
    setAvatarError(null);

    const result = await uploadAvatarWithProfileUpdate({
      supabase,
      userId,
      file,
      previousAvatarPath: currentUserProfile?.avatarPath ?? null,
    });

    setAvatarUploading(false);

    if (!result.ok) {
      setAvatarError(result.message);
      return;
    }

    try {
      await loadCurrentUserProfile(userId);

      if (currentSpaceId) {
        await loadMembers(currentSpaceId, userId);
      }

      setAvatarModalOpen(false);
    } catch {
      setAvatarError("头像保存成功，但刷新显示失败，请手动刷新页面");
    }
  }

  async function handlePhotoSelect(file: File) {
    if (!currentSpaceId || !userId) {
      setPhotoError("登录状态已失效，请重新登录");
      return;
    }

    setUploadingPhoto(true);
    setPhotoError(null);

    const result = await uploadSpacePhotoWithRecord({
      supabase,
      spaceId: currentSpaceId,
      userId,
      file,
    });

    setUploadingPhoto(false);

    if (!result.ok) {
      setPhotoError(result.message);
      return;
    }

    try {
      await loadPhotos(currentSpaceId);
    } catch {
      setPhotoError("上传成功，但刷新照片列表失败，请手动刷新");
    }
  }

  async function handleDeletePhoto(photo: SpacePhoto) {
    if (!currentSpaceId || !userId) {
      setPhotoError("登录状态已失效，请重新登录");
      return;
    }

    const ownerUserId = spaces.find((space) => space.id === currentSpaceId)?.owner_user_id;
    if (!ownerUserId) {
      setPhotoError("当前空间信息缺失，请刷新后重试");
      return;
    }

    const permission = getPhotoDeletePermission({
      photo,
      currentUserId: userId,
      spaceOwnerUserId: ownerUserId,
    });

    if (permission === "forbidden") {
      setPhotoError("无权限操作该照片");
      return;
    }

    setPhotoError(null);
    const result = await deleteSpacePhotoWithRecord({
      supabase,
      photo: {
        id: photo.id,
        objectPath: photo.objectPath,
      },
    });

    if (!result.ok) {
      setPhotoError(result.message);
      return;
    }

    try {
      await loadPhotos(currentSpaceId);
    } catch {
      setPhotoError("删除成功，但刷新照片列表失败，请手动刷新");
    }
  }

  const currentSpace = spaces.find((space) => space.id === currentSpaceId) ?? null;
  const hasSharedSpace = spaces.some((space) => space.type === "shared");
  const completedCount = todos.filter((todo) => todo.is_completed).length;
  const pendingCount = todos.length - completedCount;
  const coupleMembers = members.slice(0, 2);
  const todayChallenge = useMemo(
    () => pickDailyChallenge(toShanghaiChallengeDate()),
    []
  );
  const canDeletePhoto = (photo: SpacePhoto) => {
    if (!userId || !currentSpace) {
      return false;
    }

    return (
      getPhotoDeletePermission({
        photo,
        currentUserId: userId,
        spaceOwnerUserId: currentSpace.owner_user_id,
      }) !== "forbidden"
    );
  };

  const realtimeLabel =
    realtimeStatus === "connected"
      ? "实时同步中"
      : realtimeStatus === "reconnecting"
        ? "重连中"
        : "未连接";

  return (
    <AppShell
      title="早安，宝贝！ 💖"
      subtitle={`${dayjs().format("M月D日")} · ${currentSpace ? currentSpace.name : "加载中"}`}
      activeNav="dashboard"
      currentUserAvatarUrl={currentUserProfile?.avatarUrl ?? null}
      currentUserDisplayName={currentUserProfile?.displayName ?? null}
      onEditAvatar={() => {
        setAvatarError(null);
        setAvatarModalOpen(true);
      }}
      onSignOut={signOut}
      avatarUploading={avatarUploading}
      actions={
        <>
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
          {hasSharedSpace ? (
            <button
              type="button"
              className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary sm:inline-flex"
              onClick={() => router.push("/app/invite")}
            >
              管理共享空间
            </button>
          ) : (
            <button
              type="button"
              className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary sm:inline-flex"
              onClick={() => void createSharedSpace()}
              disabled={saving}
            >
              {saving ? "创建中..." : "创建共享空间"}
            </button>
          )}
        </>
      }
    >
      {loading ? (
        <div className="rounded-3xl border border-slate-100 bg-white px-4 py-16 text-center text-sm text-slate-500">
          正在加载工作台...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
            <section className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
              <div className="absolute right-4 top-0 rotate-12 text-7xl text-primary/10">☺</div>
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-900 sm:text-xl">
                <span className="text-primary">●</span>
                今日心情
              </h3>
              <MoodSelector />
            </section>

            <section className="relative flex min-h-[210px] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-orange-400 p-4 text-white shadow-lg sm:p-6">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
              <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-black/10 blur-xl" />

              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-90">双人挑战</p>
                <h3 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                  {todayChallenge.title} {todayChallenge.emoji}
                </h3>
                <p className="mt-2 text-sm text-white/80">{todayChallenge.description}</p>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {coupleMembers.length > 0 ? (
                    coupleMembers.map((member) => (
                      <UserAvatar
                        key={member.userId}
                        src={member.avatarUrl}
                        name={member.label}
                        className="size-8 border-2 border-primary"
                        textClassName="text-xs"
                      />
                    ))
                  ) : (
                    <UserAvatar
                      src={null}
                      name="TA"
                      className="size-8 border-2 border-primary"
                      textClassName="text-xs"
                    />
                  )}
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur-sm transition hover:bg-white/30"
                  onClick={() => router.push("/app/challenges")}
                >
                  去打卡
                </button>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <article className="rounded-2xl border border-slate-100 bg-white p-3 text-center sm:p-4">
              <p className="font-display text-3xl font-bold text-primary sm:text-4xl">{spaces.length}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">空间数量</p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-3 text-center sm:p-4">
              <p className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">{todos.length}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">总任务数</p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-3 text-center sm:p-4">
              <p className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">{pendingCount}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">待办任务</p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-3 text-center sm:p-4">
              <p className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">{completedCount}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">已完成</p>
            </article>
          </div>

          <section id="todo-board" className="mt-1">
            <div className="mb-5 flex flex-col gap-4 lg:mb-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">置顶任务</h3>
                <p className="mt-1 text-sm text-slate-500">当前空间任务会实时同步给双方</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary sm:w-auto"
                  onClick={() => router.push("/app/invite")}
                >
                  邀请伙伴
                </button>
                <button
                  type="button"
                  className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-md shadow-primary/25 transition hover:opacity-90 sm:w-auto"
                  onClick={openCreateModal}
                >
                  新建任务
                </button>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-4">
              <SpaceSwitcher
                spaces={spaces}
                currentSpaceId={currentSpaceId}
                onChange={(id) => void switchSpace(id)}
              />
            </div>

            <TodoList
              todos={todos}
              onToggleComplete={(todo) => void toggleComplete(todo)}
              onEdit={openEditModal}
              onDelete={(todo) => void deleteTodo(todo)}
            />
          </section>

          <PhotoStrip
            photos={photos}
            listState={photoListState}
            uploadingPhoto={uploadingPhoto}
            photoError={photoError}
            onSelectFile={handlePhotoSelect}
            onDeletePhoto={handleDeletePhoto}
            canDeletePhoto={canDeletePhoto}
          />
        </>
      )}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {error ? (
        <button
          type="button"
          className="w-fit rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
          onClick={() => void loadInitial()}
        >
          重试加载
        </button>
      ) : null}

      {modalState ? (
        <TodoEditorModal
          mode={modalState.mode}
          initialValue={modalInitialValue}
          members={members}
          onClose={() => setModalState(null)}
          onSubmit={submitTodoForm}
          onDelete={
            modalState.todo
              ? async () => {
                  await deleteTodo(modalState.todo as Todo);
                }
              : undefined
          }
        />
      ) : null}

      {avatarModalOpen ? (
        <AvatarEditorModal
          currentAvatarUrl={currentUserProfile?.avatarUrl ?? null}
          currentDisplayName={currentUserProfile?.displayName ?? null}
          uploading={avatarUploading}
          uploadError={avatarError}
          onClose={() => {
            if (avatarUploading) {
              return;
            }

            setAvatarModalOpen(false);
          }}
          onSubmit={submitAvatar}
        />
      ) : null}
    </AppShell>
  );
}
