# TwoDo Screen Map

## P0 页面映射

| 设计目录 | 标题 | 路由 | 实现状态 |
| --- | --- | --- | --- |
| `_1` | TWODO：登录页面 | `/login` | 已接入 |
| `couple_s_interactive_dashboard_variant_2` | 中文版：手账风双人工作台 (方案2) | `/app` | 已接入 |
| `_10` | Task Edit & Interaction | `/app` 任务编辑弹窗 | 已接入 |
| `_4` | CoupleToDo - Invite Partner | `/app/invite` | 已接入 |
| `_5` | TWODO：连结成功页面 | `/app/invite/success` | 已接入 |
| `_2` | 甜蜜时光 - 照片墙 | `/app/memories` | 已接入 |
| `_8` | 纪念日与倒计时 | `/app/anniversaries` | 已接入 |

## 手机端导航

- 主功能页（`/app`、`/app/challenges`、`/app/memories`、`/app/anniversaries`、`/app/invite`）统一使用底部导航。
- `AppTopbar` 顶部横向导航在手机端隐藏，避免与底部导航重复。
- `/app/invite/success` 维持沉浸式页面，不显示底部导航。

## 非 P0（本轮不实现）

| 设计目录 | 建议路由 | 说明 |
| --- | --- | --- |
| `_3` / `_6` | `/app/profile` | 个人与双人统计页，后续迭代 |
| `_7` | `/app/wishes` | 心愿清单后续迭代 |
| `_9` | `/app/challenges` | 双人挑战后续迭代 |
