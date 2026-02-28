import { describe, expect, it, vi } from "vitest";
import {
  SPACE_PHOTO_CAPTION_MAX_LENGTH,
  SPACE_PHOTO_MAX_BYTES,
  buildSpacePhotoPath,
  deleteSpacePhotoWithRecord,
  getPhotoDeletePermission,
  loadRecentSpacePhotos,
  uploadSpacePhotoWithRecord,
  validatePhotoFile,
} from "@/features/photos/photo";

function createStorageFromMock(options?: {
  uploadError?: { message: string } | null;
  removeError?: { message: string } | null;
}) {
  const upload = vi.fn().mockResolvedValue({ error: options?.uploadError ?? null });
  const remove = vi.fn().mockResolvedValue({ error: options?.removeError ?? null });
  const getPublicUrl = vi.fn((path: string) => ({
    data: { publicUrl: `https://example.com/${path}` },
  }));

  return {
    upload,
    remove,
    getPublicUrl,
  };
}

describe("photo", () => {
  it("Photo_FileValidation_InvalidMime_Rejected", () => {
    const result = validatePhotoFile({ type: "image/gif", size: 100 } as File);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.code).toBe("invalid_type");
  });

  it("Photo_FileValidation_TooLarge_Rejected", () => {
    const result = validatePhotoFile({
      type: "image/png",
      size: SPACE_PHOTO_MAX_BYTES + 1,
    } as File);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.code).toBe("too_large");
  });

  it("Photo_PathBuilder_SpaceAndUserFolder", () => {
    const path = buildSpacePhotoPath(
      "space-1",
      "user-1",
      { type: "image/png", name: "photo.png" } as File,
      1700000000000,
      0.1234
    );

    expect(path.startsWith("space-1/user-1/")).toBe(true);
    expect(path.endsWith(".png")).toBe(true);
  });

  it("Photo_Upload_InsertFail_RollbackStorage", async () => {
    const storageFrom = createStorageFromMock();
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "db failed" },
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));

    const supabase = {
      storage: {
        from: vi.fn(() => storageFrom),
      },
      from: vi.fn(() => ({ insert })),
    } as unknown as Parameters<typeof uploadSpacePhotoWithRecord>[0]["supabase"];

    const result = await uploadSpacePhotoWithRecord({
      supabase,
      spaceId: "space-1",
      userId: "user-1",
      file: {
        type: "image/png",
        size: 1024,
        name: "photo.png",
      } as File,
    });

    expect(result.ok).toBe(false);
    expect(storageFrom.remove).toHaveBeenCalledTimes(1);

    const removedPath = (storageFrom.remove.mock.calls[0]?.[0] as string[])[0];
    expect(removedPath.startsWith("space-1/user-1/")).toBe(true);
  });

  it("Photo_Upload_Caption_TrimmedAndSaved", async () => {
    const storageFrom = createStorageFromMock();
    const insertedRow = {
      id: "p1",
      space_id: "space-1",
      uploaded_by: "user-1",
      object_path: "space-1/user-1/a.jpg",
      mime_type: "image/jpeg",
      size_bytes: 123,
      caption: "海边散步",
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const single = vi.fn().mockResolvedValue({
      data: insertedRow,
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));

    const supabase = {
      storage: {
        from: vi.fn(() => storageFrom),
      },
      from: vi.fn(() => ({ insert })),
    } as unknown as Parameters<typeof uploadSpacePhotoWithRecord>[0]["supabase"];

    const result = await uploadSpacePhotoWithRecord({
      supabase,
      spaceId: "space-1",
      userId: "user-1",
      file: {
        type: "image/jpeg",
        size: 1024,
        name: "photo.jpg",
      } as File,
      caption: "  海边散步  ",
    });

    expect(result.ok).toBe(true);
    const payload = insert.mock.calls[0]?.[0] as { caption: string | null };
    expect(payload.caption).toBe("海边散步");
  });

  it("Photo_Upload_Caption_EmptyToNull_And_MaxLength", async () => {
    const storageFrom = createStorageFromMock();
    const insertedRow = {
      id: "p1",
      space_id: "space-1",
      uploaded_by: "user-1",
      object_path: "space-1/user-1/a.jpg",
      mime_type: "image/jpeg",
      size_bytes: 123,
      caption: null,
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const single = vi.fn().mockResolvedValue({
      data: insertedRow,
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));

    const supabase = {
      storage: {
        from: vi.fn(() => storageFrom),
      },
      from: vi.fn(() => ({ insert })),
    } as unknown as Parameters<typeof uploadSpacePhotoWithRecord>[0]["supabase"];

    await uploadSpacePhotoWithRecord({
      supabase,
      spaceId: "space-1",
      userId: "user-1",
      file: {
        type: "image/jpeg",
        size: 1024,
        name: "photo.jpg",
      } as File,
      caption: "   ",
    });

    const nullPayload = insert.mock.calls[0]?.[0] as { caption: string | null };
    expect(nullPayload.caption).toBeNull();

    await uploadSpacePhotoWithRecord({
      supabase,
      spaceId: "space-1",
      userId: "user-1",
      file: {
        type: "image/jpeg",
        size: 1024,
        name: "photo.jpg",
      } as File,
      caption: "a".repeat(SPACE_PHOTO_CAPTION_MAX_LENGTH + 10),
    });

    const slicedPayload = insert.mock.calls[1]?.[0] as { caption: string | null };
    expect(slicedPayload.caption?.length).toBe(SPACE_PHOTO_CAPTION_MAX_LENGTH);
  });

  it("Photo_List_Latest20Desc", async () => {
    const rows = [
      {
        id: "p1",
        space_id: "space-1",
        uploaded_by: "u1",
        object_path: "space-1/u1/1.jpg",
        mime_type: "image/jpeg",
        size_bytes: 123,
        caption: null,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];

    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };

    const storageFrom = createStorageFromMock();
    const supabase = {
      from: vi.fn(() => query),
      storage: {
        from: vi.fn(() => storageFrom),
      },
    } as unknown as Parameters<typeof loadRecentSpacePhotos>[0]["supabase"];

    const result = await loadRecentSpacePhotos({
      supabase,
      spaceId: "space-1",
    });

    expect(query.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(result.length).toBe(1);
    expect(result[0]?.publicUrl).toContain("space-1/u1/1.jpg");
    expect(result[0]?.caption).toBeNull();
  });

  it("Photo_List_MissingCaptionField_FallbackNull", async () => {
    const rows = [
      {
        id: "p1",
        space_id: "space-1",
        uploaded_by: "u1",
        object_path: "space-1/u1/1.jpg",
        mime_type: "image/jpeg",
        size_bytes: 123,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];

    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };

    const storageFrom = createStorageFromMock();
    const supabase = {
      from: vi.fn(() => query),
      storage: {
        from: vi.fn(() => storageFrom),
      },
    } as unknown as Parameters<typeof loadRecentSpacePhotos>[0]["supabase"];

    const result = await loadRecentSpacePhotos({
      supabase,
      spaceId: "space-1",
    });

    expect(result[0]?.caption).toBeNull();
  });

  it("Photo_Delete_ByUploader_Success", () => {
    const permission = getPhotoDeletePermission({
      photo: { uploadedBy: "user-1" },
      currentUserId: "user-1",
      spaceOwnerUserId: "owner-1",
    });

    expect(permission).toBe("uploader");
  });

  it("Photo_Delete_BySpaceOwner_Success", () => {
    const permission = getPhotoDeletePermission({
      photo: { uploadedBy: "user-2" },
      currentUserId: "owner-1",
      spaceOwnerUserId: "owner-1",
    });

    expect(permission).toBe("space_owner");
  });

  it("Photo_Delete_ByOtherMember_Forbidden", () => {
    const permission = getPhotoDeletePermission({
      photo: { uploadedBy: "user-2" },
      currentUserId: "user-3",
      spaceOwnerUserId: "owner-1",
    });

    expect(permission).toBe("forbidden");
  });

  it("Photo_Delete_StorageMissing_AllowsDbDelete", async () => {
    const storageFrom = createStorageFromMock({
      removeError: { message: "Object not found" },
    });

    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn(() => ({ eq: deleteEq }));

    const supabase = {
      storage: {
        from: vi.fn(() => storageFrom),
      },
      from: vi.fn(() => ({ delete: del })),
    } as unknown as Parameters<typeof deleteSpacePhotoWithRecord>[0]["supabase"];

    const result = await deleteSpacePhotoWithRecord({
      supabase,
      photo: {
        id: "photo-1",
        objectPath: "space-1/user-1/a.jpg",
      },
    });

    expect(result.ok).toBe(true);
    expect(deleteEq).toHaveBeenCalledWith("id", "photo-1");
  });
});
