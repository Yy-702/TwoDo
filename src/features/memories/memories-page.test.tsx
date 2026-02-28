import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoriesPage } from "@/features/memories/memories-page";
import type { SpacePhoto } from "@/features/photos/photo";

const {
  replaceMock,
  pushMock,
  getUserMock,
  signOutMock,
  rpcMock,
  profileMaybeSingleMock,
  spacesOrderMock,
  loadRecentSpacePhotosMock,
  uploadSpacePhotoWithRecordMock,
  deleteSpacePhotoWithRecordMock,
  getPhotoDeletePermissionMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  pushMock: vi.fn(),
  getUserMock: vi.fn(),
  signOutMock: vi.fn(),
  rpcMock: vi.fn(),
  profileMaybeSingleMock: vi.fn(),
  spacesOrderMock: vi.fn(),
  loadRecentSpacePhotosMock: vi.fn(),
  uploadSpacePhotoWithRecordMock: vi.fn(),
  deleteSpacePhotoWithRecordMock: vi.fn(),
  getPhotoDeletePermissionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: pushMock,
  }),
}));

vi.mock("@/features/photos/photo", async () => {
  const actual = await vi.importActual<typeof import("@/features/photos/photo")>(
    "@/features/photos/photo"
  );

  return {
    ...actual,
    loadRecentSpacePhotos: loadRecentSpacePhotosMock,
    uploadSpacePhotoWithRecord: uploadSpacePhotoWithRecordMock,
    deleteSpacePhotoWithRecord: deleteSpacePhotoWithRecordMock,
    getPhotoDeletePermission: getPhotoDeletePermissionMock,
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

function createPhoto(overrides?: Partial<SpacePhoto>): SpacePhoto {
  return {
    id: "photo-1",
    spaceId: "space-1",
    uploadedBy: "user-1",
    objectPath: "space-1/user-1/photo-1.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    caption: "春日散步",
    createdAt: "2024-04-02T00:00:00.000Z",
    publicUrl: "https://example.com/photo-1.jpg",
    ...overrides,
  };
}

beforeEach(() => {
  replaceMock.mockReset();
  pushMock.mockReset();

  getUserMock.mockReset();
  signOutMock.mockReset();
  rpcMock.mockReset();
  profileMaybeSingleMock.mockReset();
  spacesOrderMock.mockReset();

  loadRecentSpacePhotosMock.mockReset();
  uploadSpacePhotoWithRecordMock.mockReset();
  deleteSpacePhotoWithRecordMock.mockReset();
  getPhotoDeletePermissionMock.mockReset();

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

  loadRecentSpacePhotosMock.mockResolvedValue([
    createPhoto(),
    createPhoto({
      id: "photo-2",
      caption: null,
      createdAt: "2023-08-12T00:00:00.000Z",
      objectPath: "space-1/user-1/photo-2.jpg",
      publicUrl: "https://example.com/photo-2.jpg",
    }),
  ]);

  uploadSpacePhotoWithRecordMock.mockResolvedValue({ ok: true });
  deleteSpacePhotoWithRecordMock.mockResolvedValue({ ok: true });
  getPhotoDeletePermissionMock.mockReturnValue("uploader");

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

describe("MemoriesPage", () => {
  it("未登录时跳转到登录页", async () => {
    getUserMock.mockResolvedValueOnce({
      data: {
        user: null,
      },
      error: null,
    });

    render(<MemoriesPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
  });

  it("支持年份筛选、分类占位禁用、标题回退默认文案", async () => {
    const user = userEvent.setup();

    render(<MemoriesPage />);

    await screen.findByText("春日散步");
    await screen.findByText("我们的瞬间");
    expect(screen.getByTestId("app-mobile-nav")).toBeInTheDocument();

    const inviteLinks = screen.getAllByRole("link", { name: "邀请伙伴" });
    expect(inviteLinks.some((link) => link.getAttribute("href") === "/app/invite")).toBe(true);

    const memoryLinks = screen.getAllByRole("link", { name: "回忆墙" });
    expect(memoryLinks.some((link) => link.getAttribute("href") === "/app/memories")).toBe(true);

    const anniversaryLinks = screen.getAllByRole("link", { name: "纪念日" });
    expect(
      anniversaryLinks.some((link) => link.getAttribute("href") === "/app/anniversaries")
    ).toBe(true);

    const disabledCategoryButton = screen.getByRole("button", {
      name: "✈ 旅行（即将支持）",
    });
    expect(disabledCategoryButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "2024年" }));

    await waitFor(() => {
      expect(screen.queryByText("我们的瞬间")).not.toBeInTheDocument();
    });
    expect(screen.getByText("春日散步")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "全部" }));

    await waitFor(() => {
      expect(screen.getByText("我们的瞬间")).toBeInTheDocument();
    });
  });
});
