"use client";

import { useEffect, useMemo } from "react";
import { SPACE_PHOTO_CAPTION_MAX_LENGTH } from "@/features/photos/photo";

type MemoryUploadModalProps = {
  open: boolean;
  file: File | null;
  caption: string;
  submitting: boolean;
  error: string | null;
  onCaptionChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
};

export function MemoryUploadModal({
  open,
  file,
  caption,
  submitting,
  error,
  onCaptionChange,
  onClose,
  onSubmit,
}: MemoryUploadModalProps) {
  const previewUrl = useMemo(() => {
    if (!open || !file) {
      return null;
    }

    return URL.createObjectURL(file);
  }, [open, file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!open || !file || !previewUrl) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <h3 className="text-xl font-extrabold text-[#181311]">记录新瞬间</h3>

        <div className="mt-4 overflow-hidden rounded-xl bg-[#f6f6f6]">
          <img src={previewUrl} alt="待上传照片预览" className="h-64 w-full object-cover" />
        </div>

        <label className="mt-4 grid gap-2">
          <span className="text-sm font-bold text-[#181311]">标题</span>
          <input
            type="text"
            value={caption}
            maxLength={SPACE_PHOTO_CAPTION_MAX_LENGTH}
            onChange={(event) => onCaptionChange(event.target.value)}
            placeholder="写下这一刻，比如：第一次约会"
            className="h-11 rounded-xl border border-gray-200 px-3 text-sm text-[#181311] outline-none transition focus:border-[#f06e42]"
          />
          <span className="text-xs text-[#896b61]">
            {caption.length}/{SPACE_PHOTO_CAPTION_MAX_LENGTH}
          </span>
        </label>

        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-[#896b61] transition hover:bg-gray-50"
            disabled={submitting}
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            className="rounded-xl bg-[#f06e42] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#dd6037] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "上传中..." : "保存回忆"}
          </button>
        </div>
      </div>
    </div>
  );
}
