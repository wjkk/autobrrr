# 外部接口规格（v0.3）

版本：v0.3  
日期：2026-03-15  
状态：按当前代码重写后的现行接口清单

## 1. 通用约定

### 1.1 响应结构

当前业务接口统一使用：

```ts
type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };
```

### 1.2 鉴权

除内部 callback 外，业务接口默认要求登录。

当前鉴权方式：

1. 账号密码注册与登录
2. session + HttpOnly Cookie

## 2. 认证接口

1. `POST /api/auth/register`
2. `POST /api/auth/login`
3. `POST /api/auth/logout`
4. `GET /api/auth/me`

## 3. 首页与项目入口接口

### 3.1 Studio Project

1. `GET /api/studio/projects`
2. `POST /api/studio/projects`
3. `GET /api/studio/projects/:projectId`

当前 `POST /api/studio/projects` 已支持：

```ts
interface CreateProjectRequest {
  prompt: string;
  contentMode: 'single' | 'series';
  creationConfig?: {
    selectedTab?: '短剧漫剧' | '音乐MV' | '知识分享';
    selectedSubtype?: string;
    scriptSourceName?: string;
    scriptContent?: string;
    imageModelEndpointSlug?: string;
    subjectProfileSlug?: string;
    stylePresetSlug?: string;
    settings?: Record<string, unknown>;
  };
}
```

## 4. 目录与首页配置接口

### 4.1 主体 / 画风目录

1. `GET /api/explore/subjects`
2. `POST /api/explore/subjects`
3. `PATCH /api/explore/subjects/:itemId`
4. `POST /api/explore/subjects/generate-image`
5. `GET /api/explore/styles`
6. `POST /api/explore/styles`
7. `PATCH /api/explore/styles/:itemId`

说明：

1. 主体目录支持本地上传和 AI 生成封面图。
2. 目录支持 `PUBLIC / PERSONAL` 双可见性。

## 5. 模型目录与 Provider 配置接口

### 5.1 模型目录

1. `GET /api/model-families`
2. `GET /api/model-endpoints`
3. `POST /api/model-resolution/resolve`

### 5.2 用户 Provider 配置

1. `GET /api/provider-configs`
2. `PUT /api/provider-configs/:providerCode`
3. `POST /api/provider-configs/:providerCode/sync-models`
4. `POST /api/provider-configs/:providerCode/test`

说明：

1. Provider 配置是**用户级**，不是系统级。
2. 用户可配置默认模型与启用模型列表。

## 6. Planner 主流程接口

1. `POST /api/projects/:projectId/planner/generate-doc`
2. `GET /api/projects/:projectId/planner/workspace`
3. `POST /api/projects/:projectId/planner/outline-versions/:versionId/activate`
4. `POST /api/projects/:projectId/planner/outline-versions/:versionId/confirm`
5. `POST /api/projects/:projectId/planner/refinement-versions/:versionId/activate`
6. `POST /api/projects/:projectId/planner/partial-rerun`
7. `PUT /api/projects/:projectId/planner/document`

### 6.1 Planner 派生实体接口

1. `PATCH /api/projects/:projectId/planner/subjects/:subjectId`
2. `PUT /api/projects/:projectId/planner/subjects/:subjectId/assets`
3. `POST /api/projects/:projectId/planner/subjects/:subjectId/generate-image`
4. `PATCH /api/projects/:projectId/planner/scenes/:sceneId`
5. `PUT /api/projects/:projectId/planner/scenes/:sceneId/assets`
6. `POST /api/projects/:projectId/planner/scenes/:sceneId/generate-image`
7. `PATCH /api/projects/:projectId/planner/shot-scripts/:shotScriptId`
8. `DELETE /api/projects/:projectId/planner/shot-scripts/:shotScriptId`
9. `POST /api/projects/:projectId/planner/shot-scripts/:shotScriptId/generate-image`

## 7. Planner Agent 管理与调试接口

### 7.1 Agent Profile

1. `GET /api/planner/agent-profiles`
2. `PATCH /api/planner/sub-agent-profiles/:id`
3. `GET /api/planner/sub-agent-profiles/:id/releases`
4. `POST /api/planner/sub-agent-profiles/:id/publish`

### 7.2 Debug

1. `GET /api/planner/debug/runs`
2. `GET /api/planner/debug/runs/:id`
3. `POST /api/planner/debug/runs/:id/replay`
4. `POST /api/planner/debug/run`
5. `POST /api/planner/debug/compare`

说明：

1. Planner Debug 已是独立调试链路。
2. 主流程页面不直接暴露这些能力。

## 8. Creation 接口

### 8.1 Shot 与生成命令

1. `POST /api/projects/:projectId/shots`
2. `POST /api/projects/:projectId/shots/:shotId/generate-image`
3. `POST /api/projects/:projectId/shots/:shotId/generate-video`

### 8.2 Creation Workspace

1. `GET /api/projects/:projectId/creation/workspace`

## 9. Publish 接口

1. `GET /api/projects/:projectId/publish/workspace`
2. `POST /api/projects/:projectId/publish/submit`

## 10. 资产与运行接口

### 10.1 资产

1. `GET /api/projects/:projectId/assets`
2. `POST /api/projects/:projectId/assets`

### 10.2 Run

1. `GET /api/runs/:runId`
2. `POST /api/runs/:runId/cancel`

## 11. 内部接口

1. `POST /api/internal/provider-callbacks/:callbackToken`

说明：

1. callback 只推进 `Run` 状态。
2. 真正业务回写仍由 lifecycle 服务统一完成。

## 12. 当前接口设计与旧文档的关键差异

### 12.1 当前已存在、旧文档缺失的接口

1. `/api/explore/subjects/generate-image`
2. `/api/planner/debug/*`
3. `/api/planner/sub-agent-profiles/*`
4. `/api/projects/:projectId/planner/subjects/:subjectId/generate-image`
5. `/api/projects/:projectId/planner/scenes/:sceneId/generate-image`
6. `/api/projects/:projectId/planner/shot-scripts/:shotScriptId/generate-image`

### 12.2 当前已变化的接口形态

1. `POST /api/studio/projects` 已支持 `creationConfig`，不能再按旧版简化接口理解。
2. `Planner` 当前不是单一 `/generate-doc + document` 模式，而是完整版本流转体系。

## 13. 下一阶段 API 重构建议

在不考虑兼容老数据和老业务的前提下，建议下一阶段：

1. route 只保留协议转换与校验
2. planner / catalog / provider / creation 分领域 service 化
3. 所有 AI 外部调用统一走 capability 层
4. 所有外部调用统一落 `external_api_call_logs`
