# 状态机与错误码规范

版本：v0.1  
状态：实现规格  
适用范围：MVP
关联文档：
- `docs/specs/seko-baseline-gap-analysis-v0.1.md`
- `docs/specs/mvp-domain-model-spec-v0.1.md`
- `docs/specs/backend-data-api-spec-v0.1.md`
- `docs/specs/mvp-command-query-event-spec-v0.1.md`
- `docs/openclaw/openclaw-integration-spec-v0.1.md`

## 1. 文档目标

本文档用于统一 MVP 阶段的：

- 项目、剧集、Planner、Shot、Version、Run、Publish 状态枚举
- 核心状态流转规则
- 高优先级错误码与前端 / OpenClaw 展示语义

本版已按 Seko Explore -> Planner -> Creation -> Publish 主流程校准。

## 2. 枚举清单

### 2.1 内容模式

```ts
export enum ProjectContentMode {
  SINGLE = 'single',
  SERIES = 'series'
}
```

### 2.2 执行模式

```ts
export enum ExecutionMode {
  AUTO = 'auto',
  REVIEW_REQUIRED = 'review_required'
}
```

### 2.3 项目状态

```ts
export enum ProjectStatus {
  DRAFT = 'draft',
  PLANNING = 'planning',
  READY_FOR_STORYBOARD = 'ready_for_storyboard',
  CREATING = 'creating',
  EXPORT_READY = 'export_ready',
  EXPORTED = 'exported',
  PUBLISHED = 'published',
  FAILED = 'failed',
  ARCHIVED = 'archived'
}
```

### 2.4 剧集状态

```ts
export enum EpisodeStatus {
  DRAFT = 'draft',
  PLANNING = 'planning',
  READY_FOR_STORYBOARD = 'ready_for_storyboard',
  CREATING = 'creating',
  EXPORT_READY = 'export_ready',
  EXPORTED = 'exported',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}
```

### 2.5 Planner 状态

```ts
export enum PlannerStatus {
  IDLE = 'idle',
  UPDATING = 'updating',
  READY = 'ready'
}
```

### 2.6 Planner Step 状态

```ts
export enum PlannerStepStatus {
  WAITING = 'waiting',
  RUNNING = 'running',
  DONE = 'done'
}
```

### 2.7 编排节点类型

```ts
export enum NodeType {
  PLANNER_DOC = 'planner_doc',
  STORYBOARD_GENERATION = 'storyboard_generation',
  SHOT_RENDER = 'shot_render',
  AUDIO_WORKSPACE = 'audio_workspace',
  EXPORT = 'export',
  PUBLISH = 'publish'
}
```

### 2.8 编排节点状态

```ts
export enum NodeStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  READY = 'ready',
  FAILED = 'failed',
  WAITING_INPUT = 'waiting_input'
}
```

### 2.9 Run 类型

```ts
export enum RunType {
  PLANNER_DOC_UPDATE = 'planner_doc_update',
  STORYBOARD_GENERATION = 'storyboard_generation',
  SHOT_RENDER = 'shot_render',
  MUSIC_GENERATION = 'music_generation',
  LIPSYNC_GENERATION = 'lipsync_generation',
  EXPORT = 'export',
  PUBLISH = 'publish'
}
```

### 2.10 Run 状态

```ts
export enum RunStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  TIMED_OUT = 'timed_out'
}
```

### 2.11 Shot 状态

```ts
export enum ShotStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  GENERATING = 'generating',
  SUCCESS = 'success',
  FAILED = 'failed'
}
```

### 2.12 ShotVersion 状态

```ts
export enum ShotVersionStatus {
  PENDING_APPLY = 'pending_apply',
  ACTIVE = 'active',
  ARCHIVED = 'archived'
}
```

### 2.13 素材来源

```ts
export enum ShotMaterialSource {
  UPLOAD = 'upload',
  HISTORY = 'history',
  LEGACY = 'legacy'
}
```

### 2.14 PublishDraft 状态

```ts
export enum PublishDraftStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FAILED = 'failed'
}
```

### 2.15 PublishRecord 状态

```ts
export enum PublishStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled'
}
```

### 2.16 Review 动作

```ts
export enum ReviewAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  EDIT_AND_CONTINUE = 'edit_and_continue',
  RETRY = 'retry',
  RESET = 'reset',
  APPLY_VERSION = 'apply_version'
}
```

## 3. 状态语义

