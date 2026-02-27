export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 环境变量");
  }

  if (!anonKey) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_ANON_KEY 环境变量");
  }

  return { url, anonKey };
}
