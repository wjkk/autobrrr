# 外部接口规格（v0.3）

版本：v0.3  
日期：2026-03-13  
状态：后端开工接口基线

当前阅读说明：

1. Planner 接口部分已在 2026-03-14 按现有代码主干更新。
2. 若涉及 Planner Agent / Debug / Outline-Refinement 双阶段，请同时参考：
   - `docs/specs/planner-agent-orchestration-spec-v0.1.md`
   - `docs/specs/planner-workflow-and-document-spec-v0.1.md`
   - `docs/reviews/planner-agent-doc-code-gap-review-2026-03-14.md`

## 1. 范围

定义 Web/客户端 <-> 后端 API，覆盖：

1. 用户注册与登录
2. 项目创建与工作区读取
3. Planner / Creation / Publish 命令
4. `Recipe / Run / Model Registry`

## 2. 通用约定

### 2.1 响应结构

```ts
type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: Record<string, unknown> } };
```

### 2.2 命令接口约定

长任务接口返回：

1. `runId`
2. `resourceId`
3. `acceptedAt`

### 2.3 查询接口约定

工作区查询返回聚合 DTO，不直接暴露数据库结构。

### 2.4 鉴权约定

1. 第一阶段采用账号密码注册与登录。
2. 登录态使用服务端 session + HttpOnly Cookie。
3. 除 `register / login` 外，其余业务接口默认要求登录。
4. 项目、剧集、任务、配方都必须按当前用户归属做访问控制。

## 3. 认证接口

### `POST /api/auth/register`

请求：

```ts
interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}
```

约束：

1. `email` 全局唯一
2. 密码只存 hash

### `POST /api/auth/login`

请求：

```ts
interface LoginRequest {
  email: string;
  password: string;
}
```

行为：

1. 校验账号密码
2. 创建 session
3. 下发 HttpOnly Cookie

### `POST /api/auth/logout`

行为：

1. 撤销当前 session
2. 清理 Cookie

### `GET /api/auth/me`

返回：

```ts
interface MeResponse {
  id: string;
  email: string;
  displayName: string | null;
}
```

## 4. 项目与工作区查询接口

### `GET /api/studio/projects`

用途：

1. 首页继续创作列表

### `POST /api/studio/projects`

请求：

```ts
interface CreateProjectRequest {
  prompt: string;
  contentMode: 'single' | 'series';
}
```

返回：

```ts
interface CreateProjectResponse {
  projectId: string;
  redirectUrl: string;
  project: {
    id: string;
    title: string;
    contentMode: 'single' | 'series';
    status: string;
  };
}
```

### `GET /api/studio/projects/:projectId`

用途：

1. 获取项目总览
2. 返回当前 episode 和阶段摘要

### `GET /api/projects/:projectId/planner/workspace`

请求参数：

1. `episodeId`

### `GET /api/projects/:projectId/creation/workspace`

请求参数：

1. `episodeId`

### `GET /api/projects/:projectId/publish/workspace`

请求参数：

1. `episodeId`

## 5. Planner 接口

### `POST /api/projects/:projectId/planner/generate-doc`

用途：

1. 若当前尚未确认大纲，则生成 `outline`
2. 若当前大纲已确认，则生成或更新 `refinement`
3. 所有结果都进入统一的 `Run + PlannerSession + Version` 闭环

请求：

```ts
interface PlannerGenerateDocRequest {
  episodeId: string;
  prompt?: string;
  subtype?: string;
  modelFamily?: string;
  modelEndpoint?: string;
  idempotencyKey?: string;
}
```

### `GET /api/projects/:projectId/planner/workspace`

用途：

1. 返回主流程 planner 所需聚合工作区
2. 同时包含 `plannerSession / messages / activeOutline / activeRefinement / version lists`

### `POST /api/projects/:projectId/planner/outline-versions/:versionId/activate`

用途：

1. 切换当前激活大纲版本
2. 在细化尚未开始前允许回切旧大纲

### `POST /api/projects/:projectId/planner/outline-versions/:versionId/confirm`

用途：

1. 确认某个大纲版本
2. 使 plannerSession 进入可细化状态

### `POST /api/projects/:projectId/planner/refinement-versions/:versionId/activate`

用途：

1. 切换当前激活细化版本
2. 让右侧文档与派生实体同步到指定 refinement 版本

### `POST /api/projects/:projectId/planner/partial-rerun`

用途：

