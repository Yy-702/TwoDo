"use client";

import { useEffect, useMemo, useState } from "react";
import type { TodoEditorValue } from "@/features/todos/types";

type MemberOption = {
  userId: string;
  label: string;
};

type TodoEditorModalProps = {
  mode: "create" | "edit";
  initialValue: TodoEditorValue;
  members: MemberOption[];
  onSubmit: (value: TodoEditorValue) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
};

export function TodoEditorModal({
  mode,
  initialValue,
  members,
  onSubmit,
  onDelete,
  onClose,
}: TodoEditorModalProps) {
  const [form, setForm] = useState<TodoEditorValue>(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialValue);
    setError(null);
  }, [initialValue]);

  const canSubmit = useMemo(() => {
    if (form.title.trim().length === 0) {
      return false;
    }

    if (form.assigneeMode === "single" && !form.assigneeUserId) {
      return false;
    }

    return true;
  }, [form]);

  const headerTitle = mode === "create" ? "Create Task" : "Edit Task";
  const pickedMembers = members.slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[520px] overflow-hidden rounded-3xl border border-[#e5e5e0] bg-white shadow-2xl">
        <div className="flex items-start justify-between px-8 pb-4 pt-8">
          <div>
            <h3 className="text-4xl font-black tracking-tight text-slate-900 font-brand">{headerTitle}</h3>
            <p className="mt-1 text-sm text-slate-500">Make plans together ✨</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl text-slate-400 transition-colors hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="grid gap-5 px-8 py-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-800">Task Name</span>
            <div className="flex items-center rounded-xl border border-transparent bg-[#f8f8f6] p-1 focus-within:border-[#e8e830] focus-within:ring-2 focus-within:ring-[#e8e830]/40">
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="What needs to be done?"
                className="h-11 flex-1 border-none bg-transparent px-4 text-base font-medium text-slate-800 outline-none"
              />
              <span className="mr-1 flex size-10 items-center justify-center rounded-lg bg-[#e8e830]/20 text-xl text-[#9d9d17]">
                ✎
              </span>
            </div>
          </label>

          <div className="grid gap-2">
            <span className="text-sm font-semibold text-slate-800">Assign To</span>
            <div className="grid grid-cols-3 gap-1 rounded-full bg-[#f8f8f6] p-1.5">
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    assigneeMode: "both",
                    assigneeUserId: null,
                  }))
                }
                className={`h-10 rounded-full text-sm font-semibold transition ${
                  form.assigneeMode === "both"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                👥 Both
              </button>

              {pickedMembers.map((member) => {
                const active =
                  form.assigneeMode === "single" && form.assigneeUserId === member.userId;

                return (
                  <button
                    key={member.userId}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        assigneeMode: "single",
                        assigneeUserId: member.userId,
                      }))
                    }
                    className={`h-10 rounded-full text-sm font-semibold transition ${
                      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    {member.label === "我" ? "🙂 Him" : "🙋 Her"}
                  </button>
                );
              })}

              {pickedMembers.length < 2 ? (
                <span className="h-10 rounded-full" />
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-800">Due Date</span>
              <div className="flex items-center rounded-xl bg-[#f8f8f6] p-1">
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, dueDate: event.target.value }))
                  }
                  className="h-11 flex-1 border-none bg-transparent px-4 text-base font-medium text-slate-800 outline-none"
                />
                <span className="mr-2 text-slate-400">🗓</span>
              </div>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-800">Time</span>
              <div className="flex items-center rounded-xl bg-[#f8f8f6] p-1">
                <input
                  type="time"
                  value={form.dueTime}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, dueTime: event.target.value }))
                  }
                  className="h-11 flex-1 border-none bg-transparent px-4 text-base font-medium text-slate-800 outline-none"
                />
                <span className="mr-2 text-slate-400">🕒</span>
              </div>
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-800">Leave a note</span>
            <div className="relative">
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Add a sweet message or details..."
                className="min-h-[100px] w-full resize-none rounded-3xl border-none bg-[#f8f8f6] p-4 text-sm text-slate-700 outline-none"
              />
              <div className="absolute bottom-3 right-3 flex gap-2 text-slate-400">
                <span>🎤</span>
                <span>🖼</span>
              </div>
            </div>
          </label>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-100 px-8 pb-8 pt-6">
          <button
            type="button"
            className="relative flex size-14 items-center justify-center rounded-2xl bg-[#fff8e1] text-xl text-[#ffb74d] shadow-sm"
            title="Nudge TA"
            disabled
          >
            🔔
          </button>

          <div className="flex flex-1 items-center justify-end gap-3">
            {mode === "edit" ? (
              <button
                type="button"
                className="px-6 py-3 text-base font-semibold text-slate-500 transition-colors hover:text-rose-600"
                onClick={async () => {
                  if (!onDelete) {
                    return;
                  }

                  setSaving(true);
                  setError(null);
                  try {
                    await onDelete();
                  } catch {
                    setError("删除失败，请稍后重试");
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
              >
                Delete
              </button>
            ) : null}

            <button
              type="button"
              className="flex items-center gap-2 rounded-full bg-[#e8e830] px-8 py-3 font-bold text-[#4d4d10] shadow-lg shadow-[#e8e830]/30 transition-all hover:bg-[#eaea45] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSubmit || saving}
              onClick={async () => {
                setSaving(true);
                setError(null);
                try {
                  await onSubmit(form);
                } catch {
                  setError("保存失败，请稍后重试");
                } finally {
                  setSaving(false);
                }
              }}
            >
              ✓ {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
