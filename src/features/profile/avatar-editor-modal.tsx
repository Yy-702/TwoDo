"use client";

import { useEffect, useState } from "react";
import { validateAvatarFile } from "@/features/profile/avatar";
import { UserAvatar } from "@/components/profile/user-avatar";

type AvatarEditorModalProps = {
  currentAvatarUrl: string | null;
  currentDisplayName: string | null;
  uploading: boolean;
  uploadError: string | null;
  onClose: () => void;
  onSubmit: (file: File) => Promise<void>;
};

export function AvatarEditorModal({
  currentAvatarUrl,
  currentDisplayName,
  uploading,
  uploadError,
  onClose,
  onSubmit,
}: AvatarEditorModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[440px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-2xl font-black text-slate-900">修改头像</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xl text-slate-400 transition-colors hover:text-slate-700"
            disabled={uploading}
          >
            ×
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
          <UserAvatar
            src={previewUrl ?? currentAvatarUrl}
            name={currentDisplayName}
            className="size-24"
            textClassName="text-2xl"
          />
          <p className="text-sm text-slate-500">支持 PNG/JPEG/WEBP，最大 2MB</p>

          <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary">
            选择图片
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;

                if (!nextFile) {
                  return;
                }

                const validation = validateAvatarFile(nextFile);
                if (!validation.ok) {
                  setLocalError(validation.message);
                  setSelectedFile(null);
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                  return;
                }

                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                }

                const nextUrl = URL.createObjectURL(nextFile);
                setSelectedFile(nextFile);
                setPreviewUrl(nextUrl);
                setLocalError(null);
              }}
            />
          </label>

          {selectedFile ? (
            <p className="text-xs font-medium text-slate-500">已选择：{selectedFile.name}</p>
          ) : null}
        </div>

        {localError ? <p className="mt-4 text-sm text-rose-600">{localError}</p> : null}
        {uploadError ? <p className="mt-4 text-sm text-rose-600">{uploadError}</p> : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            className="h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            onClick={onClose}
            disabled={uploading}
          >
            取消
          </button>
          <button
            type="button"
            className="h-11 rounded-full bg-primary px-6 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedFile || uploading}
            onClick={async () => {
              if (!selectedFile) {
                setLocalError("请先选择头像图片");
                return;
              }

              setLocalError(null);
              await onSubmit(selectedFile);
            }}
          >
            {uploading ? "上传中..." : "保存头像"}
          </button>
        </div>
      </div>
    </div>
  );
}
