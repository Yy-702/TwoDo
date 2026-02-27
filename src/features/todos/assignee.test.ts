import { describe, expect, it } from "vitest";
import {
  deriveAssigneeMode,
  mapAssigneeModeToUserId,
  type AssigneeMode,
} from "@/features/todos/assignee";

describe("assignee mapping", () => {
  it("maps both mode to null assignee", () => {
    expect(mapAssigneeModeToUserId("both", "user-1")).toBeNull();
  });

  it("maps single mode to selected user", () => {
    expect(mapAssigneeModeToUserId("single", "user-1")).toBe("user-1");
  });

  it("throws when single mode has empty user id", () => {
    expect(() => mapAssigneeModeToUserId("single", "")).toThrow(
      "single 模式必须提供执行人"
    );
  });

  it("derives both mode from null assignee", () => {
    expect(deriveAssigneeMode(null)).toEqual<{
      mode: AssigneeMode;
      assigneeUserId: string | null;
    }>({ mode: "both", assigneeUserId: null });
  });

  it("derives single mode from non-empty assignee", () => {
    expect(deriveAssigneeMode("user-2")).toEqual<{
      mode: AssigneeMode;
      assigneeUserId: string | null;
    }>({ mode: "single", assigneeUserId: "user-2" });
  });
});
