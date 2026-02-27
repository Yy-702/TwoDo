export type AssigneeMode = "both" | "single";

export function mapAssigneeModeToUserId(
  mode: AssigneeMode,
  assigneeUserId: string | null
): string | null {
  if (mode === "both") {
    return null;
  }

  if (!assigneeUserId || assigneeUserId.trim().length === 0) {
    throw new Error("single 模式必须提供执行人");
  }

  return assigneeUserId;
}

export function deriveAssigneeMode(assigneeUserId: string | null): {
  mode: AssigneeMode;
  assigneeUserId: string | null;
} {
  if (!assigneeUserId) {
    return {
      mode: "both",
      assigneeUserId: null,
    };
  }

  return {
    mode: "single",
    assigneeUserId,
  };
}
