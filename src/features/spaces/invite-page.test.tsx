import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvitePage } from "@/features/spaces/invite-page";

const { replaceMock, getUserMock, signOutMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  getUserMock: vi.fn(),
  signOutMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: getUserMock,
      signOut: signOutMock,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn(),
        }),
      }),
    }),
    rpc: vi.fn(),
  }),
}));

describe("InvitePage", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    getUserMock.mockReset();
    signOutMock.mockReset();

    getUserMock.mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    });
  });

  it("移动端显示底部导航", async () => {
    render(<InvitePage />);

    expect(screen.getByTestId("app-mobile-nav")).toBeInTheDocument();

    const inviteLinks = screen.getAllByRole("link", { name: "邀请伙伴" });
    expect(inviteLinks.some((link) => link.getAttribute("href") === "/app/invite")).toBe(true);

    const anniversaryLinks = screen.getAllByRole("link", { name: "纪念日" });
    expect(
      anniversaryLinks.some((link) => link.getAttribute("href") === "/app/anniversaries")
    ).toBe(true);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
  });
});