1. 对 `subject / scene / shots` 做局部重跑
2. 在不重做整篇 refinement 的前提下，重算局部结构化结果

请求：

```ts
interface PlannerPartialRerunRequest {
  episodeId: string;
  scope: 'subject_only' | 'scene_only' | 'shots_only';
  targetId: string;
  prompt?: string;
  modelFamily?: string;
  modelEndpoint?: string;
  idempotencyKey?: string;
}
```

### `PUT /api/projects/:projectId/planner/document`

用途：

1. 人工回写当前 refinement 文档
2. 将编辑结果固化为新的 refinement version

## 6. Creation 接口

### `POST /api/shots/:shotId/generate-image`

请求：

```ts
interface GenerateImageRequest {
  prompt?: string;
  model: {
    familyId: string;
    policy: 'preferOfficial' | 'preferLowestCost' | 'preferFastest' | 'forceEndpointId';
    endpointId?: string;
  };
  materials?: Array<{ assetId: string; slotName?: string }>;
  idempotencyKey?: string;
}
```

### `POST /api/shots/:shotId/generate-video`

请求：

```ts
interface GenerateVideoRequest {
  prompt?: string;
  model: {
    familyId: string;
    policy: 'preferOfficial' | 'preferLowestCost' | 'preferFastest' | 'forceEndpointId';
    endpointId?: string;
  };
  startFrameAssetId?: string;
  endFrameAssetId?: string;
  idempotencyKey?: string;
}
```

### `POST /api/shots/:shotId/materials`

用途：

1. 绑定已有素材
2. 或返回直传参数后再回写绑定关系

### `POST /api/shots/:shotId/versions/:versionId/apply`

用途：

1. 使指定版本成为 active version

### `POST /api/shots/:shotId/canvas-edits`

用途：

1. 保存画布编辑命令
2. 若需要生成则返回 `runId`

### `POST /api/projects/:projectId/voice/upload`

用途：

1. 上传或绑定配音音频

### `POST /api/projects/:projectId/music/generate`

用途：

1. 创建音乐生成任务

### `POST /api/shots/:shotId/lipsync`

用途：

1. 创建对口型任务

## 7. Recipe 接口

### `POST /api/recipes`

用途：

1. 从项目 / episode / run 生成 recipe

### `GET /api/recipes/:recipeId`

用途：

1. 读取 recipe 定义

### `POST /api/recipes/:recipeId/export-json`

用途：

1. 导出 recipe JSON

### `POST /api/recipes/import-json`

用途：

1. 导入 recipe JSON

### `POST /api/recipes/:recipeId/execute`

用途：

1. 触发类似视频一键复用生成

请求：

```ts
interface ExecuteRecipeRequest {
  targetProjectId?: string;
  targetEpisodeId?: string;
  inputs: Array<{ slotName: string; assetId: string }>;
  overrides?: {
    title?: string;
    modelPolicies?: Record<string, { policy: string; endpointId?: string }>;
  };
  idempotencyKey?: string;
}
```

## 8. Model Registry 接口

### `GET /api/model-families`

### `GET /api/model-endpoints`

支持过滤：

1. `familyId`
2. `providerId`
3. `kind`
4. `status`

### `POST /api/model-resolution/resolve`

用途：

1. 调试或预解析模型策略

## 9. Run 接口

### `GET /api/runs/:runId`

返回：

1. `runType`
2. `status`
3. `progressPercent`
4. `resourceType`
5. `resourceId`
6. `error`
7. `outputSummary`

### `POST /api/runs/:runId/cancel`

### `POST /api/runs/:runId/retry`

## 10. 上传建议

大文件建议采用两段式：

1. `POST /api/assets/upload-prepare`
2. 客户端直传对象存储
3. `POST /api/assets/complete`

## 11. 联调顺序

建议先打通：

1. `POST /api/auth/register`
2. `POST /api/auth/login`
3. `POST /api/studio/projects`
4. `GET /api/projects/:projectId/planner/workspace`
5. `GET /api/projects/:projectId/creation/workspace`
6. `POST /api/shots/:shotId/generate-image`
7. `POST /api/shots/:shotId/generate-video`
8. `GET /api/runs/:runId`

## 12. 关联文档

1. `docs/specs/backend-system-design-spec-v0.3.md`
2. `docs/specs/database-schema-spec-v0.3.md`
3. `docs/specs/state-machine-and-error-code-spec-v0.3.md`
