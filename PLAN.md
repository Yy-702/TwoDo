# 双人 TODO Web（个人空间 + 双人空间）MVP 实施方案（含已下载设计稿接入）

## 摘要
当前项目已具备设计输入资产（本地 `code.html + screen.png`），可以从“纯产品方案”进入“可执行落地方案”。  
MVP 技术路线继续采用 `Next.js + TypeScript + Supabase`，目标能力不变：
1. 邮箱验证码登录
2. 个人空间（仅自己）
3. 双人共享空间（邀请码加入，最多 2 人）
4. 标准任务字段（标题、备注、截止日期、优先级、完成状态、执行人）
5. 实时同步
6. 基础 PWA（可安装到桌面，不做完整离线冲突处理）

新增重点：把已下载的设计稿页面映射为真实路由与组件任务，避免“设计稿看着全、开发时返工”。

## 已下载设计稿资产盘点（现状）

设计稿目录：`stitch_couple_s_interactive_dashboard_variant_1/`

| 目录 | 页面标题 | 建议路由 | MVP 优先级 | 备注 |
| --- | --- | --- | --- | --- |
| `_1` | TWODO：登录页面 | `/login` | P0 | 直接作为登录页视觉基线 |
| `couple_s_interactive_dashboard_variant_2` | 中文版：手账风双人工作台 (方案2) | `/app` | P0 | 推荐作为主工作台基线 |
| `_10` | Task Edit & Interaction | `/app` 内任务编辑交互 | P0 | 可落为 Drawer/Modal |
| `_4` | CoupleToDo - Invite Partner | `/app/invite` | P0 | 双人空间邀请入口 |
| `_5` | TWODO：连结成功页面 | `/app/invite/success` | P0 | 邀请加入成功反馈 |
| `couple_s_interactive_dashboard_variant_1` | TWODO：双人甜蜜工作台 (中文版) | `/app` 备选视觉 | P1 | 作为样式参考，不直接 1:1 搬运 |
| `_3` | CoupleDo - Personal Profile & Shared Stats | `/app/profile` | P1 | 个人/双人统计页 |
| `_6` | TWODO - Personal Profile & Shared Stats | `/app/profile` | P1 | `_3` 的备选风格 |
| `_7` | 共同心愿清单：愿望卡片页 | `/app/wishes` | P1 | MVP 可先挂占位路由 |
| `_8` | LoveList - Anniversaries | `/app/anniversaries` | P1 | 纪念日功能后置 |
| `_2` | 甜蜜时光 - 照片墙 | `/app/memories` | P2 | 明确为后续迭代 |
| `_9` | CoupleDo - 双人挑战 | `/app/challenges` | P2 | 明确为后续迭代 |

## 视觉落地策略（先定规则再开发）

1. 主视觉基线采用 `couple_s_interactive_dashboard_variant_2`，`couple_s_interactive_dashboard_variant_1` 仅作为细节参考。
2. 设计源文件目录保持只读，不在其中二次修改；业务代码在应用目录重建。
3. 页面先做“结构还原 + 可用交互”，再做“像素级微调”。
4. 远程图片（人物头像等）在 MVP 先替换为可控占位图或本地素材，避免外链失效。
5. 设计稿中的示例文案、示例数据全部替换为真实数据流（Supabase）。

## 范围与非范围

### In Scope（MVP）
1. 用户登录/登出（Magic Link/OTP）
2. 空间管理：个人空间自动可用；创建双人空间；邀请码加入
3. 任务 CRUD：创建、编辑、完成、删除、指派
4. 双人空间实时同步
5. 基础 PWA 安装能力
6. 权限控制（RLS）
7. 与 P0 设计稿页面一致的主要信息层级和交互入口（登录、工作台、邀请、任务编辑）

### Out of Scope（后续迭代）
1. 子任务、标签、重复任务
2. 推送通知（Web Push）
3. 完整离线写入与冲突解决
4. 多人群组（>2 人）
5. 复杂审计与活动流
6. 照片墙、纪念日、双人挑战等 P1/P2 模块的完整业务化

