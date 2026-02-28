"use client";

import { useState } from "react";
import dayjs from "dayjs";
import type { SpacePhoto } from "@/features/photos/photo";

type MemoryMasonryProps = {
  photos: SpacePhoto[];
  onDeletePhoto: (photo: SpacePhoto) => Promise<void>;
  canDeletePhoto: (photo: SpacePhoto) => boolean;
};

const rotateClasses = ["rotate-1", "-rotate-1", "rotate-2", "-rotate-2", ""];
const imageAspectClasses = ["aspect-[3/4]", "aspect-square", "aspect-[4/3]", "aspect-video", "aspect-[4/5]"];

function stableIndex(source: string, mod: number): number {
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) % 2147483647;
  }

  return Math.abs(hash) % mod;
}

export function MemoryMasonry({
  photos,
  onDeletePhoto,
  canDeletePhoto,
}: MemoryMasonryProps) {
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-16 text-center text-sm text-[#896b61]">
        还没有回忆照片，点击“记录新瞬间”上传第一张。
      </div>
    );
  }

  return (
    <div className="relative z-10 columns-1 gap-6 pb-20 sm:columns-2 lg:columns-3 xl:columns-4">
      {photos.map((photo) => {
        const rotateClass = rotateClasses[stableIndex(photo.id, rotateClasses.length)];
        const aspectClass = imageAspectClasses[stableIndex(`${photo.id}:aspect`, imageAspectClasses.length)];

        return (
          <article key={photo.id} className="mb-6 break-inside-avoid">
            <div
              className={`group rounded-sm bg-white p-3 pb-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${rotateClass}`}
            >
              <div className={`relative mb-4 w-full overflow-hidden rounded-sm bg-gray-100 ${aspectClass}`}>
                <img
                  src={photo.publicUrl}
                  alt={photo.caption ?? "回忆照片"}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {canDeletePhoto(photo) ? (
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs font-semibold text-white opacity-0 transition hover:bg-black/75 group-hover:opacity-100"
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
              </div>

              <div className="px-2 text-center">
                <p className="line-clamp-1 text-lg font-semibold text-[#181311]">
                  {photo.caption ?? "我们的瞬间"}
                </p>
                <p className="mt-1 text-xs text-[#896b61]">{dayjs(photo.createdAt).format("YYYY.MM.DD")}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