### 3.1 PlannerStatus

- `idle`：尚未提交需求，或当前会话还未启动更新。
- `updating`：多 Agent 步骤执行中。
- `ready`：文档已收敛，允许生成分镜。

### 3.2 ShotStatus

- `pending`：镜头待生成，尚未提交任务。
- `queued`：已进入队列。
- `generating`：执行中。
- `success`：当前至少有一个可用版本。
- `failed`：最近一次生成失败，需要重试或重置。

### 3.3 ShotVersionStatus

- `pending_apply`：已生成，但尚未替换正式版本。
- `active`：当前正式生效版本。
- `archived`：历史版本。

### 3.4 PublishDraftStatus

- `draft`：正在编辑，尚未提交。
- `submitted`：已提交，等待平台回执 / 审核结果。
- `approved`：发布链路通过。
- `rejected`：审核拒绝。
- `failed`：提交或后续链路失败。

## 4. 核心状态机

### 4.1 项目主状态流

```text
DRAFT -> PLANNING
PLANNING -> READY_FOR_STORYBOARD
READY_FOR_STORYBOARD -> CREATING
CREATING -> EXPORT_READY
EXPORT_READY -> EXPORTED
EXPORTED -> PUBLISHED
PLANNING -> FAILED
CREATING -> FAILED
EXPORTED -> ARCHIVED
PUBLISHED -> ARCHIVED
```

说明：

- `DRAFT -> PLANNING`：创建项目并提交 Planner 需求。
- `PLANNING -> READY_FOR_STORYBOARD`：Planner ready。
- `READY_FOR_STORYBOARD -> CREATING`：生成分镜并进入 Creation。
- `CREATING -> EXPORT_READY`：当前 Episode 所有 Shot 达到可导出条件。
- `EXPORT_READY -> EXPORTED`：导出成功。
- `EXPORTED -> PUBLISHED`：发布成功。

### 4.2 Planner 状态流

```text
IDLE -> UPDATING
UPDATING -> READY
READY -> UPDATING
```

说明：



===== OUTPUT SPLIT =====

Plan updated

===== OUTPUT SPLIT =====

Chunk ID: c56e6e
Wall time: 0.0517 seconds
Process exited with code 0
Original token count: 266
Output:
docs/.DS_Store
docs/architecture/feasibility-and-tech-selection-v0.1.md
docs/architecture/n8n-adoption-decision-v0.1.md
docs/architecture/system-architecture-role-spec-v0.1.md
docs/index/master-index-v0.1.md
docs/openclaw/openclaw-contract-spec-v0.1.md
docs/openclaw/openclaw-integration-spec-v0.1.md
docs/openclaw/openclaw-protocol-schema-v0.1.md
docs/product/mvp-prd-v0.2.md
docs/product/mvp-roadmap-v0.1.md
docs/product/reference-compliance-boundary-v0.1.md
docs/specs/backend-data-api-spec-v0.1.md
docs/specs/mvp-command-query-event-spec-v0.1.md
docs/specs/mvp-domain-model-spec-v0.1.md
docs/specs/mvp-mock-data-and-fixtures-spec-v0.1.md
docs/specs/seko-baseline-gap-analysis-v0.1.md
docs/specs/state-machine-and-error-code-spec-v0.1.md
docs/web/brand-replacement-table-v0.1.md
docs/web/console-spec-v0.1.md
docs/web/copy-replacement-table-v0.1.md
docs/web/frontend-bootstrap-and-resource-plan-v0.1.md
docs/web/frontend-compliance-implementation-checklist-v0.1.md
docs/web/web-design-token-and-component-spec-v0.1.md
docs/web/web-route-and-page-spec-v0.1.md


===== OUTPUT SPLIT =====

Chunk ID: ce361c
Wall time: 0.0525 seconds
Process exited with code 0
Original token count: 0
Output:


===== OUTPUT SPLIT =====

Chunk ID: 40bc63
Wall time: 0.0535 seconds
Process exited with code 0
Original token count: 4092
Output:
docs/index/master-index-v0.2.md
docs/specs/backend-data-api-spec-v0.2.md
docs/specs/database-schema-spec-v0.2.md
docs/specs/frontend-domain-contract-spec-v0.2.md
docs/specs/internal-execution-api-spec-v0.2.md
docs/specs/state-machine-and-error-code-spec-v0.2.md
docs/web/web-route-and-page-spec-v0.2.md
---
