import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const SPACE_PHOTO_BUCKET = "space_photos";
export const SPACE_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const SPACE_PHOTO_CAPTION_MAX_LENGTH = 60;

const SPACE_PHOTO_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

type SpacePhotoRow = Database["public"]["Tables"]["space_photos"]["Row"];

export type SpacePhoto = {
  id: string;
  spaceId: string;
  uploadedBy: string;
  objectPath: string;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  createdAt: string;
  publicUrl: string;
};

export type PhotoUploadResult =
  | {
      ok: true;
      photo: SpacePhoto;
    }
  | {
      ok: false;
      code:
        | "invalid_type"
        | "too_large"
        | "storage_upload_failed"
        | "db_insert_failed";
      message: string;
    };

export type PhotoDeleteResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      code: "storage_delete_failed" | "db_delete_failed";
      message: string;
    };

export type PhotoDeletePermission = "uploader" | "space_owner" | "forbidden";

export type PhotoListState = "idle" | "loading" | "ready" | "error";

export function mapPhotoErrorMessage(
  code:
    | "invalid_type"
    | "too_large"
    | "storage_upload_failed"
    | "db_insert_failed"
    | "storage_delete_failed"
    | "db_delete_failed"
): string {
  switch (code) {
    case "invalid_type":
      return "仅支持 PNG/JPEG/WEBP";
    case "too_large":
      return "照片不能超过 8MB";
    case "storage_upload_failed":
      return "上传失败，请稍后重试";
    case "db_insert_failed":
      return "照片保存失败，请稍后重试";
    case "storage_delete_failed":
      return "删除文件失败，请稍后重试";
    case "db_delete_failed":
      return "删除记录失败，请稍后重试";
    default:
      return "操作失败，请稍后重试";
  }
}

export function validatePhotoFile(file: Pick<File, "type" | "size">) {
  if (!SPACE_PHOTO_ALLOWED_TYPES.includes(file.type)) {
    return {
      ok: false as const,
      code: "invalid_type" as const,
      message: mapPhotoErrorMessage("invalid_type"),
    };
  }

  if (file.size > SPACE_PHOTO_MAX_BYTES) {
    return {
      ok: false as const,
      code: "too_large" as const,
      message: mapPhotoErrorMessage("too_large"),
    };
  }

  return {
    ok: true as const,
  };
}

function inferPhotoExt(file: Pick<File, "type" | "name">): string {
  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  if (file.type === "image/jpeg") {
    return "jpg";
  }

  const rawExt = file.name.split(".").pop()?.toLowerCase();
  if (rawExt === "png" || rawExt === "jpg" || rawExt === "jpeg" || rawExt === "webp") {
    return rawExt === "jpeg" ? "jpg" : rawExt;
  }

  return "jpg";
}

export function buildSpacePhotoPath(
  spaceId: string,
  userId: string,
  file: Pick<File, "type" | "name">,
  now = Date.now(),
  randomSeed = Math.random()
): string {
  const ext = inferPhotoExt(file);
  const suffix = Math.floor(randomSeed * 1_000_000)
    .toString()
    .padStart(6, "0");

  return `${spaceId}/${userId}/${now}-${suffix}.${ext}`;
}

export function getPhotoPublicUrl(
  supabase: Pick<SupabaseClient<Database>, "storage">,
  objectPath: string
): string {
  const {
    data: { publicUrl },
  } = supabase.storage.from(SPACE_PHOTO_BUCKET).getPublicUrl(objectPath);

  return publicUrl;
}

export function toSpacePhoto(
  row: SpacePhotoRow,
  supabase: Pick<SupabaseClient<Database>, "storage">
): SpacePhoto {
  return {
    id: row.id,
    spaceId: row.space_id,
    uploadedBy: row.uploaded_by,
    objectPath: row.object_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    caption: row.caption ?? null,
    createdAt: row.created_at,
    publicUrl: getPhotoPublicUrl(supabase, row.object_path),
  };
}

function normalizePhotoCaption(caption: string | null | undefined): string | null {
  if (caption === null || caption === undefined) {
    return null;
  }

  const trimmed = caption.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, SPACE_PHOTO_CAPTION_MAX_LENGTH);
}

function isStorageMissingError(error: { message?: string } | null): boolean {
  if (!error?.message) {
    return false;
  }

  const raw = error.message.toUpperCase();
  return raw.includes("NOT FOUND") || raw.includes("NO SUCH FILE");
}

export function getPhotoDeletePermission(params: {
  photo: Pick<SpacePhoto, "uploadedBy">;
  currentUserId: string;
  spaceOwnerUserId: string;
}): PhotoDeletePermission {
  if (params.photo.uploadedBy === params.currentUserId) {
    return "uploader";
  }

  if (params.spaceOwnerUserId === params.currentUserId) {
    return "space_owner";
  }

  return "forbidden";
}

export async function loadRecentSpacePhotos(params: {
  supabase: SupabaseClient<Database>;
  spaceId: string;
  limit?: number;
}): Promise<SpacePhoto[]> {
  const { supabase, spaceId, limit = 20 } = params;

  const { data, error } = await supabase
    .from("space_photos")
    .select("*")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => toSpacePhoto(row, supabase));
}

export async function uploadSpacePhotoWithRecord(params: {
  supabase: SupabaseClient<Database>;
  spaceId: string;
  userId: string;
  file: File;
  caption?: string | null;
}): Promise<PhotoUploadResult> {
  const { supabase, spaceId, userId, file, caption } = params;

  const validation = validatePhotoFile(file);
  if (!validation.ok) {
    return {
      ok: false,
      code: validation.code,
      message: validation.message,
    };
  }

  const objectPath = buildSpacePhotoPath(spaceId, userId, file);

  const { error: uploadError } = await supabase.storage
    .from(SPACE_PHOTO_BUCKET)
    .upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return {
      ok: false,
      code: "storage_upload_failed",
      message: mapPhotoErrorMessage("storage_upload_failed"),
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("space_photos")
    .insert({
      space_id: spaceId,
      uploaded_by: userId,
      object_path: objectPath,
      mime_type: file.type,
      size_bytes: file.size,
      caption: normalizePhotoCaption(caption),
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    await supabase.storage.from(SPACE_PHOTO_BUCKET).remove([objectPath]);

    return {
      ok: false,
      code: "db_insert_failed",
      message: mapPhotoErrorMessage("db_insert_failed"),
    };
  }

  return {
    ok: true,
    photo: toSpacePhoto(inserted, supabase),
  };
}

export async function deleteSpacePhotoWithRecord(params: {
  supabase: SupabaseClient<Database>;
  photo: Pick<SpacePhoto, "id" | "objectPath">;
}): Promise<PhotoDeleteResult> {
  const { supabase, photo } = params;

  const { error: storageError } = await supabase.storage
    .from(SPACE_PHOTO_BUCKET)
    .remove([photo.objectPath]);

  if (storageError && !isStorageMissingError(storageError)) {
    return {
      ok: false,
      code: "storage_delete_failed",
      message: mapPhotoErrorMessage("storage_delete_failed"),
    };
  }

  const { error: dbError } = await supabase
    .from("space_photos")
    .delete()
    .eq("id", photo.id);

  if (dbError) {
    return {
      ok: false,
      code: "db_delete_failed",
      message: mapPhotoErrorMessage("db_delete_failed"),
    };
  }

  return {
    ok: true,
  };
}
