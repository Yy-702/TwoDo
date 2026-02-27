type AuthErrorLike = {
  code?: string;
  message?: string;
};

export function mapPasswordAuthErrorMessage(error: AuthErrorLike): string {
  if (error.code === "invalid_credentials") {
    return "邮箱或密码错误";
  }

  if (error.code === "email_not_confirmed") {
    return "当前项目启用了邮箱确认，请在 Supabase 关闭 Confirm email";
  }

  if (error.code === "weak_password" || /at least\s*8/i.test(error.message ?? "")) {
    return "密码强度不足，请至少使用 8 位字符";
  }

  if (error.code === "user_already_exists") {
    return "该邮箱已注册，请直接登录";
  }

  if (error.code === "over_email_send_rate_limit") {
    return "触发邮件发送限流，请在 Supabase 关闭 Confirm email";
  }

  return "登录失败，请稍后再试";
}
