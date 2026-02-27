"use client";

import type { Space } from "@/features/spaces/types";

type SpaceSwitcherProps = {
  spaces: Space[];
  currentSpaceId: string | null;
  onChange: (spaceId: string) => void;
};

function labelForSpace(space: Space) {
  if (space.type === "personal") {
    return `${space.name}（个人）`;
  }

  return `${space.name}（共享）`;
}

export function SpaceSwitcher({
  spaces,
  currentSpaceId,
  onChange,
}: SpaceSwitcherProps) {
  if (spaces.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-5 text-center text-sm text-slate-500">
        暂无空间，请先创建。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-display text-sm font-bold text-slate-600">空间切换</p>
      <div className="flex flex-wrap gap-2">
        {spaces.map((space) => {
          const active = space.id === currentSpaceId;
          return (
            <button
              key={space.id}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "bg-white text-slate-600 hover:bg-primary-soft"
              }`}
              onClick={() => onChange(space.id)}
            >
              {labelForSpace(space)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
