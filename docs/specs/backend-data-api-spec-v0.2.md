# 外部接口规格（v0.2）

版本：v0.2  
日期：2026-03-09  
状态：现状基线 + 目标接口清单

## 1. 范围

定义 Web/客户端 <-> 后端接口，重点覆盖首页创建项目与策划页版本化流程。

## 2. 现状实现状态（仓库内）

当前仓库本地 `Next.js Route Handler` 仅实现：

1. `GET /api/studio/projects`
2. `POST /api/studio/projects`

实现文件：`apps/web/src/app/api/studio/projects/route.ts`。

其余接口当前由 `studio-service` 走“外部 API + mock fallback”模式：

1. `AIV_STUDIO_DATA_SOURCE=api`：只走外部 API
2. `AIV_STUDIO_DATA_SOURCE=hybrid`：外部 API 失败时回退 mock
3. `AIV_STUDIO_DATA_SOURCE=mock`：只走 mock

## 3. 已实现接口（当前可直接联调）

### 3.1 获取继续创作列表

`GET /api/studio/projects`

返回：`ContinueProjectCard[]`。

### 3.2 首页提交并创建项目

`POST /api/studio/projects`

请求：

```ts
interface CreateStudioProjectRequest {
  prompt: string;
  contentMode: 'single' | 'series';
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

## 4. 目标接口（v0.2 后端落地）

以下接口是 Explore/Planner 后端化的目标，不是当前仓库内已实现本地路由：

### 4.1 查询接口（Query）

1. `GET /api/studio/explore`
2. `GET /api/studio/projects/:projectId`
3. `GET /api/projects/:projectId/planner/workspace?episodeId=:episodeId`
4. `GET /api/projects/:projectId/planner/refinement/versions?episodeId=:episodeId`
5. `GET /api/projects/:projectId/planner/refinement/versions/:versionId`

### 4.2 命令接口（Command）

1. `POST /api/projects/:projectId/planner/submit`
- 统一提交语义：
  - 未确认大纲：`confirm_outline_and_start`
  - 已确认大纲：`rerun_refinement`

2. `POST /api/projects/:projectId/planner/refinement/versions/:versionId/activate`

3. `PATCH /api/projects/:projectId/planner/refinement/versions/:versionId`
- `replace_subject | replace_scene | replace_shot | delete_shot`

4. `PATCH /api/projects/:projectId/planner/config`

```ts
interface PatchPlannerConfigRequest {
  episodeId: string;
  storyboardModelId?: string;
  aspectRatio?: '16:9' | '9:16' | '4:3' | '3:4';
}
```

## 5. 响应与错误规范

1. 成功：`{ ok: true, data }`
2. 失败：`{ ok: false, error: { code, message, details? } }`

错误码详见：`docs/specs/state-machine-and-error-code-spec-v0.2.md`。

## 6. 联调环境变量（Web）

1. `AIV_API_BASE_URL`：后端基础地址，默认 `http://localhost:8787`
2. `AIV_API_TIMEOUT_MS`：请求超时（毫秒），默认 `10000`
3. `AIV_STUDIO_DATA_SOURCE`：`api | hybrid | mock`（默认 `hybrid`）

## 7. 关联文档

1. `docs/specs/explore-planner-backend-guidance-v0.2.md`
2. `docs/specs/database-schema-spec-v0.2.md`
