"use client";

import dayjs from "dayjs";
import type { Todo } from "@/features/todos/types";

type TodoListProps = {
  todos: Todo[];
  onToggleComplete: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
};

const NOTE_STYLES = [
  {
    wrap: "bg-accent-pink/70",
    badge: "bg-white/60 text-pink-700",
    border: "border-pink-200",
    pinColor: "#f87171",
    rotate: "rotate-[-1deg]",
  },
  {
    wrap: "bg-[#fef9c3]/70",
    badge: "bg-white/60 text-yellow-700",
    border: "border-yellow-200",
    pinColor: "#facc15",
    rotate: "rotate-[1deg]",
  },
  {
    wrap: "bg-accent-blue/70",
    badge: "bg-white/60 text-blue-700",
    border: "border-blue-200",
    pinColor: "#60a5fa",
    rotate: "rotate-[-2deg]",
  },
] as const;

function priorityText(priority: Todo["priority"]) {
  switch (priority) {
    case "high":
      return "高优先级";
    case "low":
      return "低优先级";
    default:
      return "中优先级";
  }
}

function dueAtLabel(dueAt: string | null) {
  if (!dueAt) {
    return "未设置截止时间";
  }

  return dayjs(dueAt).format("MM月DD日 HH:mm");
}

export function TodoList({
  todos,
  onToggleComplete,
  onEdit,
  onDelete,
}: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center text-sm text-slate-500">
        当前空间还没有任务，点击上方“新建任务”开始吧。
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {todos.map((todo, index) => {
        const palette = NOTE_STYLES[index % NOTE_STYLES.length];

        return (
          <article
            key={todo.id}
            className={`group relative rounded-xl p-6 shadow-md transition-transform duration-300 hover:rotate-0 ${palette.wrap} ${palette.rotate}`}
          >
            <span className="pin-top" style={{ backgroundColor: palette.pinColor }} />

            <div className="mb-4 flex items-start justify-between gap-3">
              <span
                className={`rounded-lg px-2 py-1 text-xs font-bold ${palette.badge}`}
              >
                {priorityText(todo.priority)}
              </span>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-700"
                onClick={() => onEdit(todo)}
              >
                ⋯
              </button>
            </div>

            <h4
              className={`font-display text-2xl font-bold text-slate-800 ${
                todo.is_completed ? "line-through opacity-50" : ""
              }`}
            >
              {todo.title}
            </h4>

            {todo.description ? (
              <p
                className={`mt-3 text-sm leading-6 text-slate-700 ${
                  todo.is_completed ? "opacity-60" : ""
                }`}
              >
                {todo.description}
              </p>
            ) : null}

            <div className={`mt-5 border-t pt-3 text-xs font-semibold ${palette.border}`}>
              <p className="text-slate-700">截止：{dueAtLabel(todo.due_at)}</p>
              <p className="mt-1 text-slate-700">
                执行人：{todo.assignee_user_id ? "单人" : "双方"}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleComplete(todo)}
                className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white"
              >
                {todo.is_completed ? "取消完成" : "点这里完成"}
              </button>
              <button
                type="button"
                onClick={() => onDelete(todo)}
                className="rounded-full bg-white/45 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-white"
              >
                删除
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
