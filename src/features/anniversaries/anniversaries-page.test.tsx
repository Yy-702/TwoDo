import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnniversariesPage } from "@/features/anniversaries/anniversaries-page";
import type { Anniversary } from "@/features/anniversaries/anniversary";

const {
  replaceMock,
  routerMock,
  getUserMock,
  signOutMock,
  rpcMock,
  profileMaybeSingleMock,
  spacesOrderMock,
  loadSpaceAnniversariesMock,
  createAnniversaryRecordMock,
  deleteAnniversaryRecordMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  routerMock: {
    replace: vi.fn(),
  },
  getUserMock: vi.fn(),
  signOutMock: vi.fn(),
  rpcMock: vi.fn(),
  profileMaybeSingleMock: vi.fn(),
  spacesOrderMock: vi.fn(),
  loadSpaceAnniversariesMock: vi.fn(),
  createAnniversaryRecordMock: vi.fn(),
  deleteAnniversaryRecordMock: vi.fn(),
}));

routerMock.replace = replaceMock;

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/features/anniversaries/anniversary", async () => {
  const actual = await vi.importActual<typeof import("@/features/anniversaries/anniversary")>(
    "@/features/anniversaries/anniversary"
  );

  return {
    ...actual,
    loadSpaceAnniversaries: loadSpaceAnniversariesMock,
    createAnniversaryRecord: createAnniversaryRecordMock,
    deleteAnniversaryRecord: deleteAnniversaryRecordMock,
  };
});

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: getUserMock,
      signOut: signOutMock,
    },
    rpc: rpcMock,
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: profileMaybeSingleMock,
            }),
          }),
        };
      }

      if (table === "spaces") {
        return {
          select: () => ({
            order: spacesOrderMock,
          }),
        };
      }

      return {
        select: () => ({
          order: spacesOrderMock,
        }),
      };
    },
    storage: {
      from: () => ({
        getPublicUrl: () => ({
          data: {
            publicUrl: "https://example.com/avatar.png",
          },
        }),
      }),
    },
  }),
}));

function createAnniversary(overrides?: Partial<Anniversary>): Anniversary {
  return {
    id: "anniversary-1",
    spaceId: "space-1",
    title: "恋爱纪念日",
    eventDate: "2024-10-01",
    note: "一起吃蛋糕",
    isYearly: true,
    createdBy: "user-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  replaceMock.mockReset();
  getUserMock.mockReset();
  signOutMock.mockReset();
  rpcMock.mockReset();
  profileMaybeSingleMock.mockReset();
  spacesOrderMock.mockReset();
  loadSpaceAnniversariesMock.mockReset();
  createAnniversaryRecordMock.mockReset();
  deleteAnniversaryRecordMock.mockReset();

  getUserMock.mockResolvedValue({
    data: {
      user: {
        id: "user-1",
      },
    },
    error: null,
  });

  profileMaybeSingleMock.mockResolvedValue({
    data: {
      display_name: "测试用户",
      avatar_path: null,
    },
    error: null,
  });

  rpcMock.mockResolvedValue({
    error: null,
  });

  spacesOrderMock.mockResolvedValue({
    data: [
      {
        id: "space-1",
        name: "我们的空间",
        type: "personal",
        owner_user_id: "user-1",
        invite_code: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    error: null,
  });

  loadSpaceAnniversariesMock.mockResolvedValue([
    createAnniversary(),
    createAnniversary({
      id: "anniversary-2",
      title: "旅行纪念日",
      eventDate: "2023-07-08",
      isYearly: false,
      note: null,
    }),
  ]);

  createAnniversaryRecordMock.mockResolvedValue({
    ok: true,
    anniversary: createAnniversary({
      id: "anniversary-3",
      title: "第一次约会",
      eventDate: "2025-08-18",
      isYearly: true,
      note: "看电影",
    }),
  });

  deleteAnniversaryRecordMock.mockResolvedValue({
    ok: true,
  });

  vi.spyOn(window, "confirm").mockReturnValue(true);

  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    } as Storage,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AnniversariesPage", () => {
  it("未登录时跳转到登录页", async () => {
    getUserMock.mockResolvedValueOnce({
      data: {
        user: null,
      },
      error: null,
    });

    render(<AnniversariesPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
  });

  it("加载后展示主卡、列表和时间线模块", async () => {
    render(<AnniversariesPage />);

    const pageHeadings = await screen.findAllByRole("heading", { name: "纪念日与倒计时" });
    expect(pageHeadings.length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.queryByText("正在加载纪念日...")).not.toBeInTheDocument();
    });

    expect(await screen.findByRole("heading", { name: "纪念日列表" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "回忆时间线" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "纪念日" })).toHaveAttribute(
      "href",
      "/app/anniversaries"
    );
    expect(screen.getAllByText("恋爱纪念日").length).toBeGreaterThan(0);
  });

  it("创建弹窗在必填缺失时禁用提交，填写后可创建", async () => {
    const user = userEvent.setup();
    const newAnniversary = createAnniversary({
      id: "anniversary-3",
      title: "第一次约会",
      eventDate: "2025-08-18",
      note: "看电影",
      isYearly: true,
    });
    let created = false;

    loadSpaceAnniversariesMock.mockImplementation(async () => {
      if (created) {
        return [createAnniversary(), newAnniversary];
      }
      return [createAnniversary()];
    });

    createAnniversaryRecordMock.mockImplementation(async () => {
      created = true;
      return {
        ok: true,
        anniversary: newAnniversary,
      };
    });

    render(<AnniversariesPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "新建纪念日" })).not.toBeDisabled();
    });
    await screen.findByRole("button", { name: "删除-恋爱纪念日" });

    const openModalButton = screen.getByRole("button", { name: "新建纪念日" });
    await user.click(openModalButton);

    await screen.findByRole("dialog");
    const submitButton = screen.getByRole("button", { name: "创建纪念日" });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText("标题"), "第一次约会");
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText("日期"), "2025-08-18");
    expect(submitButton).not.toBeDisabled();

    await user.type(screen.getByLabelText("备注"), "看电影");
    await user.click(submitButton);

    await waitFor(() => {
      expect(createAnniversaryRecordMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getAllByText("第一次约会").length).toBeGreaterThan(0);
    });
  });

  it("删除纪念日成功后刷新列表", async () => {
    const user = userEvent.setup();
    let deleted = false;

    loadSpaceAnniversariesMock.mockImplementation(async () => {
      if (deleted) {
        return [];
      }
      return [createAnniversary()];
    });

    deleteAnniversaryRecordMock.mockImplementation(async () => {
      deleted = true;
      return { ok: true };
    });

    render(<AnniversariesPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "新建纪念日" })).not.toBeDisabled();
    });
    const deleteButton = await screen.findByRole("button", { name: "删除-恋爱纪念日" });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(deleteAnniversaryRecordMock).toHaveBeenCalledWith(
        expect.objectContaining({
          anniversaryId: "anniversary-1",
        })
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "删除-恋爱纪念日" })).not.toBeInTheDocument();
    });
  });

  it("删除失败时展示错误提示", async () => {
    const user = userEvent.setup();
    loadSpaceAnniversariesMock.mockResolvedValue([createAnniversary()]);
    deleteAnniversaryRecordMock.mockResolvedValue({
      ok: false,
      code: "delete_failed",
      message: "删除失败，请稍后重试",
    });

    render(<AnniversariesPage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "新建纪念日" })).not.toBeDisabled();
    });
    const deleteButton = await screen.findByRole("button", { name: "删除-恋爱纪念日" });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("删除失败，请稍后重试")).toBeInTheDocument();
    });
  });
});
