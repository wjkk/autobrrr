# 首页与策划页后端落地指导（v0.2）

版本：v0.2  
日期：2026-03-09  
状态：基于最新首页/策划页实现复盘

## 0. 实现状态说明

为避免“目标接口”被误读成“已上线接口”，本文约定：

1. 第 2 章描述当前前端与代码事实（已实现）。
2. 第 3-7 章描述后端落地目标（待实现/逐步实现）。
3. 当前仓库内本地 API 仅实现 `GET/POST /api/studio/projects`，其余由外部 API 或 mock fallback 承接。

## 1. 目的与范围

本文用于把当前前端实现（`/explore`、`/projects/:projectId/planner`）转成可执行的后端要求，覆盖：

1. 当前行为复盘（后端必须匹配）
2. 外部接口（Web/客户端 <-> Backend）
3. 内部接口（Backend <-> Worker）
4. 数据库建模与约束
5. 迁移与验收

不展开 Creation/Publish 全量规格，仅保留与 Explore/Planner 主链路耦合的字段与流程。

## 2. 当前代码事实（作为后端输入约束）

### 2.1 首页（Explore）

1. 提交行为是“先创建项目，再跳转策划页”：`POST create project -> /projects/:projectId/planner`。
2. 提交参数最小集是 `prompt + contentMode`，`contentMode` 来源于“短剧漫剧 + 多剧集开关”。
3. 前端不再依赖 `prompt query` 初始化策划页。

### 2.2 策划页（Planner）

1. 仅通过 `projectId` 拉取项目；不存在 query 注入。
2. `single/series` 模式来自 `project.contentMode`，策划页不可切换。
3. 右侧结果区初始为空（等待细化产出），确认后才逐步渲染。
4. 输入区是统一“提交”动作：
- 未确认大纲：提交应触发“确认并开始细化”
- 已确认大纲：提交应触发“新建细化版本（rerun）”
5. 历史按钮语义是“版本历史”，而非刷新。
6. 主体/场景/分镜编辑都作用于当前激活版本。
7. 分镜图模型与画面比例是独立配置项：
- 模型：独立下拉（非画风）
- 比例：默认 `16:9`，可选 `16:9 | 9:16 | 4:3 | 3:4`

## 3. 后端必须提供的能力

### 3.1 核心能力清单

1. 项目创建（写入 `contentMode` 且不可变）。
2. 策划工作区聚合查询（含版本状态、当前文档快照、可选项配置）。
3. 统一提交入口（兼容“首次确认”和“再次细化”两种语义）。
4. 细化版本历史查询与激活切换。
5. 版本内微调 Patch（主体/场景/分镜）。
6. 细化任务进度回传（步骤级 + 百分比 + 快照）。
7. 分镜模型/比例配置的持久化。

### 3.2 响应包裹规范

- 成功：`{ ok: true, data }`
- 失败：`{ ok: false, error: { code, message, details? } }`

## 4. 外部接口（Web <-> Backend）

## 4.1 创建项目

### `POST /api/studio/projects`

请求：

```ts
interface CreateStudioProjectRequest {
  prompt: string;
  contentMode: 'single' | 'series';
  tab?: '短剧漫剧' | '音乐MV' | '知识分享';
  selectedModel?: string;
  selectedImageModel?: string;
  selectedCharacter?: string;
  attachmentAssetId?: string;
}
```

响应：

```ts
interface CreateStudioProjectResponse {
  projectId: string;
  redirectUrl: string; // /projects/:projectId/planner
  project: {
    id: string;
    title: string;
    contentMode: 'single' | 'series';
    status: 'draft' | 'planning';
  };
}
```

规则：

1. `contentMode` 创建后不可修改。
2. `prompt` 为空返回 `PROMPT_REQUIRED`。
3. 建议支持幂等键（可选），避免重复点击产生脏项目。

## 4.2 策划工作区聚合查询

### `GET /api/projects/:projectId/planner/workspace?episodeId=:episodeId`

