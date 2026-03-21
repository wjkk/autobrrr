# 外部接口规格（v0.3）

版本：v0.3  
日期：2026-03-20  
状态：按 2026-03-20 当前代码复核后的现行接口清单

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

### 3.2 已冻结待实现的补充约束

以下规则尚未在当前代码中完整实现，但已作为下一轮首页入口与接口收口的固定约束：

1. 当用户在首页打开“多集”开关后，必须显式输入集数
2. 当 `contentMode = 'series'` 时，前端必须提交 `creationConfig.settings.episodeCount`
3. `episodeCount` 应为正整数，且最小值为 `2`
4. 当 `contentMode = 'single'` 时，`episodeCount` 应省略或视为 `1`

建议补充后的请求约束如下：

```ts
interface CreateProjectRequestVNext {
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
    settings?: {
      multiEpisode?: boolean;
      episodeCount?: number;
      [key: string]: unknown;
    };
  };
}
```

落地要求：

1. 前端在多集开关打开后，不允许跳过集数输入直接提交
2. 后端在 `contentMode = 'series'` 且缺少有效 `episodeCount` 时返回 `400`
3. 项目创建时应按 `episodeCount` 初始化 `episodes`

## 4. 目录与首页配置接口

### 4.1 主体 / 画风目录

1. `GET /api/explore/subjects`
2. `POST /api/explore/subjects`
3. `GET /api/explore/subjects/:itemId`
4. `PATCH /api/explore/subjects/:itemId`
5. `POST /api/explore/subjects/upload-image`
6. `POST /api/explore/subjects/generate-image`
7. `GET /api/explore/styles`
8. `POST /api/explore/styles`
9. `GET /api/explore/styles/:itemId`
10. `PATCH /api/explore/styles/:itemId`

说明：

1. 主体目录支持本地上传和 AI 生成封面图。
2. 目录支持 `PUBLIC / PERSONAL` 双可见性。

## 5. 模型目录与 Provider 配置接口

### 5.1 模型目录

1. `GET /api/model-endpoints`

### 5.2 用户 Provider 配置

1. `GET /api/provider-configs`
2. `GET /api/provider-configs/:providerCode`
3. `PUT /api/provider-configs/:providerCode`
4. `POST /api/provider-configs/:providerCode/sync-models`
5. `POST /api/provider-configs/:providerCode/test`

说明：

1. Provider 配置是**用户级**，不是系统级。
2. 用户可配置默认模型与启用模型列表。

## 6. Planner 主流程接口

1. `POST /api/projects/:projectId/planner/generate-doc`
2. `GET /api/projects/:projectId/planner/workspace`
3. `GET /api/projects/:projectId/planner/stream`
4. `POST /api/projects/:projectId/planner/finalize`
5. `POST /api/projects/:projectId/planner/outline-versions/:versionId/activate`
6. `POST /api/projects/:projectId/planner/outline-versions/:versionId/confirm`
7. `POST /api/projects/:projectId/planner/refinement-versions/:versionId/activate`
8. `POST /api/projects/:projectId/planner/refinement-versions/:versionId/create-draft`
9. `POST /api/projects/:projectId/planner/partial-rerun`
10. `PUT /api/projects/:projectId/planner/document`
11. `GET /api/projects/:projectId/planner/shot-prompts`

### 6.1 Planner 派生实体接口

1. `PATCH /api/projects/:projectId/planner/subjects/:subjectId`
2. `PUT /api/projects/:projectId/planner/subjects/:subjectId/assets`
3. `POST /api/projects/:projectId/planner/subjects/:subjectId/generate-image`
4. `GET /api/projects/:projectId/planner/subjects/:subjectId/recommendations`
5. `PATCH /api/projects/:projectId/planner/scenes/:sceneId`
6. `PUT /api/projects/:projectId/planner/scenes/:sceneId/assets`
7. `POST /api/projects/:projectId/planner/scenes/:sceneId/generate-image`
8. `GET /api/projects/:projectId/planner/scenes/:sceneId/recommendations`
9. `PATCH /api/projects/:projectId/planner/shot-scripts/:shotScriptId`
10. `DELETE /api/projects/:projectId/planner/shot-scripts/:shotScriptId`
11. `POST /api/projects/:projectId/planner/shot-scripts/:shotScriptId/generate-image`

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
6. `POST /api/planner/debug/runs/:id/apply`

说明：

1. Planner Debug 已是独立调试链路。
2. 主流程页面不直接暴露这些能力。

## 8. Creation 接口

### 8.1 Shot 与生成命令

1. `POST /api/projects/:projectId/shots/:shotId/generate-image`
2. `POST /api/projects/:projectId/shots/:shotId/generate-video`

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

1. `GET /api/planner/runs/:runId`
2. `GET /api/creation/runs/:runId`

说明：

1. 当前 web 外部接口没有暴露统一 `POST /api/runs/:runId/cancel` 入口。
2. 运行状态查询按 feature 路由分别暴露 planner / creation 别名，但后端仍共用 `Run` 账本。

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
2. 外部项目工作区路由已迁到按 feature 分组的 `/api/planner|creation|publish/projects/:projectId/*`。
3. `Planner` 当前不是单一 `/generate-doc + document` 模式，而是完整版本流转体系。

## 13. 下一阶段 API 重构建议

在不考虑兼容老数据和老业务的前提下，建议下一阶段：

1. route 只保留协议转换与校验
2. planner / catalog / provider / creation 分领域 service 化
3. 所有 AI 外部调用统一走 capability 层
4. 所有外部调用统一落 `external_api_call_logs`
