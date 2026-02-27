import { describe, expect, it } from "vitest";
import { mapPasswordAuthErrorMessage } from "@/features/auth/messages";

describe("auth messages", () => {
  it("maps invalid_credentials to clear message", () => {
    expect(
      mapPasswordAuthErrorMessage({
        code: "invalid_credentials",
        message: "Invalid login credentials",
      })
    ).toBe("邮箱或密码错误");
  });

  it("maps email_not_confirmed to clear message", () => {
    expect(
      mapPasswordAuthErrorMessage({
        code: "email_not_confirmed",
        message: "Email not confirmed",
      })
    ).toBe("当前项目启用了邮箱确认，请在 Supabase 关闭 Confirm email");
  });

  it("maps weak_password message", () => {
    expect(
      mapPasswordAuthErrorMessage({
        code: "weak_password",
        message: "Password should be at least 8 characters.",
      })
    ).toBe("密码强度不足，请至少使用 8 位字符");
  });

  it("falls back to default message for unknown errors", () => {
    expect(
      mapPasswordAuthErrorMessage({
        code: "unknown_error",
        message: "something wrong",
      })
    ).toBe("登录失败，请稍后再试");
  });

  it("maps over_email_send_rate_limit with config hint", () => {
    expect(
      mapPasswordAuthErrorMessage({
        code: "over_email_send_rate_limit",
        message: "email rate limit exceeded",
      })
    ).toBe("触发邮件发送限流，请在 Supabase 关闭 Confirm email");
  });
});