响应（建议）：

```ts
interface PlannerWorkspaceResponse {
  project: {
    id: string;
    title: string;
    brief: string;
    contentMode: 'single' | 'series';
  };
  episode: {
    id: string;
    sequence: number;
    title: string;
    status: string;
  };
  planner: {
    sessionId: string;
    submittedRequirement: string;
    outline: {
      latestOutlineVersionId: string | null;
      status: 'idle' | 'ready' | 'confirmed' | 'failed';
      snapshot: Record<string, unknown> | null;
    };
    refinement: {
      activeVersionId: string | null;
      latestVersionId: string | null;
      status: 'idle' | 'running' | 'ready' | 'failed';
      progressPercent: number;
      steps: Array<{
        code: string;
        title: string;
        status: 'waiting' | 'running' | 'done' | 'failed';
      }>;
    };
    activeDocSnapshot: PlannerDocSnapshot | null;
    generationConfig: {
      storyboardModelId: string;
      aspectRatio: '16:9' | '9:16' | '4:3' | '3:4';
      availableStoryboardModels: Array<{ id: string; name: string }>;
      availableAspectRatios: Array<'16:9' | '9:16' | '4:3' | '3:4'>;
    };
  };
}
```

## 4.3 统一提交（推荐）

### `POST /api/projects/:projectId/planner/submit`

用途：与当前输入框“单一提交按钮”语义一致。

请求：

```ts
interface PlannerSubmitRequest {
  episodeId: string;
  requirement: string;
}
```

响应：

```ts
interface PlannerSubmitResponse {
  action: 'confirm_outline_and_start' | 'rerun_refinement';
  outlineVersionId: string;
  refinementVersionId: string;
  status: 'running';
}
```

规则：

1. 若大纲未确认：本次提交执行“确认大纲 + 启动细化 v1”。
2. 若大纲已确认：本次提交执行“创建新细化版本（vN+1）”。
3. 每次 rerun 必须新建版本，不允许覆盖旧版本。

## 4.4 历史版本

### `GET /api/projects/:projectId/planner/refinement/versions?episodeId=:episodeId`

返回版本列表（倒序）+ 当前激活版本。

### `GET /api/projects/:projectId/planner/refinement/versions/:versionId`

返回指定版本的步骤状态与文档快照。

### `POST /api/projects/:projectId/planner/refinement/versions/:versionId/activate`

仅切换“当前查看版本”，不修改版本内容。

## 4.5 版本内微调

### `PATCH /api/projects/:projectId/planner/refinement/versions/:versionId`

请求：

```ts
interface PatchPlannerVersionRequest {
  operations: Array<
    | { op: 'replace_subject'; subjectId: string; payload: { title?: string; prompt?: string; image?: string } }
    | { op: 'replace_scene'; sceneId: string; payload: { title?: string; prompt?: string; image?: string } }
    | { op: 'replace_shot'; actId: string; shotId: string; payload: { visual?: string; composition?: string; motion?: string; line?: string } }
    | { op: 'delete_shot'; actId: string; shotId: string }
  >;
}
```

规则：

1. Patch 只作用于目标版本。
2. 写入操作日志（用于审计、回放和问题定位）。

## 4.6 分镜配置（模型/比例）

### `PATCH /api/projects/:projectId/planner/config`

请求：

```ts
interface PatchPlannerConfigRequest {
  episodeId: string;
  storyboardModelId?: string;
  aspectRatio?: '16:9' | '9:16' | '4:3' | '3:4';
}
```

返回最新配置，并在后续“生成分镜”默认带入。

## 5. 内部接口（Backend <-> Worker）

### 5.1 任务类型

1. `planner_outline_generate`
2. `planner_refinement_generate`

### 5.2 任务下发

### `POST /internal/planner/jobs`

```ts
interface InternalPlannerJobRequest {
  jobType: 'planner_outline_generate' | 'planner_refinement_generate';
  projectId: string;
  episodeId: string;
  plannerSessionId: string;
  outlineVersionId?: string;
  refinementVersionId?: string;
  payload: Record<string, unknown>;
}
```

