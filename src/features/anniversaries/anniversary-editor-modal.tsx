"use client";

import { useMemo, useState } from "react";
import {
  ANNIVERSARY_NOTE_MAX_LENGTH,
  ANNIVERSARY_TITLE_MAX_LENGTH,
  type AnniversaryCreateInput,
} from "@/features/anniversaries/anniversary";

type AnniversaryEditorModalProps = {
  submitting: boolean;
  error: string | null;
  onSubmit: (value: AnniversaryCreateInput) => Promise<void>;
  onClose: () => void;
};

type FormValue = {
  title: string;
  eventDate: string;
  note: string;
  isYearly: boolean;
};

const initialFormValue: FormValue = {
  title: "",
  eventDate: "",
  note: "",
  isYearly: true,
};

export function AnniversaryEditorModal({
  submitting,
  error,
  onSubmit,
  onClose,
}: AnniversaryEditorModalProps) {
  const [form, setForm] = useState<FormValue>(initialFormValue);

  const canSubmit = useMemo(() => {
    return form.title.trim().length > 0 && form.eventDate.length > 0;
  }, [form.eventDate, form.title]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-2 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[560px] rounded-t-3xl border border-[#f0e2dc] bg-[#fffaf7] shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between px-5 pb-3 pt-6 sm:px-8 sm:pt-8">
          <div>
            <h3 className="font-brand text-3xl font-black tracking-tight text-[#181311] sm:text-4xl">
              新建纪念日
            </h3>
            <p className="mt-1 text-sm font-medium text-[#896b61]">记录重要时刻与倒计时</p>
          </div>

          <button
            type="button"
            className="text-2xl text-[#896b61] transition hover:text-[#181311]"
            onClick={onClose}
            disabled={submitting}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="grid gap-4 px-5 pb-2 sm:gap-5 sm:px-8">
          <label className="grid gap-2" htmlFor="anniversary-title">
            <span className="text-sm font-semibold text-[#181311]">标题</span>
            <input
              id="anniversary-title"
              type="text"
              value={form.title}
              maxLength={ANNIVERSARY_TITLE_MAX_LENGTH}
              placeholder="例如：恋爱纪念日"
              className="h-12 rounded-xl border border-[#ead9d2] bg-white px-4 text-base text-[#181311] outline-none transition focus:border-[#f06e42] focus:ring-2 focus:ring-[#f06e42]/20"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  title: event.target.value,
                }))
              }
            />
          </label>

          <label className="grid gap-2" htmlFor="anniversary-date">
            <span className="text-sm font-semibold text-[#181311]">日期</span>
            <input
              id="anniversary-date"
              type="date"
              value={form.eventDate}
              className="h-12 rounded-xl border border-[#ead9d2] bg-white px-4 text-base text-[#181311] outline-none transition focus:border-[#f06e42] focus:ring-2 focus:ring-[#f06e42]/20"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  eventDate: event.target.value,
                }))
              }
            />
          </label>

          <label className="grid gap-2" htmlFor="anniversary-note">
            <span className="text-sm font-semibold text-[#181311]">备注</span>
            <textarea
              id="anniversary-note"
              value={form.note}
              maxLength={ANNIVERSARY_NOTE_MAX_LENGTH}
              placeholder="例如：一起吃蛋糕，一起看电影"
              className="min-h-[112px] resize-none rounded-2xl border border-[#ead9d2] bg-white p-4 text-sm text-[#181311] outline-none transition focus:border-[#f06e42] focus:ring-2 focus:ring-[#f06e42]/20"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  note: event.target.value,
                }))
              }
            />
          </label>

          <label className="inline-flex items-center gap-3 text-sm font-semibold text-[#5f4a43]">
            <input
              type="checkbox"
              checked={form.isYearly}
              className="size-4 rounded border-[#d8c5bd] text-[#f06e42] focus:ring-[#f06e42]/30"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  isYearly: event.target.checked,
                }))
              }
            />
            每年重复
          </label>

          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#f0e2dc] bg-white/60 px-5 py-4 sm:px-8 sm:py-5">
          <button
            type="button"
            className="rounded-full border border-[#ead9d2] px-5 py-2 text-sm font-semibold text-[#896b61] transition hover:bg-[#fff0eb] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClose}
            disabled={submitting}
          >
            取消
          </button>

          <button
            type="button"
            className="rounded-full bg-[#f06e42] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#f06e42]/25 transition hover:-translate-y-0.5 hover:bg-[#de6037] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canSubmit || submitting}
            onClick={() =>
              onSubmit({
                title: form.title,
                eventDate: form.eventDate,
                note: form.note,
                isYearly: form.isYearly,
              })
            }
          >
            {submitting ? "创建中..." : "创建纪念日"}
          </button>
        </div>
      </div>
    </div>
  );
}
