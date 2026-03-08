# MVP 领域模型规格

版本：v0.1  
状态：实现规格  
适用范围：MVP
关联文档：
- `docs/specs/seko-baseline-gap-analysis-v0.1.md`
- `docs/specs/backend-data-api-spec-v0.1.md`
- `docs/specs/mvp-command-query-event-spec-v0.1.md`
- `docs/specs/state-machine-and-error-code-spec-v0.1.md`
- `docs/architecture/system-architecture-role-spec-v0.1.md`

## 1. 文档目标

本文档用于把 MVP 的正式业务对象定义到可直接编码的粒度，统一：

- 数据库 schema
- 后端 service / DTO
- Web Studio 状态查询结构
- OpenClaw 调用边界

本次版本已经按本地 Seko 原型完成基线校准，不再沿用“单项目 / 单剧集优先”的旧假设。

## 2. 建模原则

### 2.1 产品对象优先于抽象对象

编码时优先围绕以下产品原生对象建模：

- `Project`
- `Episode`
- `PlannerSession`
- `PlannerReference`
- `StoryboardDraft`
- `Shot`
- `ShotVersion`
- `ShotMaterialBinding`
- `PublishDraft`
- `PublishRecord`

`PipelineNode` 与 `Run` 继续保留，但它们属于编排与执行层对象，不取代产品工作区对象。

### 2.2 多剧集是正式能力，不是未来增强

- `single` 只是 `Episode` 数量为 1 的特例。
- `series` 代表 `Project` 下存在多个可排序、可复制、可删除的 `Episode`。

### 2.3 内容模式和执行模式必须拆分

正式模型中必须同时存在：

- `contentMode = single | series`
- `executionMode = auto | review_required`

### 2.4 Planner 和 Creation 的可编辑结果都要持久化

以下对象不能视为临时 UI 状态：

- Planner step
- Planner message
- Planner reference
- Storyboard draft
- Shot 当前参数
- Shot 版本
- Shot 素材栈
- Publish draft

### 2.5 二进制文件与业务关系分离

- 文件本体统一为 `Asset`
- 谁在使用该文件，由上层业务对象关系表达
- 不把业务状态直接塞进 `Asset`

## 3. 规范化对象清单

MVP 正式业务对象如下：

- `Project`
- `Episode`
- `StyleTemplate`
- `PlannerSession`
- `PlannerStep`
- `PlannerMessage`
- `PlannerReference`
- `StoryboardDraft`
- `PipelineNode`
- `Run`
- `Shot`
- `ShotVersion`
- `ShotMaterialBinding`
- `Asset`
- `ReviewRecord`
- `PublishDraft`
- `PublishRecord`
- `EventLog`

## 4. 领域对象定义

### 4.1 Project

用途：项目主对象，代表一条完整的漫剧 / 视频生产链路。

建议字段：

- `id`
- `title`
- `brief`
- `contentMode`
- `executionMode`
- `aspectRatio`
- `globalStyleTemplateId`
- `status`
- `currentEpisodeId`
- `currentNodeId`
- `coverAssetId`
- `audioWorkspaceSnapshot`
- `lipsyncWorkspaceSnapshot`
- `createdById`
- `createdAt`
- `updatedAt`
- `archivedAt`

关键说明：

- `brief` 保存项目级需求摘要，不等于聊天原文全量日志。
- `audioWorkspaceSnapshot` 用于第一阶段承载配音 / 音乐工作区的持久草稿。
- `lipsyncWorkspaceSnapshot` 用于第一阶段承载对口型工作区的持久草稿。
- `currentEpisodeId` 用于页面默认落点。
- `currentNodeId` 用于编排层状态汇总，不作为产品主主键使用。

### 4.2 Episode

用途：项目中的剧集单元；单片模式下仍然保留一条 Episode。

建议字段：

- `id`
- `projectId`
- `sequence`
- `title`
- `summary`
- `styleTemplateId`
- `status`
- `exportedAt`
- `publishedAt`
- `createdAt`
- `updatedAt`
- `archivedAt`

关键说明：

- `sequence` 用于支持剧集排序。
- `status` 代表当前集的生产状态，不取代 Shot 状态。
- 删除 Episode 时必须遵守“单片 / 至少保留一集”的产品规则，由应用层控制。

### 4.3 StyleTemplate

用途：风格中心中的正式模板对象。

建议字段：

- `id`
- `name`
- `category`
- `tone`
- `provider`
- `isSystemPreset`
- `createdAt`
- `updatedAt`

关键说明：

- 生效优先级固定为：`Shot.styleTemplateId > Episode.styleTemplateId > Project.globalStyleTemplateId`。
- 第一阶段支持系统模板即可，不要求完整的用户自建模板系统。

### 4.4 PlannerSession

用途：Planner 页面的一次正式策划会话。

建议字段：

- `id`
- `projectId`
- `episodeId`
- `submittedRequirement`
- `status`
- `docProgressPercent`
- `storyboardProgressPercent`
- `allowGenerate`
- `pointCost`
- `isActive`
- `startedAt`
- `finishedAt`
- `createdAt`
- `updatedAt`

关键说明：

- 每个 Episode 至少存在一个 active PlannerSession。
- “重置并更新文档”可以生成新的 PlannerSession，旧会话保留为历史。
- `allowGenerate` 是进入 Creation 前的正式门禁条件。

### 4.5 PlannerStep

用途：Planner 左侧多 Agent 时间线中的单步执行项。

建议字段：

- `id`
- `plannerSessionId`
- `sortOrder`
- `title`
- `status`
- `startedAt`
- `finishedAt`
- `createdAt`
- `updatedAt`

关键说明：

- 状态固定为 `waiting | running | done`。
- 该对象用于 Planner 的可视化进度，不应被简化成纯日志文本。

### 4.6 PlannerMessage

用途：Planner 左侧消息区中的正式消息。

建议字段：

- `id`
- `plannerSessionId`
- `role`
- `content`
- `createdAt`
- `updatedAt`

关键说明：

- `role` 至少支持 `user | assistant | system`。
- 这些消息是“策划过程”的一部分，不建议只放在 EventLog 中。

### 4.7 PlannerReference

用途：Planner 中主体参考图卡片。

建议字段：

- `id`
- `plannerSessionId`
- `sortOrder`
- `title`
- `prompt`
- `modelId`
- `variantIndex`
- `previewAssetId`
- `createdAt`
- `updatedAt`
- `deletedAt`

关键说明：
---
