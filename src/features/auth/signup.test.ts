import { describe, expect, it } from "vitest";
import { inferSignUpOutcome } from "@/features/auth/signup";

describe("inferSignUpOutcome", () => {
  it("returns signed_in when session exists", () => {
    expect(
      inferSignUpOutcome({
        session: { access_token: "token" },
        user: null,
      })
    ).toBe("signed_in");
  });

  it("returns existing_user when identities is empty", () => {
    expect(
      inferSignUpOutcome({
        session: null,
        user: { identities: [] },
      })
    ).toBe("existing_user");
  });

  it("returns requires_disable_confirm_email when no session and identities exist", () => {
    expect(
      inferSignUpOutcome({
        session: null,
        user: { identities: [{ id: "id-1" }] },
      })
    ).toBe("requires_disable_confirm_email");
  });
});