### 5.3 进度回传

### `POST /internal/planner/jobs/:jobId/progress`

```ts
interface InternalPlannerJobProgressRequest {
  status: 'running' | 'ready' | 'failed';
  stepCode?: string;
  stepStatus?: 'waiting' | 'running' | 'done' | 'failed';
  progressPercent?: number; // 0-100
  partialDocSnapshot?: PlannerDocSnapshot;
  errorCode?: string;
  errorMessage?: string;
}
```

## 6. 数据库设计要求

### 6.1 可复用

1. `Project`
2. `Episode`
3. `PlannerSession`

### 6.2 必需新增

1. `PlannerOutlineVersion`
- 记录大纲版本、确认状态、快照

2. `PlannerRefinementVersion`
- 记录细化版本（不可变历史）
- 字段建议：`versionNumber`、`triggerType`、`instruction`、`status`、`progressPercent`、`docSnapshot`、`isActive`

3. `PlannerRefinementStep`
- 记录步骤进度（summary/style/subjects/scenes/script）

4. `PlannerGenerationConfig`
- 建议按 `(projectId, episodeId)` 存储
- 字段：`storyboardModelId`、`aspectRatio`

5. `PlannerVersionOperationLog`（建议）
- 记录版本内编辑行为

### 6.3 约束与索引

约束：

1. `Project.contentMode` 禁止更新（服务层 + DB 约束/触发器双保险）。
2. `(plannerSessionId, versionNumber)` 在 outline/refinement 表唯一。
3. 同一 `plannerSessionId` 仅一个 `refinementVersion.isActive = true`。
4. `progressPercent` 范围约束 `0..100`。

索引：

1. `planner_refinement_versions(project_id, episode_id, created_at desc)`
2. `planner_refinement_versions(planner_session_id, is_active)`
3. `planner_refinement_steps(refinement_version_id, step_order)`
4. `planner_version_operation_logs(refinement_version_id, created_at)`
5. `planner_generation_configs(project_id, episode_id)`

### 6.4 枚举一致性要求

当前前端策划页比例已使用：`16:9 | 9:16 | 4:3 | 3:4`。

后端/领域模型需统一这一枚举；如果继续保留 `1:1`，需明确仅用于 Creation 历史兼容，不得作为 Planner 默认配置。

## 7. 状态机（Explore + Planner）

1. `Project`: `DRAFT -> PLANNING -> READY_FOR_STORYBOARD`
2. `OutlineVersion`: `GENERATING -> READY -> CONFIRMED`（失败分支：`FAILED`）
3. `RefinementVersion`: `RUNNING -> READY`（失败分支：`FAILED`）
4. rerun：`READY(vN) -> RUNNING(vN+1)`，`vN` 保持只读

## 8. 迁移建议

第 1 阶段（最小闭环）：

1. 打通 `POST /api/studio/projects` + `GET workspace`
2. 打通 `POST /planner/submit`
3. 打通版本列表/版本详情

第 2 阶段（可编辑）：

1. 打通版本 Patch
2. 打通配置 Patch（模型/比例）
3. 接入 worker 进度回传

## 9. 验收清单（后端视角）

1. 首页提交跳转 URL 不含 prompt query。
2. `contentMode` 创建后无法更改。
3. 策划页首次进入 `activeDocSnapshot = null` 时可正常展示空态。
4. 首次提交返回 `confirm_outline_and_start` 并生成 v1。
5. 再次提交返回 `rerun_refinement` 并生成 v2/v3...。
6. 历史列表可查到全部版本，切换版本不改写历史。
7. 主体/场景/分镜 Patch 后仅影响目标版本。
8. 模型/比例配置可持久化并在后续生成中生效。

## 10. 实施排期清单

具体实施顺序与 DoD 请直接使用：

1. `docs/specs/backend-implementation-checklist-v0.2.md`
