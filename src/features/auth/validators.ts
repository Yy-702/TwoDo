import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "请输入邮箱")
  .email("邮箱格式不正确");

const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}(\d{2})?$/, "验证码必须为 6 或 8 位数字");

const passwordSchema = z
  .string()
  .min(8, "密码至少需要 8 位")
  .max(72, "密码长度不能超过 72 位");

export function parseEmailInput(input: string):
  | { success: true; data: string }
  | { success: false; error: string } {
  const parsed = emailSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "邮箱无效" };
  }

  return { success: true, data: parsed.data };
}

export function parseOtpInput(input: string):
  | { success: true; data: string }
  | { success: false; error: string } {
  const parsed = otpSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "验证码无效",
    };
  }

  return { success: true, data: parsed.data };
}

export function parsePasswordInput(input: string):
  | { success: true; data: string }
  | { success: false; error: string } {
  const parsed = passwordSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "密码无效",
    };
  }

  return { success: true, data: parsed.data };
}
