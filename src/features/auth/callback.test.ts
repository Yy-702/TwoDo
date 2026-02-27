import { describe, expect, it } from "vitest";
import { parseAuthCallbackParams } from "@/features/auth/callback";

describe("auth callback parser", () => {
  it("parses token_hash callback", () => {
    const url = new URL(
      "http://localhost:3000/auth/callback?token_hash=abc123&type=magiclink"
    );

    expect(parseAuthCallbackParams(url)).toEqual({
      mode: "token_hash",
      tokenHash: "abc123",
      type: "magiclink",
    });
  });

  it("parses code callback", () => {
    const url = new URL("http://localhost:3000/auth/callback?code=pkce_code");

    expect(parseAuthCallbackParams(url)).toEqual({
      mode: "code",
      code: "pkce_code",
    });
  });

  it("returns invalid when query is incomplete", () => {
    const url = new URL("http://localhost:3000/auth/callback?type=magiclink");

    expect(parseAuthCallbackParams(url)).toEqual({ mode: "invalid" });
  });
});
