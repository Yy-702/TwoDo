"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mapPasswordAuthErrorMessage } from "@/features/auth/messages";
import { inferSignUpOutcome } from "@/features/auth/signup";
import { parseEmailInput, parsePasswordInput } from "@/features/auth/validators";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export function LoginPageClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get("redirectTo") ?? "/app";
  const callbackError = searchParams.get("error");

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(
    callbackError ? "登录链接已失效，请使用邮箱密码登录" : null
  );
  const [error, setError] = useState<string | null>(null);

  async function ensurePersonalSpace() {
    const { error: ensureError } = await supabase.rpc("rpc_ensure_personal_space");

    if (ensureError) {
      setError("登录成功，但初始化个人空间失败，请稍后再试");
      return false;
    }

    return true;
  }

  async function signIn() {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(
        mapPasswordAuthErrorMessage({
          code: signInError.code,
          message: signInError.message,
        })
      );
      return;
    }

    const ready = await ensurePersonalSpace();

    if (!ready) {
      return;
    }

    router.replace(redirectTo);
  }

  async function signUp() {
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(
        mapPasswordAuthErrorMessage({
          code: signUpError.code,
          message: signUpError.message,
        })
      );
      return;
    }

    const outcome = inferSignUpOutcome({
      session: data.session,
      user: data.user,
    });

    if (outcome === "existing_user") {
      setError("该邮箱已注册，请直接登录");
      setMode("signin");
      return;
    }

    if (outcome === "requires_disable_confirm_email") {
      setError("当前项目启用了邮箱确认，请在 Supabase 关闭 Confirm email");
      setMode("signin");
      return;
    }

    const ready = await ensurePersonalSpace();

    if (!ready) {
      return;
    }

    router.replace(redirectTo);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const emailResult = parseEmailInput(email);

    if (!emailResult.success) {
      setError(emailResult.error);
      return;
    }

    const passwordResult = parsePasswordInput(password);

    if (!passwordResult.success) {
      setError(passwordResult.error);
      return;
    }

    setLoading(true);
    setInfo(null);
    setError(null);

    if (mode === "signup") {
      await signUp();
    } else {
      await signIn();
    }

    setLoading(false);
  }

  return (
    <div className="login-soft-bg relative flex min-h-screen flex-col text-[#181113]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-10 top-24 text-5xl text-[#ec5184]/20">❤</div>
        <div className="absolute right-20 top-40 text-3xl text-[#ec5184]/15">✦</div>
        <div className="absolute bottom-24 left-24 text-4xl text-[#ec5184]/20">♡</div>
        <div className="absolute right-10 top-1/2 text-3xl text-[#ec5184]/20">❦</div>
      </div>

      <header className="relative z-10 border-b border-transparent px-4 py-4 sm:px-6 lg:px-20">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#ec5184]/10 text-xl text-[#ec5184]">
              ✓
            </div>
            <p className="font-brand text-2xl font-extrabold text-[#ec5184]">TWODO</p>
          </div>

          <nav className="hidden items-center gap-9 text-sm font-medium text-[#5f3b49] md:flex">
            <a href="#" className="transition-colors hover:text-[#ec5184]">
              首页
            </a>
            <a href="#" className="transition-colors hover:text-[#ec5184]">
              功能特色
            </a>
            <a href="#" className="transition-colors hover:text-[#ec5184]">
              关于我们
            </a>
          </nav>

          <button
            type="button"
            className="hidden h-10 items-center rounded-full bg-[#ec5184] px-6 text-sm font-bold text-white shadow-md shadow-[#ec5184]/20 transition-all hover:bg-[#d94273] sm:flex"
            onClick={() => {
              setMode("signup");
              setError(null);
              setInfo(null);
            }}
          >
            注册
          </button>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 lg:px-20">
        <div className="flex w-full max-w-[1200px] flex-col items-center gap-12 lg:flex-row lg:gap-20">
          <section className="order-2 flex flex-1 flex-col items-center gap-5 text-center lg:order-1 lg:items-start lg:gap-6 lg:text-left">
            <div className="max-w-xl space-y-4">
              <h1 className="font-brand text-5xl font-black tracking-wide text-[#ec5184] sm:text-6xl lg:text-8xl">
                TWODO
              </h1>
              <h2 className="text-2xl font-black text-[#22171b] sm:text-3xl">开启你们的甜蜜旅程</h2>
              <p className="text-base leading-relaxed text-[#88636f] sm:text-lg">
                在这里，所有的待办都是浪漫的约定。专为情侣设计的共享 To-Do 空间，记录每一个温暖瞬间，规划未来的美好蓝图。
              </p>
            </div>

            <div className="relative mt-2 w-full max-w-[500px] overflow-hidden rounded-3xl border-4 border-white twodo-shadow sm:mt-4">
              <div className="aspect-[4/3] bg-[radial-gradient(circle_at_20%_30%,#ff8dac_0%,#f2769a_30%,#8a6ad8_70%,#4f8ff0_100%)]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 text-left text-white">
                <p className="inline-flex rounded-md bg-[#ec5184]/90 px-2 py-1 text-xs font-black">NEXT UP</p>
                <p className="mt-2 text-xl font-black sm:text-2xl">一起去海边看日落 🌊</p>
              </div>
            </div>

            <div className="mt-1 flex items-center gap-3 text-sm text-[#88636f] sm:mt-2">
              <div className="flex -space-x-2">
                <span className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-[#f5d4de] text-xs">
                  A
                </span>
                <span className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-[#f7c0d0] text-xs">
                  B
                </span>
                <span className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-[#f8dbe5] text-xs">
                  C
                </span>
              </div>
              <span>已有 10,000+ 对情侣在 TWODO 记录爱意</span>
            </div>
          </section>

          <section className="order-1 w-full max-w-[430px] lg:order-2">
            <div className="relative overflow-hidden rounded-3xl border border-red-50 bg-white p-5 twodo-shadow sm:p-8">
              <div className="absolute -right-8 -top-8 text-[160px] text-[#ec5184]/5">❤</div>

              <div className="relative z-10 text-center">
                <h3 className="font-brand text-3xl font-extrabold text-[#22171b] sm:text-4xl">Welcome Back!</h3>
                <p className="mt-2 text-sm text-[#88636f]">登录 TWODO，继续书写浪漫篇章</p>
              </div>

              <div className="relative z-10 mt-6 grid grid-cols-2 gap-2 rounded-xl bg-[#fff3f7] p-1">
                <button
                  type="button"
                  className={`h-10 rounded-lg text-sm font-bold transition ${
                    mode === "signin" ? "bg-white text-[#ec5184] shadow-sm" : "text-[#88636f]"
                  }`}
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setInfo(null);
                  }}
                >
                  登录
                </button>
                <button
                  type="button"
                  className={`h-10 rounded-lg text-sm font-bold transition ${
                    mode === "signup" ? "bg-white text-[#ec5184] shadow-sm" : "text-[#88636f]"
                  }`}
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    setInfo(null);
                  }}
                >
                  注册
                </button>
              </div>

              <form className="relative z-10 mt-6 space-y-5" onSubmit={(event) => void submit(event)}>
                <label className="grid gap-2">
                  <span className="ml-1 text-sm font-bold text-[#22171b]">账号</span>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="请输入你的邮箱"
                    className="h-12 rounded-xl border border-transparent bg-[#fffaf6] px-4 text-sm outline-none transition focus:border-[#ec5184]"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="ml-1 text-sm font-bold text-[#22171b]">密码</span>
                  <input
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    placeholder="至少 8 位"
                    className="h-12 rounded-xl border border-transparent bg-[#fffaf6] px-4 text-sm outline-none transition focus:border-[#ec5184]"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ec5184] text-lg font-black text-white shadow-lg shadow-[#ec5184]/30 transition-all hover:bg-[#d94273] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    {loading
                      ? mode === "signin"
                        ? "登录中..."
                        : "注册中..."
                      : mode === "signin"
                        ? "登录"
                        : "注册并登录"}
                  </span>
                  <span>→</span>
                </button>
              </form>

              {info ? <p className="relative z-10 mt-4 text-sm text-emerald-600">{info}</p> : null}
              {error ? <p className="relative z-10 mt-2 text-sm text-rose-600">{error}</p> : null}

              <div className="relative z-10 mt-8 border-t border-[#f5e6eb] pt-6 text-center">
                <p className="text-sm text-[#88636f]">
                  还没有 TWODO 账号？
                  <button
                    type="button"
                    className="ml-1 font-bold text-[#ec5184] hover:underline"
                    onClick={() => setMode("signup")}
                  >
                    免费注册
                  </button>
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs text-[#9e7f8a]">
        © 2024 TWODO. 用爱连接每一天。
      </footer>
    </div>
  );
}
