export type InviteJoinResult =
  | "ok"
  | "invalid_code"
  | "space_full"
  | "already_member"
  | "already_has_shared_space";

export type CloseSharedSpaceState = "none" | "pending_by_me" | "pending_by_partner";

export type CloseSharedSpaceActionResult =
  | "pending"
  | "closed"
  | "cancelled"
  | "already_pending";

export type SharedSpaceContext = {
  spaceId: string;
  ownerUserId: string;
  inviteCode: string | null;
  memberCount: number;
  closeRequestInitiatorUserId: string | null;
  closeRequestCreatedAt: string | null;
};

export function deriveCloseSharedSpaceState(
  context: SharedSpaceContext,
  currentUserId: string
): CloseSharedSpaceState {
  if (!context.closeRequestInitiatorUserId) {
    return "none";
  }

  if (context.closeRequestInitiatorUserId === currentUserId) {
    return "pending_by_me";
  }

  return "pending_by_partner";
}

export function mapJoinErrorCode(code: string): InviteJoinResult {
  switch (code) {
    case "ALREADY_HAS_SHARED_SPACE":
      return "already_has_shared_space";
    case "INVALID_CODE":
      return "invalid_code";
    case "SPACE_FULL":
      return "space_full";
    case "ALREADY_MEMBER":
      return "already_member";
    default:
      return "invalid_code";
  }
}

export function toInviteCode(value: string): string {
  return value.trim().toUpperCase();
}

export function extractJoinErrorCode(message: string): string {
  const raw = message.toUpperCase();

  if (raw.includes("ALREADY_HAS_SHARED_SPACE")) {
    return "ALREADY_HAS_SHARED_SPACE";
  }

  if (raw.includes("INVALID_CODE")) {
    return "INVALID_CODE";
  }

  if (raw.includes("SPACE_FULL")) {
    return "SPACE_FULL";
  }

  if (raw.includes("ALREADY_MEMBER")) {
    return "ALREADY_MEMBER";
  }

  return "INVALID_CODE";
}

export function mapCloseActionResult(rawResult: string): CloseSharedSpaceActionResult {
  if (rawResult === "closed") {
    return "closed";
  }

  if (rawResult === "cancelled") {
    return "cancelled";
  }

  if (rawResult === "already_pending") {
    return "already_pending";
  }

  return "pending";
}

export function extractCloseErrorCode(message: string): string {
  const raw = message.toUpperCase();

  if (raw.includes("CLOSE_REQUEST_NOT_FOUND")) {
    return "CLOSE_REQUEST_NOT_FOUND";
  }

  if (raw.includes("CLOSE_REQUEST_ALREADY_EXISTS")) {
    return "CLOSE_REQUEST_ALREADY_EXISTS";
  }

  if (raw.includes("CLOSE_REQUEST_CONFIRM_BY_INITIATOR_FORBIDDEN")) {
    return "CLOSE_REQUEST_CONFIRM_BY_INITIATOR_FORBIDDEN";
  }

  if (raw.includes("CLOSE_REQUEST_CANCEL_BY_NON_INITIATOR_FORBIDDEN")) {
    return "CLOSE_REQUEST_CANCEL_BY_NON_INITIATOR_FORBIDDEN";
  }

  if (raw.includes("SPACE_NOT_SHARED")) {
    return "SPACE_NOT_SHARED";
  }

  if (raw.includes("NOT_SHARED_MEMBER")) {
    return "NOT_SHARED_MEMBER";
  }

  return "UNKNOWN_CLOSE_ERROR";
}

export function mapCloseErrorCodeMessage(code: string): string {
  switch (code) {
    case "CLOSE_REQUEST_NOT_FOUND":
      return "关闭请求不存在，请刷新后重试";
    case "CLOSE_REQUEST_ALREADY_EXISTS":
      return "已存在待确认的关闭请求";
    case "CLOSE_REQUEST_CONFIRM_BY_INITIATOR_FORBIDDEN":
      return "发起方不能自己确认关闭，请等待对方确认";
    case "CLOSE_REQUEST_CANCEL_BY_NON_INITIATOR_FORBIDDEN":
      return "仅发起方可以取消关闭请求";
    case "SPACE_NOT_SHARED":
      return "当前空间不是共享空间";
    case "NOT_SHARED_MEMBER":
      return "你不是该共享空间成员";
    default:
      return "关闭共享空间失败，请稍后重试";
  }
}

export function mapJoinSystemErrorMessage(rawError: string): string | null {
  const normalized = rawError.toUpperCase();

  if (normalized.includes("UNAUTHORIZED")) {
    return "登录状态已失效，请重新登录后重试";
  }

  if (normalized.includes("PGRST202") || normalized.includes("COULD NOT FIND THE FUNCTION")) {
    return "后端函数未同步，请在 Supabase 执行最新数据库迁移后重试";
  }

  if (normalized.includes("42501") || normalized.includes("PERMISSION DENIED")) {
    return "后端权限配置缺失，请检查 rpc_join_shared_space 的执行权限";
  }

  return null;
}
