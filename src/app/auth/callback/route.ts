import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseAuthCallbackParams } from "@/features/auth/callback";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = requestUrl.searchParams.get("next") ?? "/app";
  const callbackParams = parseAuthCallbackParams(requestUrl);

  if (callbackParams.mode === "invalid") {
    return NextResponse.redirect(new URL("/login?error=callback", requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();

  if (callbackParams.mode === "token_hash") {
    const { error } = await supabase.auth.verifyOtp({
      type: callbackParams.type,
      token_hash: callbackParams.tokenHash,
    });

    if (error) {
      return NextResponse.redirect(new URL("/login?error=callback", requestUrl.origin));
    }
  }

  if (callbackParams.mode === "code") {
    const { error } = await supabase.auth.exchangeCodeForSession(callbackParams.code);

    if (error) {
      return NextResponse.redirect(new URL("/login?error=callback", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
