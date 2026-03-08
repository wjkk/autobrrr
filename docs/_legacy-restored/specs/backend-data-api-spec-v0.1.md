# 后端数据与 API 规格

版本：v0.1  
状态：实现规格  
适用范围：MVP
关联文档：
- `docs/specs/seko-baseline-gap-analysis-v0.1.md`
- `docs/specs/mvp-domain-model-spec-v0.1.md`
- `docs/specs/mvp-command-query-event-spec-v0.1.md`
- `docs/specs/state-machine-and-error-code-spec-v0.1.md`
- `docs/web/web-route-and-page-spec-v0.1.md`

## 1. 文档目标

本文档定义 MVP 阶段推荐采用的：

- 数据落表边界
- Web Studio 需要的查询接口
- Web / OpenClaw 共用的写操作入口
- 实时事件回推结构

本版已经按 Seko Explore -> Planner -> Creation -> Publish 主流程对齐。

## 2. API 设计原则

### 2.1 产品工作区优先

接口按真实工作区组织，而不是先暴露纯后台式节点接口：

- Project / Episode
- Planner
- Creation / Shot
- Publish
- Workspace 查询

### 2.2 命令与查询分离

- 写操作一律按 command 设计。
- 读操作按工作区聚合查询设计。
- Realtime 事件只做增量推送，不替代首屏查询。

### 2.3 页面首屏必须一次取够

进入 Explore / Planner / Creation / Publish 时，必须通过聚合接口拿到首屏所需核心数据，避免前端自行拼装过多接口。

## 3. 推荐数据分层

### 3.1 正式表

推荐正式持久化表：

- `projects`
- `episodes`
- `style_templates`
- `planner_sessions`
- `planner_steps`
- `planner_messages`
- `planner_references`
- `storyboard_drafts`
- `pipeline_nodes`
- `runs`
- `shots`
- `shot_versions`
- `shot_material_bindings`
- `assets`
- `review_records`
- `publish_drafts`
- `publish_records`
- `event_logs`

### 3.2 可先放 JSON 的扩展状态

为了先落 MVP，可暂以 JSON 方式存放：

- `Project.audioWorkspaceSnapshot`
- `Project.lipsyncWorkspaceSnapshot`
- `Run.inputPayload`
- `Run.outputPayload`
- `Asset.metadata`
- `PublishRecord.receiptPayload`

## 4. 核心查询接口

### 4.1 Explore 首页首屏

#### `GET /api/explore/home`

用途：渲染 `/explore` 首页（侧边栏、Hero 输入、工具浮层、灵感广场瀑布流）。

查询参数建议：

- `tab`：`短剧漫剧 | 音乐MV | 知识分享`
- `cursor`：灵感流分页游标（可选）
- `limit`：灵感流每页数量（可选）

必须返回：

- `viewer`：会员信息、头像、消息红点、可用积分
- `activeProject`：当前默认承接项目（用于“发布作品”与“发送灵感”跳转）
- `composer`：模式、占位文案、工具配置、默认选项
- `modelOptions`：主体图模型列表、画风列表、角色列表
- `presetTemplates`：各模式预设模板卡
- `inspirationFeed`：瀑布流卡片（含广告卡、作品卡、点赞计数）

说明：

- `/explore` 首屏要求单接口可渲染，避免前端多接口拼装。
- `activeProject` 不存在时，后续提交流程由命令接口自动创建项目。

### 4.2 项目列表

#### `GET /api/projects`

用途：Explore 中“继续创作”与项目列表检索。

查询参数建议：

- `keyword`
- `status`
- `contentMode`
- `updatedAfter`
- `cursor`
- `limit`

返回字段建议：

- `id`
- `title`
- `contentMode`
- `aspectRatio`
- `status`
- `coverUrl`
- `episodeCount`
- `currentEpisodeId`
- `updatedAt`

### 4.3 项目工作区总览

#### `GET /api/projects/:projectId/workspace`

用途：统一拉取当前项目在 Web Studio 的主要工作区摘要。

查询参数建议：

- `episodeId` 可选

必须返回：

- `project`
- `episodes`
- `currentEpisode`
- `plannerSummary`
- `creationSummary`
- `publishSummary`
- `historyWorks`
- `workspaceQuota`

说明：

- 这是 Web 首屏与 OpenClaw 状态解释的主查询。
- `historyWorks` 由已导出 / 已发布项目聚合而来。

### 4.4 Planner 页面首屏

#### `GET /api/projects/:projectId/planner`

查询参数建议：

- `episodeId`

必须返回：

- `project`
- `episodes`
- `currentEpisode`
- `plannerSession`
- `steps`
- `messages`
- `references`
- `storyboards`
- `styleContext`
- `pointCost`
- `workspaceQuota`

### 4.5 Creation 页面首屏

#### `GET /api/projects/:projectId/creation`

查询参数建议：

- `episodeId`

必须返回：

- `project`
- `episodes`
- `currentEpisode`
- `shots`
- `selectedShotId`
- `versionRail`
- `audioWorkspace`
- `lipsyncWorkspace`
- `batchSummary`
- `workspaceQuota`

### 4.6 Publish 页面首屏

#### `GET /api/projects/:projectId/publish`

查询参数建议：

- `episodeId`

必须返回：

- `project`
- `currentEpisode`
- `publishDraft`
- `publishRecords`
- `historyWorks`
- `finalVideo`

### 4.7 Shot 详情

#### `GET /api/projects/:projectId/shots/:shotId`

必须返回：

- `shot`
- `versions`
- `materials`
- `lastRun`
- `eventLogs`

### 4.8 运行历史

#### `GET /api/projects/:projectId/runs`

查询参数建议：

- `episodeId`
- `shotId`
- `runType`
- `status`
- `cursor`
- `limit`

### 4.9 Explore 资源字典（可缓存）

#### `GET /api/explore/dictionaries`

用途：提供低频变化字典，降低 `GET /api/explore/home` 体积与刷新压力。

建议返回：

- `composerTabs`
- `imageModels`
- `styleModels`
- `characterLibrary`
- `presetTemplateLibrary`

## 5. Project / Episode 命令接口

### 5.0 Explore 首页命令补充

### 5.0.1 提交灵感并进入策划

#### `POST /api/explore/compose/submit`

建议载荷：

```ts
interface ExploreComposeSubmitPayload {
  prompt: string
  tab: '短剧漫剧' | '音乐MV' | '知识分享'
  modelOptionId?: string
  imageModelId?: string
  characterIds?: string[]
  multiEpisode?: boolean
  attachmentAssetId?: string
}
```

返回：

- `projectId`
- `episodeId`
- `plannerSessionId`
- `redirectUrl`（`/projects/:projectId/planner?prompt=...`）

业务规则：

- `prompt` 为空直接返回 `400`。
- 如果调用方无 `activeProject`，由后端创建新 project + default episode。
- 将 Explore 输入参数写入 Planner 初始上下文，用于后续策划提示增强。

### 5.0.2 Explore 附件上传（可选）

#### `POST /api/explore/assets`

建议载荷：

- `multipart/form-data`
- `file`
- `kind`：`script | music`

返回：

- `assetId`
- `filename`
- `size`

说明：

- 对于大文件，也可改为“先拿签名 URL，再直传对象存储”。
- 上传完成后由前端触发 toast（`已准备上传: xxx`）。

### 5.1 创建项目

#### `POST /api/projects`
---
