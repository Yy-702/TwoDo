import { describe, expect, it, vi } from "vitest";
import {
  AVATAR_MAX_BYTES,
  buildAvatarPath,
  uploadAvatarWithProfileUpdate,
  validateAvatarFile,
} from "@/features/profile/avatar";

function createSupabaseMock(options?: {
  uploadError?: { message: string } | null;
  profileError?: { message: string } | null;
}) {
  const upload = vi.fn().mockResolvedValue({ error: options?.uploadError ?? null });
  const remove = vi.fn().mockResolvedValue({ error: null });
  const getPublicUrl = vi.fn().mockReturnValue({
    data: { publicUrl: "https://example.com/avatar.png" },
  });
  const upsert = vi.fn().mockResolvedValue({ error: options?.profileError ?? null });

  const supabase = {
    storage: {
      from: vi.fn(() => ({
        upload,
        remove,
        getPublicUrl,
      })),
    },
    from: vi.fn(() => ({
      upsert,
    })),
  };

  return {
    supabase:
      supabase as unknown as Parameters<typeof uploadAvatarWithProfileUpdate>[0]["supabase"],
    upload,
    remove,
    upsert,
  };
}

describe("avatar", () => {
  it("Avatar_FileValidation_InvalidMime_Rejected", () => {
    const result = validateAvatarFile({
      type: "image/gif",
      size: 100,
    } as File);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.code).toBe("invalid_type");
  });

  it("Avatar_FileValidation_TooLarge_Rejected", () => {
    const result = validateAvatarFile({
      type: "image/png",
      size: AVATAR_MAX_BYTES + 1,
    } as File);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.code).toBe("too_large");
  });

  it("Avatar_PathBuilder_OwnFolderOnly", () => {
    const path = buildAvatarPath(
      "user-1",
      { type: "image/png", name: "avatar.png" } as File,
      1700000000000,
      0.123456
    );

    expect(path.startsWith("user-1/")).toBe(true);
    expect(path.endsWith(".png")).toBe(true);
  });

  it("Avatar_Upload_Success_ProfileUpdated", async () => {
    const { supabase, upsert, remove } = createSupabaseMock();

    const result = await uploadAvatarWithProfileUpdate({
      supabase,
      userId: "user-1",
      file: { type: "image/png", size: 1024, name: "avatar.png" } as File,
      previousAvatarPath: "user-1/old-avatar.png",
    });

    expect(result.ok).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);

    const upsertPayload = upsert.mock.calls[0]?.[0] as {
      id: string;
      avatar_path: string;
    };

    expect(upsertPayload.id).toBe("user-1");
    expect(upsertPayload.avatar_path.startsWith("user-1/")).toBe(true);
    expect(remove).toHaveBeenCalledWith(["user-1/old-avatar.png"]);
  });

  it("Avatar_Upload_ProfileUpdateFail_RollbackBestEffort", async () => {
    const { supabase, remove } = createSupabaseMock({
      profileError: { message: "db down" },
    });

    const result = await uploadAvatarWithProfileUpdate({
      supabase,
      userId: "user-1",
      file: { type: "image/png", size: 1024, name: "avatar.png" } as File,
      previousAvatarPath: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.code).toBe("profile_update_failed");
    expect(remove).toHaveBeenCalledTimes(1);

    const rollbackPath = (remove.mock.calls[0]?.[0] as string[])[0];
    expect(rollbackPath.startsWith("user-1/")).toBe(true);
  });
});
