import { describe, expect, it } from "vitest";
import {
  deriveCloseSharedSpaceState,
  extractJoinErrorCode,
  mapCloseActionResult,
  mapCloseErrorCodeMessage,
  mapJoinErrorCode,
  type CloseSharedSpaceActionResult,
  type CloseSharedSpaceState,
  type InviteJoinResult,
  type SharedSpaceContext,
} from "@/features/spaces/invite";

describe("invite join error mapping", () => {
  it("maps postgres invalid_code error", () => {
    expect(mapJoinErrorCode("INVALID_CODE")).toBe<InviteJoinResult>("invalid_code");
  });

  it("maps postgres space_full error", () => {
    expect(mapJoinErrorCode("SPACE_FULL")).toBe<InviteJoinResult>("space_full");
  });

  it("maps postgres already_member error", () => {
    expect(mapJoinErrorCode("ALREADY_MEMBER")).toBe<InviteJoinResult>("already_member");
  });

  it("maps postgres already_has_shared_space error", () => {
    expect(mapJoinErrorCode("ALREADY_HAS_SHARED_SPACE")).toBe<InviteJoinResult>(
      "already_has_shared_space"
    );
  });

  it("falls back to invalid_code for unknown errors", () => {
    expect(mapJoinErrorCode("SOMETHING_ELSE")).toBe<InviteJoinResult>("invalid_code");
  });

  it("extracts known code from message", () => {
    expect(extractJoinErrorCode("RPC_ERROR: SPACE_FULL")).toBe("SPACE_FULL");
  });

  it("extracts already_has_shared_space code from message", () => {
    expect(extractJoinErrorCode("RPC_ERROR: ALREADY_HAS_SHARED_SPACE")).toBe(
      "ALREADY_HAS_SHARED_SPACE"
    );
  });

  it("extracts invalid code for unknown message", () => {
    expect(extractJoinErrorCode("network failed")).toBe("INVALID_CODE");
  });

  it("maps close action result values", () => {
    expect(mapCloseActionResult("pending")).toBe<CloseSharedSpaceActionResult>("pending");
    expect(mapCloseActionResult("closed")).toBe<CloseSharedSpaceActionResult>("closed");
    expect(mapCloseActionResult("cancelled")).toBe<CloseSharedSpaceActionResult>("cancelled");
    expect(mapCloseActionResult("already_pending")).toBe<CloseSharedSpaceActionResult>(
      "already_pending"
    );
  });

  it("maps close error message", () => {
    expect(mapCloseErrorCodeMessage("CLOSE_REQUEST_NOT_FOUND")).toBe(
      "关闭请求不存在，请刷新后重试"
    );
    expect(mapCloseErrorCodeMessage("UNKNOWN")).toBe("关闭共享空间失败，请稍后重试");
  });

  it("derives close state", () => {
    const context: SharedSpaceContext = {
      spaceId: "space-1",
      ownerUserId: "owner-1",
      inviteCode: "ABCDEFGH",
      memberCount: 2,
      closeRequestInitiatorUserId: null,
      closeRequestCreatedAt: null,
    };

    expect(deriveCloseSharedSpaceState(context, "owner-1")).toBe<CloseSharedSpaceState>(
      "none"
    );

    expect(
      deriveCloseSharedSpaceState(
        {
          ...context,
          closeRequestInitiatorUserId: "owner-1",
        },
        "owner-1"
      )
    ).toBe<CloseSharedSpaceState>("pending_by_me");

    expect(
      deriveCloseSharedSpaceState(
        {
          ...context,
          closeRequestInitiatorUserId: "owner-1",
        },
        "member-2"
      )
    ).toBe<CloseSharedSpaceState>("pending_by_partner");
  });
});
