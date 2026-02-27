import { describe, expect, it } from "vitest";
import {
  parseEmailInput,
  parseOtpInput,
  parsePasswordInput,
} from "@/features/auth/validators";

describe("auth validators", () => {
  it("accepts valid email", () => {
    expect(parseEmailInput("user@example.com")).toEqual({
      success: true,
      data: "user@example.com",
    });
  });

  it("rejects invalid email", () => {
    const result = parseEmailInput("bad-email");
    expect(result.success).toBe(false);
  });

  it("accepts 6-digit OTP", () => {
    expect(parseOtpInput("123456")).toEqual({
      success: true,
      data: "123456",
    });
  });

  it("accepts 8-digit OTP", () => {
    expect(parseOtpInput("12345678")).toEqual({
      success: true,
      data: "12345678",
    });
  });

  it("rejects non-digit OTP", () => {
    const result = parseOtpInput("12ab56");
    expect(result.success).toBe(false);
  });

  it("accepts valid password", () => {
    expect(parsePasswordInput("passw0rd")).toEqual({
      success: true,
      data: "passw0rd",
    });
  });

  it("rejects short password", () => {
    const result = parsePasswordInput("1234567");
    expect(result.success).toBe(false);
  });
});
