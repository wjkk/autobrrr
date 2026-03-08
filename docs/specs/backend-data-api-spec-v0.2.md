# 外部接口规格（v0.2）

版本：v0.2  
日期：2026-03-08  
状态：新接口基线（替代 mock service）

## 1. 范围

本文件定义外部接口：Web/客户端 <-> 后端。

## 2. 查询接口（Query）

### 2.1 首页聚合

`GET /api/studio/explore`

返回：`StudioFixture`（或 `StudioFixture` 的 Explore 裁剪版 + `project.id`）。

用途：替代 `fetchExploreStudio()`。

### 2.2 项目工作区聚合

`GET /api/studio/projects/:projectId`

返回：`StudioFixture`。

用途：替代 `fetchStudioProject(projectId)`，供 Planner/Creation/Publish 首屏渲染。

### 2.3 继续创作列表

`GET /api/studio/projects`

返回：`ContinueProjectCard[]`。

用途：替代 `fetchContinueProjects()`。

### 2.4 场景切换（调试/联调）

`GET /api/studio/scenarios/:scenarioId`

返回：`StudioFixture`。

用途：替代 `fetchStudioScenario(scenarioId)`。

## 3. 首页提交接口（Command）

### 3.1 提交首页灵感

`POST /api/explore/submit`

请求：

```ts
interface ExploreSubmitRequest {
  prompt: string;
  tab: '短剧漫剧' | '音乐MV' | '知识分享';
  multiEpisode?: boolean;
  selectedModel?: string;
  selectedImageModel?: string;
  selectedCharacter?: string;
  attachmentAssetId?: string;
}
```

响应：

```ts
interface ExploreSubmitResponse {
  projectId: string;
  redirectUrl: string; // /projects/:projectId/planner?prompt=...
}
```

## 4. Planner/Creation/Publish 命令接口（最小集）

### 4.1 Planner

- `POST /api/projects/:projectId/planner/submit-requirement`
- `POST /api/projects/:projectId/planner/generate-storyboards`
- `PATCH /api/projects/:projectId/planner/references/:referenceId`
- `PATCH /api/projects/:projectId/planner/storyboards/:storyboardId`

### 4.2 Creation

- `POST /api/projects/:projectId/creation/shots/:shotId/generate`
- `POST /api/projects/:projectId/creation/shots/batch-generate`
- `POST /api/projects/:projectId/creation/shots/:shotId/apply-version`
- `POST /api/projects/:projectId/creation/shots/:shotId/reset`
- `POST /api/projects/:projectId/creation/shots/:shotId/materials`

### 4.3 Publish

- `PATCH /api/projects/:projectId/publish/draft`
- `POST /api/projects/:projectId/publish/bind-history`
- `POST /api/projects/:projectId/publish/submit`

## 5. 响应规范

- 成功：`{ ok: true, data: ... }`
- 失败：`{ ok: false, error: { code, message, details? } }`
- 所有错误码使用 `docs/specs/state-machine-and-error-code-spec-v0.2.md`。

## 6. 迁移策略

第一阶段：保持前端页面不变，仅把服务层实现替换为同结构 HTTP 客户端。  
第二阶段：逐步去除首页硬编码选项，改由 `/api/studio/explore` 返回。

## 7. 联调环境变量（Web）

- `AIV_API_BASE_URL`：后端基础地址，默认 `http://localhost:8787`
- `AIV_API_TIMEOUT_MS`：请求超时（毫秒），默认 `10000`
