# TwoDo P0

双人协作待办应用（P0 版本）。

## 技术栈

- Next.js App Router + TypeScript + Tailwind CSS
- Supabase Auth + Postgres + RLS + Realtime
- Vitest + Playwright

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp .env.example .env.local
```

填写以下变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. 启动开发环境

```bash
npm run dev
```

## 数据库迁移（Supabase）

迁移文件位于 `supabase/migrations/`：

- `001_init.sql`
- `002_rls.sql`
- `003_rpc.sql`
- `004_realtime.sql`
- `005_fix_space_member_rls_recursion.sql`
- `006_fix_join_shared_space_lookup.sql`
- `007_shared_space_constraints_and_close_handshake.sql`
- `008_profile_avatar_and_storage.sql`

请按顺序在 Supabase SQL Editor 执行，或使用 Supabase CLI 执行迁移。

## Auth 配置

在 Supabase `Authentication -> Providers -> Email` 中启用 `Email + Password` 登录方式。
当前项目默认要求关闭 `Confirm email`，否则注册后将提示需要关闭邮箱确认。

## 可用页面

- `/login`
- `/app`
- `/app/invite`
- `/app/invite/success`

## 测试

```bash
npm run test:unit
npm run test:e2e
```

E2E 需要提供测试账号相关环境变量；未提供时会自动跳过主流程用例。

## 单环境部署（Production Only）

本项目采用单环境部署：

- 前端/BFF：Vercel Production
- 后端能力：Supabase 单项目
- 数据库发布：GitHub Actions + Supabase CLI（仅 `main`）

### 1. Vercel 环境变量

在 Vercel Production 配置以下变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Supabase Auth URL 配置

- Site URL：生产域名（例如 `https://twodo.example.com`）
- Redirect URLs：`https://twodo.example.com/auth/callback`

### 3. GitHub Secrets

在 GitHub 仓库配置：

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

### 4. CI/CD 工作流

- `/.github/workflows/ci.yml`
  - 触发：PR 到 `main`
  - 步骤：`npm ci` -> `npm run lint` -> `npm run test:unit` -> `npm run build`
- `/.github/workflows/db-migrate.yml`
  - 触发：push 到 `main` 且 `supabase/migrations/**` 变更，或手动触发
  - 步骤：`supabase link` -> `supabase db push`
  - 并发保护：`concurrency: db-migrate-production`

## 发布与回滚

### 发布流程

1. 功能分支提 PR 到 `main`
2. CI 通过后合并
3. 若包含迁移文件，自动执行 `db-migrate.yml`
4. Vercel 自动发布 Production

### 回滚流程

1. 前端故障：在 Vercel 回滚到上一稳定版本
2. 数据库问题：新增补偿迁移并重新走发布流程
3. 禁止在生产库手工改结构，所有变更必须通过迁移文件
