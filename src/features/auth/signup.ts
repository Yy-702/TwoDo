export type SignUpOutcome =
  | "signed_in"
  | "existing_user"
  | "requires_disable_confirm_email";

type SignUpDataLike = {
  session: unknown | null;
  user: {
    identities?: unknown[] | null;
  } | null;
};

export function inferSignUpOutcome(data: SignUpDataLike): SignUpOutcome {
  if (data.session) {
    return "signed_in";
  }

  if (Array.isArray(data.user?.identities) && data.user.identities.length === 0) {
    return "existing_user";
  }

  return "requires_disable_confirm_email";
}
