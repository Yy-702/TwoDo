import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "@/components/layout/app-shell";

describe("AppShell", () => {
  it("移动端壳层使用 dvh 高度，避免 h-screen 在手机浏览器抖动", () => {
    const { container } = render(
      <AppShell title="标题" subtitle="副标题" activeNav="dashboard">
        <div>content</div>
      </AppShell>
    );

    const root = container.firstElementChild;
    expect(root).not.toBeNull();
    const className = root?.className ?? "";
    const tokens = className.split(/\s+/).filter(Boolean);
    expect(tokens).toContain("min-h-dvh");
    expect(tokens).not.toContain("h-screen");
  });

  it("提供回忆墙入口与记录新回忆跳转", () => {
    render(
      <AppShell title="标题" subtitle="副标题" activeNav="memories">
        <div>content</div>
      </AppShell>
    );

    const ctaLink = screen.getByRole("link", { name: "＋ 记录新回忆" });
    expect(ctaLink).toHaveAttribute("href", "/app/memories");

    const memoryNavLinks = screen.getAllByRole("link", { name: "回忆墙" });
    expect(memoryNavLinks.length).toBeGreaterThan(0);
    for (const navLink of memoryNavLinks) {
      expect(navLink).toHaveAttribute("href", "/app/memories");
    }
  });

  it("顶栏渲染统一导航入口", () => {
    render(
      <AppShell title="标题" subtitle="副标题" activeNav="dashboard">
        <div>content</div>
      </AppShell>
    );

    expect(screen.getByTestId("app-mobile-nav")).toBeInTheDocument();

    const dashboardLinks = screen.getAllByRole("link", { name: "控制面板" });
    expect(dashboardLinks.some((link) => link.getAttribute("href") === "/app")).toBe(true);

    expect(screen.queryByRole("link", { name: "任务清单" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "邀请伙伴" })).not.toBeInTheDocument();

    const challengeLinks = screen.getAllByRole("link", { name: "双人挑战" });
    expect(
      challengeLinks.some((link) => link.getAttribute("href") === "/app/challenges")
    ).toBe(true);

    const anniversaryLinks = screen.getAllByRole("link", { name: "纪念日" });
    expect(
      anniversaryLinks.some((link) => link.getAttribute("href") === "/app/anniversaries")
    ).toBe(true);
  });
});
