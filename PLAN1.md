# 纪念日功能（`/app/anniversaries`）实现计划

## 摘要
实现一个“纪念日与倒计时”页面，设计基线采用现有 `_8` 纪念日稿方向，并与当前项目视觉/交互体系保持一致。首版范围为“创建 + 查看 + 删除”，字段为“标题 + 日期 + 备注 + 每年重复开关”，不做提醒、不做编辑。数据按空间隔离，空间成员均可删除。

## 公共接口 / 类型变更
1. 导航类型扩展：
[app-topbar.tsx](/Users/hyy/VSCodeProject/TwoDo/src/components/layout/app-topbar.tsx) 的 `AppTopbarActiveNav` 新增 `"anniversaries"`；  
[app-shell.tsx](/Users/hyy/VSCodeProject/TwoDo/src/components/layout/app-shell.tsx) 的 `activeNav` 联合类型新增 `"anniversaries"`。
2. 数据库表新增：
在 [supabase/migrations](/Users/hyy/VSCodeProject/TwoDo/supabase/migrations) 新增 `011_anniversaries.sql`，创建 `public.anniversaries` 表并配置 RLS。
3. Supabase TS 类型更新：
更新 [database.types.ts](/Users/hyy/VSCodeProject/TwoDo/src/lib/supabase/database.types.ts)，新增 `anniversaries` 的 `Row/Insert/Update/Relationships` 类型。
4. 新增前端领域类型：
新增 [anniversary.ts](/Users/hyy/VSCodeProject/TwoDo/src/features/anniversaries/anniversary.ts) 导出 `Anniversary`、`AnniversaryCreateInput`、倒计时计算结果类型与 CRUD 方法。

## 数据模型（定稿）
在 `011_anniversaries.sql` 中定义：
1. 表 `public.anniversaries` 字段：
`id uuid pk default gen_random_uuid()`  
`space_id uuid not null references public.spaces(id) on delete cascade`  
`title text not null`  
`event_date date not null`  
`note text null`  
`is_yearly boolean not null default true`  
`created_by uuid not null references auth.users(id) on delete cascade`  
`created_at timestamptz not null default now()`  
`updated_at timestamptz not null default now()`
2. 约束：
`char_length(btrim(title)) between 1 and 60`  
`char_length(coalesce(note, '')) <= 200`
3. 索引：
`(space_id, event_date)`、`(space_id, created_at desc)`。
4. 触发器：
复用 `public.set_updated_at()`，新增 `trg_anniversaries_set_updated_at`。
5. RLS 策略（命名固定）：
`anniversaries_select_member`：`using (public.is_space_member(space_id))`  
`anniversaries_insert_member`：`with check (created_by = auth.uid() and public.is_space_member(space_id))`  
`anniversaries_update_member`：`using/public.is_space_member(space_id)` + `with check/public.is_space_member(space_id)`  
`anniversaries_delete_member`：`using (public.is_space_member(space_id))`
6. Realtime：
将 `public.anniversaries` 加入 `supabase_realtime` publication（和 `todos/space_photos` 风格一致）。

## 页面与交互（定稿）
1. 路由与入口：
新增 [page.tsx](/Users/hyy/VSCodeProject/TwoDo/src/app/app/anniversaries/page.tsx) 挂载 `AnniversariesPage`。  
更新 [app-topbar.tsx](/Users/hyy/VSCodeProject/TwoDo/src/components/layout/app-topbar.tsx) 与 [app-shell.tsx](/Users/hyy/VSCodeProject/TwoDo/src/components/layout/app-shell.tsx)，导航文案统一为“纪念日”，链接 `/app/anniversaries`，桌面和移动端都加入口。
2. 页面容器：
新增 [anniversaries-page.tsx](/Users/hyy/VSCodeProject/TwoDo/src/features/anniversaries/anniversaries-page.tsx)，沿用 `AppTopbar` + 与 memories 相近的暖色背景风格；标题“纪念日与倒计时”。
3. 创建交互：
右上角“新建纪念日”按钮打开弹窗。  
新增 [anniversary-editor-modal.tsx](/Users/hyy/VSCodeProject/TwoDo/src/features/anniversaries/anniversary-editor-modal.tsx)（仅 create 模式），字段：
`title`（必填，<=60）  
`eventDate`（必填，`type="date"`）  
`isYearly`（默认 `true`）  
`note`（可选，<=200）
4. 列表与排序：
“纪念日列表”按“最近倒计时升序”，规则固定：  
先 `daysUntil >= 0` 升序，再 `daysUntil < 0` 按绝对值升序。  
状态文案：`0 => 今天`，`>0 => 还有 X 天`，`<0 => 已过去 X 天`，`isYearly=true` 显示 `距下次 X 天`。
5. 主倒计时卡：
页面顶部展示“最近一个即将到来”的纪念日；若无数据，显示空态引导卡。
6. 时间线：
“回忆时间线”展示已发生纪念日（含 yearly 的原始事件日期），按 `event_date desc`。
7. 删除：
每条卡片提供删除按钮，二次确认后执行删除；成功刷新列表，失败显示错误提示。

