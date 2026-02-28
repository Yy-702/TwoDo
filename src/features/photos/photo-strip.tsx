"use client";

import { useRef, useState } from "react";
import type { PhotoListState, SpacePhoto } from "@/features/photos/photo";

type PhotoStripProps = {
  photos: SpacePhoto[];
  listState: PhotoListState;
  uploadingPhoto: boolean;
  photoError: string | null;
  onSelectFile: (file: File) => Promise<void>;
  onDeletePhoto: (photo: SpacePhoto) => Promise<void>;
  canDeletePhoto: (photo: SpacePhoto) => boolean;
};

export function PhotoStrip({
  photos,
  listState,
  uploadingPhoto,
  photoError,
  onSelectFile,
  onDeletePhoto,
  canDeletePhoto,
}: PhotoStripProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">最近的照片 📸</h3>
      </div>

      {listState === "loading" ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          正在加载照片...
        </div>
      ) : null}

      {listState !== "loading" ? (
        <div className="flex gap-3 overflow-x-auto pb-4 sm:gap-4">
          {photos.map((photo, index) => (
            <article
              key={photo.id}
              className={`${index % 2 === 0 ? "rotate-2" : "-rotate-1"} group relative h-56 w-40 shrink-0 rounded-lg border border-slate-200 bg-white p-2 pb-8 shadow-sm transition-transform duration-300 hover:rotate-0 sm:h-64 sm:w-48`}
            >
              <div
                className="mb-2 h-40 rounded bg-slate-100 sm:h-48"
                style={{
                  backgroundImage: `url(${photo.publicUrl})`,
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                }}
              />
              <p className="line-clamp-1 text-center font-display text-sm font-bold text-slate-600">
                {new Date(photo.createdAt).toLocaleDateString("zh-CN")}
              </p>

              {canDeletePhoto(photo) ? (
                <button
                  type="button"
                  className="absolute right-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-black/75"
                  disabled={deletingPhotoId === photo.id}
                  onClick={async () => {
                    const confirmed = window.confirm("确定删除这张照片吗？删除后不可恢复。");
                    if (!confirmed) {
                      return;
                    }

                    setDeletingPhotoId(photo.id);
                    await onDeletePhoto(photo);
                    setDeletingPhotoId(null);
                  }}
                >
                  {deletingPhotoId === photo.id ? "删除中..." : "删除"}
                </button>
              ) : null}
            </article>
          ))}

          <button
            type="button"
            className="flex h-56 w-40 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-100 text-slate-400 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 sm:h-64 sm:w-48"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl">📷</span>
              <span className="text-xs font-bold">{uploadingPhoto ? "上传中..." : "添加照片"}</span>
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              event.target.value = "";

              if (!file) {
                return;
              }

              void onSelectFile(file);
            }}
          />
        </div>
      ) : null}

      {listState === "ready" && photos.length === 0 ? (
        <p className="text-sm text-slate-500">还没有照片，点击“添加照片”上传第一张。</p>
      ) : null}

      {photoError ? <p className="mt-2 text-sm text-rose-600">{photoError}</p> : null}
    </section>
  );
}
