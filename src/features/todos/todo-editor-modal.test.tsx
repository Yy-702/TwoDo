import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TodoEditorModal } from "@/features/todos/todo-editor-modal";
import type { TodoEditorValue } from "@/features/todos/types";

const initialValue: TodoEditorValue = {
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
  dueTime: "",
  assigneeMode: "both",
  assigneeUserId: null,
};

describe("TodoEditorModal", () => {
  it("移动端弹窗内容区域提供最大高度和内部滚动", () => {
    render(
      <TodoEditorModal
        mode="create"
        initialValue={initialValue}
        members={[]}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-h-[90dvh]");
    expect(dialog.className).toContain("overflow-y-auto");
  });
});