## 架构与关键决策

1. 前端：`Next.js App Router + TypeScript + Tailwind CSS`
2. 后端能力：`Supabase Auth + Postgres + Realtime + RLS`
3. 数据访问策略：
   - 常规任务 CRUD 走 Supabase 客户端 + RLS
   - “创建共享空间/加入共享空间”走数据库 RPC（保证原子性和人数上限）
4. 同步策略：对当前空间的 `todos` 表进行 Realtime 订阅
5. PWA：`next-pwa`（或等效方案）实现 manifest + SW + 基础缓存
6. 设计还原策略：从静态 HTML 提炼为可复用组件，不直接复制整页 DOM

## 信息架构与页面映射（MVP）

1. `/login`
   - 来源：`_1/code.html`
   - 功能：邮箱登录、验证码输入、登录态跳转
2. `/app`
   - 来源：`couple_s_interactive_dashboard_variant_2/code.html`（主）+ `_10/code.html`（编辑交互）
   - 功能：空间切换、任务列表、任务编辑、指派与完成
3. `/app/invite`
   - 来源：`_4/code.html`
   - 功能：展示邀请码、复制邀请、输入邀请码加入
4. `/app/invite/success`
   - 来源：`_5/code.html`
   - 功能：加入成功反馈、返回工作台
5. 非 MVP 路由（先占位）
   - `/app/profile`、`/app/wishes`、`/app/anniversaries`（保留入口，功能延后）

## 推荐目录规划（便于设计稿接入）

1. `stitch_couple_s_interactive_dashboard_variant_1/`：设计输入源（只读）
2. `docs/design/screen-map.md`：页面映射与取舍记录
3. `docs/design/tokens.md`：颜色、字体、圆角、阴影 token 提取记录
4. `src/features/auth/`：登录相关 UI 与逻辑
5. `src/features/spaces/`：空间、邀请码、成员相关能力
6. `src/features/todos/`：任务列表、编辑、状态切换
7. `src/components/layout/`：应用壳与导航

## 数据模型（Supabase）

1. `profiles`
   - `id uuid pk references auth.users(id)`
   - `display_name text null`
   - `created_at timestamptz default now()`

2. `spaces`
   - `id uuid pk default gen_random_uuid()`
   - `name text not null`
   - `type text not null check (type in ('personal','shared'))`
   - `owner_user_id uuid not null references auth.users(id)`
   - `invite_code text unique null`（仅 shared 使用）
   - `created_at timestamptz default now()`
   - `updated_at timestamptz default now()`

3. `space_members`
   - `space_id uuid references spaces(id) on delete cascade`
   - `user_id uuid references auth.users(id) on delete cascade`
   - `role text not null check (role in ('owner','member'))`
   - `joined_at timestamptz default now()`
   - `primary key (space_id, user_id)`

4. `todos`
   - `id uuid pk default gen_random_uuid()`
   - `space_id uuid not null references spaces(id) on delete cascade`
   - `title text not null`
   - `description text null`
   - `due_at timestamptz null`
   - `priority text not null default 'medium' check (priority in ('low','medium','high'))`
   - `assignee_user_id uuid null references auth.users(id)`
   - `is_completed boolean not null default false`
   - `completed_at timestamptz null`
   - `created_by uuid not null references auth.users(id)`
   - `created_at timestamptz default now()`
   - `updated_at timestamptz default now()`

## 重要接口与类型（Public APIs / Interfaces / Types）

1. 数据库 RPC
   - `rpc_create_shared_space(space_name text) returns uuid`
     - 创建 `spaces(type='shared')`
     - 自动写入 owner 到 `space_members`
     - 生成唯一 `invite_code`
   - `rpc_join_shared_space(invite_code text) returns uuid`
     - 校验空间存在且为 `shared`
     - 校验当前成员数 < 2
     - 校验用户未在成员中
     - 写入 `space_members`

