import type { EmailOtpType } from "@supabase/supabase-js";

const EMAIL_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

type AuthCallbackParams =
  | {
      mode: "token_hash";
      tokenHash: string;
      type: EmailOtpType;
    }
  | {
      mode: "code";
      code: string;
    }
  | {
      mode: "invalid";
    };

function isEmailOtpType(type: string): type is EmailOtpType {
  return EMAIL_OTP_TYPES.includes(type as EmailOtpType);
}

export function parseAuthCallbackParams(url: URL): AuthCallbackParams {
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const code = url.searchParams.get("code");

  if (tokenHash && type && isEmailOtpType(type)) {
    return {
      mode: "token_hash",
      tokenHash,
      type,
    };
  }

  if (code) {
    return {
      mode: "code",
      code,
    };
  }

  return {
    mode: "invalid",
  };
}
