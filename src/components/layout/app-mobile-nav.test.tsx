import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppMobileNav } from "@/components/layout/app-mobile-nav";

describe("AppMobileNav", () => {
  it("渲染 4 个移动端导航入口并提供正确链接", () => {
    render(<AppMobileNav activeNav="memories" />);

    expect(screen.getByRole("link", { name: "控制面板" })).toHaveAttribute("href", "/app");
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
    expect(screen.queryByRole("link", { name: "任务清单" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "邀请伙伴" })).not.toBeInTheDocument();
  });

  it("当前页面入口有 active 标记", () => {
    render(<AppMobileNav activeNav="anniversaries" />);

    const activeLink = screen.getByRole("link", { name: "纪念日" });
    const inactiveLink = screen.getByRole("link", { name: "回忆墙" });
    const activeText = screen.getByText("纪念");
    const inactiveText = screen.getByText("回忆");

    expect(activeLink).toHaveAttribute("aria-current", "page");
    expect(inactiveLink).not.toHaveAttribute("aria-current");

    expect(activeLink).toHaveClass("ring-1");
    expect(activeLink).toHaveClass("ring-primary/30");

    expect(inactiveLink).toHaveClass("hover:bg-white");
    expect(activeText).toHaveClass("whitespace-nowrap");
    expect(inactiveText).toHaveClass("whitespace-nowrap");
  });
});
