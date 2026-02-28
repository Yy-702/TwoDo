import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppTopbar } from "@/components/layout/app-topbar";

describe("AppTopbar", () => {
  it("渲染统一导航并正确标记激活态", () => {
    render(<AppTopbar activeNav="invite" title="标题" subtitle="副标题" />);

    expect(screen.getByRole("link", { name: "控制面板" })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("link", { name: "任务清单" })).toHaveAttribute(
      "href",
      "/app#todo-board"
    );
    expect(screen.getByRole("link", { name: "邀请伙伴" })).toHaveAttribute(
      "href",
      "/app/invite"
    );
    expect(screen.getByRole("link", { name: "回忆墙" })).toHaveAttribute(
      "href",
      "/app/memories"
    );
    expect(screen.getByRole("link", { name: "双人挑战" })).toHaveAttribute(
      "href",
      "/app/challenges"
    );
    expect(screen.getByRole("link", { name: "纪念日" })).toHaveAttribute(
      "href",
      "/app/anniversaries"
    );

    expect(screen.getByRole("link", { name: "邀请伙伴" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "控制面板" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("支持右侧扩展操作和退出按钮", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();

    render(
      <AppTopbar
        activeNav="dashboard"
        currentUserDisplayName="测试用户"
        onSignOut={onSignOut}
        rightActions={<button type="button">自定义操作</button>}
      />
    );

    expect(screen.getByRole("button", { name: "自定义操作" })).toBeInTheDocument();
    expect(screen.getByLabelText("用户头像")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "退出" }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
