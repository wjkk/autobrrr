# Web 路由与页面规格（v0.2）

版本：v0.2  
日期：2026-03-09  
状态：已归档（主流程基础说明保留，接口与后台路径说明已过时）

> ⚠️ 本文中的 API 对接章节已明显过时，`/internal/*` 路径也已退化为兼容入口。
>
> 当前应改读：
>
> 1. `docs/index/master-index-v0.4.md`
> 2. `docs/specs/backend-data-api-spec-v0.3.md`
> 3. `docs/specs/frontend-workspace-contract-migration-v0.1.md`

## 1. 路由总览（已实现）

| 路由 | 当前行为 | 代码位置 |
| --- | --- | --- |
| `/` | 重定向到 `/explore` | `apps/web/src/app/page.tsx` |
| `/explore` | 首页（灵感创作台） | `apps/web/src/app/explore/page.tsx` |
| `/projects/:projectId` | 按项目状态重定向阶段页 | `apps/web/src/app/projects/[projectId]/page.tsx` |
| `/projects/:projectId/planner` | 策划页 | `apps/web/src/app/projects/[projectId]/planner/page.tsx` |
| `/projects/:projectId/creation` | 分片生成页 | `apps/web/src/app/projects/[projectId]/creation/page.tsx` |
| `/projects/:projectId/publish` | 发布页 | `apps/web/src/app/projects/[projectId]/publish/page.tsx` |

## 2. 项目阶段映射（已实现）

`/projects/:projectId` 跳转规则：

1. `published` -> `publish`
2. `creating | export_ready | exported` -> `creation`
3. 其他状态 -> `planner`

规则来源：`apps/web/src/features/shared/lib/project-stage.ts`。

## 3. 首页（/explore）当前行为

### 3.1 提交链路

1. 用户输入 prompt 并点击发送。
2. 前端调用 `createStudioProject({ prompt, contentMode })`。
3. 成功后跳转 `/projects/:projectId/planner`。

### 3.2 模式来源

`contentMode` 在首页提交时固化：

1. `短剧漫剧 + 多剧集开关=true` -> `series`
2. 其他 -> `single`

策划页不提供模式切换。

### 3.3 当前静态数据范围

以下仍主要来自前端常量：

1. tab 文案与占位文案
2. preset library
3. 主体/画风候选项
4. 灵感广场卡片

## 4. 策划页（/projects/:projectId/planner）当前行为

### 4.1 初始化

1. 通过 `projectId` 拉取项目数据。
2. `plannerMode` 由 `project.contentMode` 决定。
3. 右侧结果区初始为空（等待细化版本）。

### 4.2 输入区提交语义

1. 输入区是统一“提交”动作。
2. 未确认大纲时提交：触发“确认并开始细化”。
3. 已确认后提交：触发“重新细化并创建新版本”。

### 4.3 结果区语义

1. 历史按钮语义是“版本历史”（不是刷新）。
2. 主体/场景/分镜编辑作用于当前激活版本。
3. 主体/场景卡片为换行布局，不依赖横向滚动。

### 4.4 底部配置

1. 分镜图模型：独立下拉（非画风）。
2. 画面比例：默认 `16:9`，可选 `16:9 | 9:16 | 4:3 | 3:4`。

## 5. 查询参数规范（已实现）

### 5.1 Planner

不依赖 query 参数（不再使用 `prompt/title/storyMode` 注入）。

### 5.2 Creation

1. `shotId`: 默认选中的镜头 ID
2. `view`: `storyboard | default | lipsync`

## 6. API 对接现状与目标

### 6.1 当前仓库本地已实现

1. `GET /api/studio/projects`
2. `POST /api/studio/projects`

### 6.2 Explore/Planner 后端目标接口

1. `GET /api/projects/:projectId/planner/workspace`
2. `POST /api/projects/:projectId/planner/submit`
3. `GET /api/projects/:projectId/planner/refinement/versions*`
4. `PATCH /api/projects/:projectId/planner/refinement/versions/:versionId`
5. `PATCH /api/projects/:projectId/planner/config`

详细定义见：

1. `docs/specs/backend-data-api-spec-v0.2.md`
2. `docs/specs/explore-planner-backend-guidance-v0.2.md`
