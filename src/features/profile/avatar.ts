import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const AVATAR_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

type AvatarErrorCode =
  | "invalid_type"
  | "too_large"
  | "upload_failed"
  | "profile_update_failed";

export type AvatarUploadResult =
  | {
      ok: true;
      avatarPath: string;
    }
  | {
      ok: false;
      code: AvatarErrorCode;
      message: string;
    };

export type ProfileAvatar = {
  userId: string;
  displayName: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
};

export type SpaceMemberProfile = {
  userId: string;
  displayName: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
  role: string;
};

export function mapAvatarErrorMessage(code: AvatarErrorCode): string {
  switch (code) {
    case "invalid_type":
      return "仅支持 PNG/JPEG/WEBP 格式";
    case "too_large":
      return "头像文件不能超过 2MB";
    case "upload_failed":
      return "上传失败，请稍后重试";
    case "profile_update_failed":
      return "头像保存失败，请稍后重试";
    default:
      return "头像处理失败，请稍后重试";
  }
}

export function validateAvatarFile(file: Pick<File, "type" | "size">) {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    return {
      ok: false as const,
      code: "invalid_type" as const,
      message: mapAvatarErrorMessage("invalid_type"),
    };
  }

  if (file.size > AVATAR_MAX_BYTES) {
    return {
      ok: false as const,
      code: "too_large" as const,
      message: mapAvatarErrorMessage("too_large"),
    };
  }

  return {
    ok: true as const,
  };
}

function inferAvatarExtension(file: Pick<File, "type" | "name">): string {
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

export function buildAvatarPath(
  userId: string,
  file: Pick<File, "type" | "name">,
  now = Date.now(),
  randomSeed = Math.random()
): string {
  const ext = inferAvatarExtension(file);
  const suffix = Math.floor(randomSeed * 1_000_000)
    .toString()
    .padStart(6, "0");

  return `${userId}/${now}-${suffix}.${ext}`;
}

export function getAvatarPublicUrl(
  supabase: Pick<SupabaseClient<Database>, "storage">,
  avatarPath: string | null
): string | null {
  if (!avatarPath) {
    return null;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath);

  return publicUrl ?? null;
}

export async function uploadAvatarWithProfileUpdate(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  file: File;
  previousAvatarPath: string | null;
}): Promise<AvatarUploadResult> {
  const { supabase, userId, file, previousAvatarPath } = params;

  const validation = validateAvatarFile(file);
  if (!validation.ok) {
    return {
      ok: false,
      code: validation.code,
      message: validation.message,
    };
  }

  const nextAvatarPath = buildAvatarPath(userId, file);

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(nextAvatarPath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return {
      ok: false,
      code: "upload_failed",
      message: mapAvatarErrorMessage("upload_failed"),
    };
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      avatar_path: nextAvatarPath,
    },
    {
      onConflict: "id",
    }
  );

  if (profileError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([nextAvatarPath]);

    return {
      ok: false,
      code: "profile_update_failed",
      message: mapAvatarErrorMessage("profile_update_failed"),
    };
  }

  if (previousAvatarPath && previousAvatarPath !== nextAvatarPath) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previousAvatarPath]);
  }

  return {
    ok: true,
    avatarPath: nextAvatarPath,
  };
}