2. 前端 TypeScript 类型（与 DB 对齐）
   - `Space { id, name, type, ownerUserId, inviteCode? }`
   - `SpaceMember { spaceId, userId, role }`
   - `Todo { id, spaceId, title, description?, dueAt?, priority, assigneeUserId?, isCompleted, completedAt? }`

3. 页面级契约
   - `AppShell`：承载侧边栏、头部、当前空间上下文
   - `SpaceSwitcher`：切换当前空间并重建订阅
   - `TodoList`：仅渲染当前 `space_id` 任务
   - `TodoForm`：创建/编辑标准字段
   - `InvitePanel`：展示邀请码与加入入口

## 权限与安全（RLS）

1. `spaces`
   - `select`: 仅成员可见
   - `insert`: 登录用户可创建 personal/shared（owner 必须是自己）
   - `update/delete`: 仅 owner

2. `space_members`
   - `select`: 空间成员可见
   - `insert`: 仅通过 RPC（禁直接插入或限制为安全路径）

3. `todos`
   - `select/insert/update/delete`: 仅空间成员可操作
   - `assignee_user_id` 必须是该空间成员（应用层校验 + 可选 DB 触发器）

4. 防滥用
   - 邀请码长度与复杂度固定（如 8 位大写字母数字）
   - RPC 内做人数上限与重复加入保护

## 测试计划与验收场景

1. 单元测试
   - 任务字段校验（优先级、截止日期合法性）
   - UI 状态转换（完成/未完成）

2. 集成测试（Supabase）
   - RLS：非成员无法读写他人空间任务
   - RPC：共享空间第二人可加入，第三人被拒绝

3. E2E（Playwright）
   - 用户 A 登录 -> 创建共享空间 -> 获得邀请码
   - 用户 B 登录 -> 输入邀请码加入成功
   - A 创建任务 -> B 页面实时出现
   - B 完成任务 -> A 页面实时更新

4. 视觉验收（新增）
   - `/login`、`/app`、`/app/invite` 与对应 `screen.png` 做人工对照验收
   - 保证主要信息层级、卡片结构、按钮位置、间距节奏一致
   - 允许文案和头像素材替换，不要求逐像素一致

5. 验收标准（MVP Done）
   - 两个账号在不同设备可协作同一共享空间
   - 实时同步延迟在可接受范围（通常秒级）
   - 权限隔离正确（无法访问非成员空间）
   - PWA 可安装并从桌面图标打开
   - P0 页面视觉结构与交互入口符合设计稿预期

## 实施阶段（执行顺序，已纳入设计稿接入）

1. 设计稿接入准备
   - 产出 `docs/design/screen-map.md`：页面映射、P0/P1/P2、路由归属
   - 产出 `docs/design/tokens.md`：颜色/字体/圆角/阴影提取
2. 项目初始化
   - Next.js + TypeScript + Tailwind + ESLint + 基础目录
3. Supabase 初始化
   - Auth、表结构、RLS、RPC、Realtime 配置
4. 认证与会话
   - 实现 `/login` 视觉与登录逻辑、会话守卫、中间件
5. 应用壳与空间能力
   - 实现 `/app` 基础布局、空间切换、共享空间创建、邀请码加入
6. 任务功能
   - 列表、创建、编辑（含 `_10` 交互映射）、完成态、指派
7. 实时同步
   - 订阅与重连处理
8. 邀请成功页与状态反馈
   - 实现 `/app/invite/success` 及跳转闭环
9. PWA
   - manifest、icon、service worker
10. 测试与收尾
   - 单测 + 集成 + E2E + 视觉验收 + 上线检查

## 默认假设与已选项

1. 默认地区与语言：中文界面优先
2. 每位用户至少有一个个人空间
3. 共享空间严格限制最多 2 人
4. MVP 不做管理员后台
5. 部署目标默认：Vercel（前端）+ Supabase（后端能力）
6. 邀请码默认一次可重复使用，直到空间满员
7. 主视觉基线默认采用 `couple_s_interactive_dashboard_variant_2`
8. `stitch_...` 目录作为设计输入，不直接作为生产代码