## 倒计时计算规则（定稿）
1. 日期粒度仅到“天”，不处理时分秒。
2. 使用本地时区当天 `startOf("day")` 计算（前端 dayjs）。
3. `is_yearly = true`：
计算“下一次发生日期”；若当年已过则取明年。  
`2/29` 在非闰年按 `2/28` 处理。
4. `is_yearly = false`：
直接按 `event_date - today` 计算，可为负数。
5. 提供纯函数并单测覆盖：`computeAnniversaryStatus`, `resolveNextOccurrenceDate`, `sortAnniversariesForList`。

## 实施文件清单
1. 新增：
[page.tsx](/Users/hyy/VSCodeProject/TwoDo/src/app/app/anniversaries/page.tsx)  
[anniversaries-page.tsx](/Users/hyy/VSCodeProject/TwoDo/src/features/anniversaries/anniversaries-page.tsx)  
[anniversary-editor-modal.tsx](/Users/hyy/VSCodeProject/TwoDo/src/features/anniversaries/anniversary-editor-modal.tsx)  
[anniversary.ts](/Users/hyy/VSCodeProject/TwoDo/src/features/anniversaries/anniversary.ts)  
[anniversary.test.ts](/Users/hyy/VSCodeProject/TwoDo/src/features/anniversaries/anniversary.test.ts)  
[anniversaries-page.test.tsx](/Users/hyy/VSCodeProject/TwoDo/src/features/anniversaries/anniversaries-page.test.tsx)  
[011_anniversaries.sql](/Users/hyy/VSCodeProject/TwoDo/supabase/migrations/011_anniversaries.sql)
2. 修改：
[app-topbar.tsx](/Users/hyy/VSCodeProject/TwoDo/src/components/layout/app-topbar.tsx)  
[app-shell.tsx](/Users/hyy/VSCodeProject/TwoDo/src/components/layout/app-shell.tsx)  
[app-topbar.test.tsx](/Users/hyy/VSCodeProject/TwoDo/src/components/layout/app-topbar.test.tsx)  
[app-shell.test.tsx](/Users/hyy/VSCodeProject/TwoDo/src/components/layout/app-shell.test.tsx)  
[database.types.ts](/Users/hyy/VSCodeProject/TwoDo/src/lib/supabase/database.types.ts)  
[screen-map.md](/Users/hyy/VSCodeProject/TwoDo/docs/design/screen-map.md)（`_8` 改为已接入）  
[README.md](/Users/hyy/VSCodeProject/TwoDo/README.md)（新增路由与迁移编号）

## 测试用例与验收场景
1. 单元测试（`anniversary.test.ts`）：
每年重复倒计时、一次性过去事件、今天事件、`2/29` 非闰年映射 `2/28`、排序规则。
2. 页面测试（`anniversaries-page.test.tsx`）：
未登录跳转 `/login`；  
加载后显示主卡/列表/时间线；  
打开弹窗并成功创建后列表更新；  
缺少标题或日期时提交禁用；  
删除成功与失败提示。
3. 导航测试：
`AppTopbar` 与 `AppShell` 都出现“纪念日”入口，且 active 态可正确标记。
4. 手工验收：
在个人空间与共享空间分别创建、查看、删除；切换空间后数据隔离正确；移动端底部导航可进入页面。

## 默认假设与边界
1. 首版不实现编辑，不实现提醒，不实现分类筛选。
2. 删除权限为“空间成员都可删”。
3. 前端不引入实时订阅，创建/删除后主动刷新当前列表。
4. 注释与提交信息按仓库规范使用中文，提交前执行 `npm run test:unit` 验证。
