"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppMobileNav } from "@/components/layout/app-mobile-nav";
import { AppTopbar } from "@/components/layout/app-topbar";
import { MemoryFilters } from "@/features/memories/memory-filters";
import { MemoryMasonry } from "@/features/memories/memory-masonry";
import { MemoryUploadModal } from "@/features/memories/memory-upload-modal";
import { getAvatarPublicUrl } from "@/features/profile/avatar";
import {
  deleteSpacePhotoWithRecord,
  getPhotoDeletePermission,
  loadRecentSpacePhotos,
  SPACE_PHOTO_CAPTION_MAX_LENGTH,
  type PhotoListState,
  type SpacePhoto,
  uploadSpacePhotoWithRecord,
} from "@/features/photos/photo";
import type { Space } from "@/features/spaces/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function buildDefaultCaption(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, "").trim();

  if (!withoutExt) {
    return "";
  }

  return withoutExt.slice(0, SPACE_PHOTO_CAPTION_MAX_LENGTH);
}

export function MemoriesPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string | null>(null);
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<SpacePhoto[]>([]);
  const [photoListState, setPhotoListState] = useState<PhotoListState>("idle");

  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCaption, setPendingCaption] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  const loadPhotos = useCallback(
    async (spaceId: string) => {
      setPhotoError(null);
      setPhotoListState("loading");

      try {
        const nextPhotos = await loadRecentSpacePhotos({
          supabase,
          spaceId,
          limit: 60,
        });

        setPhotos(nextPhotos);
        setPhotoListState("ready");
      } catch {
        setPhotoListState("error");
        setPhotoError("加载回忆失败，请稍后重试");
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
      setPhotos([]);
      setPhotoListState("ready");
      setLoading(false);
      return;
    }

    const storedSpaceId = window.localStorage.getItem("twodo.currentSpaceId");
    const preferredSpaceId =
      nextSpaces.find((space) => space.id === storedSpaceId)?.id ?? nextSpaces[0].id;

    setCurrentSpaceId(preferredSpaceId);
    window.localStorage.setItem("twodo.currentSpaceId", preferredSpaceId);

    await loadPhotos(preferredSpaceId);
    setLoading(false);
  }, [loadCurrentUserProfile, loadPhotos, router, supabase]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const currentSpace = spaces.find((space) => space.id === currentSpaceId) ?? null;

  const years = useMemo(() => {
    return Array.from(
      new Set(
        photos
          .map((photo) => new Date(photo.createdAt).getFullYear())
          .filter((year) => Number.isFinite(year))
      )
    ).sort((a, b) => b - a);
  }, [photos]);

  useEffect(() => {
    if (selectedYear === null) {
      return;
    }

    if (!years.includes(selectedYear)) {
      setSelectedYear(null);
    }
  }, [selectedYear, years]);

  const filteredPhotos = useMemo(() => {
    if (selectedYear === null) {
      return photos;
    }

    return photos.filter((photo) => new Date(photo.createdAt).getFullYear() === selectedYear);
  }, [photos, selectedYear]);

  const canDeletePhoto = useCallback(
    (photo: SpacePhoto) => {
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
    },
    [currentSpace, userId]
  );

  async function handleDeletePhoto(photo: SpacePhoto) {
    if (!userId || !currentSpaceId || !currentSpace) {
      setPhotoError("当前空间信息缺失，请刷新后重试");
      return;
    }

    const permission = getPhotoDeletePermission({
      photo,
      currentUserId: userId,
      spaceOwnerUserId: currentSpace.owner_user_id,
    });

    if (permission === "forbidden") {
      setPhotoError("无权限操作该照片");
      return;
    }

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

    await loadPhotos(currentSpaceId);
  }

  async function submitUpload() {
    if (!pendingFile || !currentSpaceId || !userId) {
      return;
    }

    setUploading(true);
    setUploadError(null);

    const result = await uploadSpacePhotoWithRecord({
      supabase,
      spaceId: currentSpaceId,
      userId,
      file: pendingFile,
      caption: pendingCaption,
    });

    setUploading(false);

    if (!result.ok) {
      setUploadError(result.message);
      return;
    }

    setUploadModalOpen(false);
    setPendingFile(null);
    setPendingCaption("");
    setUploadError(null);

    await loadPhotos(currentSpaceId);
  }

  function closeUploadModal() {
    if (uploading) {
      return;
    }

    setUploadModalOpen(false);
    setPendingFile(null);
    setPendingCaption("");
    setUploadError(null);
  }

  function triggerFileSelect() {
    if (!currentSpaceId) {
      setPhotoError("当前空间信息缺失，请刷新后重试");
      return;
    }

    fileInputRef.current?.click();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f8f6f6] font-brand text-[#181311]">
      <AppTopbar
        activeNav="memories"
        title="甜蜜时光"
        subtitle={currentSpace ? `回忆墙 · ${currentSpace.name}` : "回忆墙"}
        currentUserAvatarUrl={currentUserAvatarUrl}
        currentUserDisplayName={currentUserDisplayName}
        onSignOut={signOut}
      />

      <main className="relative mx-auto flex w-full max-w-7xl flex-1 px-4 py-8 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:px-6 lg:px-8 lg:pb-8">
        <div className="pointer-events-none absolute left-10 top-10 text-6xl text-[#f06e42]/10">❤</div>
        <div className="pointer-events-none absolute right-20 top-40 text-4xl text-[#f06e42]/10">✦</div>
        <div className="pointer-events-none absolute bottom-20 left-1/4 text-7xl text-[#f06e42]/5">♡</div>

        <div className="relative z-10 w-full">
          <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tight text-[#181311] md:text-5xl">我们的回忆墙</h2>
              <p className="text-lg font-medium text-[#896b61]">
                收藏每一个心动瞬间 ✨
                {currentSpace ? ` · ${currentSpace.name}` : ""}
              </p>
            </div>
            <button
              type="button"
              className="group flex items-center gap-3 rounded-xl bg-[#f06e42] px-6 py-3 text-white shadow-[0_4px_20px_-2px_rgba(240,110,66,0.1)] transition-all hover:-translate-y-0.5 hover:bg-[#dd6037]"
              onClick={triggerFileSelect}
              disabled={loading}
            >
              <span className="transition-transform group-hover:rotate-12">📷</span>
              <span className="text-base font-bold">记录新瞬间</span>
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-[#896b61]">
              正在加载回忆墙...
            </div>
          ) : (
            <>
              <MemoryFilters
                years={years}
                selectedYear={selectedYear}
                onSelectAll={() => setSelectedYear(null)}
                onSelectYear={(year) => setSelectedYear(year)}
              />

              {photoListState === "loading" ? (
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-[#896b61]">
                  正在加载照片...
                </div>
              ) : (
                <MemoryMasonry
                  photos={filteredPhotos}
                  onDeletePhoto={handleDeletePhoto}
                  canDeletePhoto={canDeletePhoto}
                />
              )}
            </>
          )}

          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
          {photoError ? <p className="mt-2 text-sm text-rose-600">{photoError}</p> : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0] ?? null;
            event.target.value = "";

            if (!selectedFile) {
              return;
            }

            setPendingFile(selectedFile);
            setPendingCaption(buildDefaultCaption(selectedFile.name));
            setUploadModalOpen(true);
            setUploadError(null);
          }}
        />

        <MemoryUploadModal
          open={uploadModalOpen}
          file={pendingFile}
          caption={pendingCaption}
          submitting={uploading}
          error={uploadError}
          onCaptionChange={setPendingCaption}
          onClose={closeUploadModal}
          onSubmit={submitUpload}
        />
      </main>

      <footer className="mt-auto border-t border-gray-100 py-6 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] text-center text-sm text-[#896b61] lg:pb-6">
        <p>© 2024 甜蜜时光 Sweet Moments. Made with ❤ for us.</p>
      </footer>

      <AppMobileNav activeNav="memories" />
    </div>
  );
}
