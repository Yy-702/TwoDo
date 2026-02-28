import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppMobileNav } from "@/components/layout/app-mobile-nav";

describe("AppMobileNav", () => {
  it("渲染 6 个移动端导航入口并提供正确链接", () => {
    render(<AppMobileNav activeNav="memories" />);

    expect(screen.getByRole("link", { name: "控制面板" })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("link", { name: "任务清单" })).toHaveAttribute(
      "href",
      "/app#todo-board"
    );
    expect(screen.getByRole("link", { name: "邀请伙伴" })).toHaveAttribute(
      "href",
      "/app/invite"
    );
    expect(screen.getByRole("link", { name: "双人挑战" })).toHaveAttribute(
      "href",
      "/app/challenges"
    );
    expect(screen.getByRole("link", { name: "回忆墙" })).toHaveAttribute(
      "href",
      "/app/memories"
    );
    expect(screen.getByRole("link", { name: "纪念日" })).toHaveAttribute(
      "href",
      "/app/anniversaries"
    );
  });

  it("当前页面入口有 active 标记", () => {
    render(<AppMobileNav activeNav="anniversaries" />);

    expect(screen.getByRole("link", { name: "纪念日" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "回忆墙" })).not.toHaveAttribute("aria-current");
  });
});
