# OpenClaw 协议 Schema

版本：v0.1  
状态：协议草案  
适用范围：MVP
关联文档：
- `docs/specs/mvp-domain-model-spec-v0.1.md`
- `docs/specs/mvp-command-query-event-spec-v0.1.md`
- `docs/openclaw/openclaw-integration-spec-v0.1.md`
- `docs/specs/state-machine-and-error-code-spec-v0.1.md`
- `docs/architecture/system-architecture-role-spec-v0.1.md`

## 1. 文档目标

本文档将 OpenClaw / Worker 执行协议进一步工程化，给出一套适合实现的：

- TypeScript 类型草案
- JSON Schema 草案
- 请求 / 事件 / 完成 / 失败结构定义
- 节点与镜头输入输出扩展示例

目标是让以下角色对齐：

- 后端
- OpenClaw 适配层
- OpenClaw Agent Worker / System Worker 实现
- 前端日志与状态消费方

## 2. 设计目标

协议设计应满足：

- 结构化
- 可版本化
- 可重试
- 可扩展
- 可做运行时校验
- 不依赖隐式会话记忆
- 同时覆盖节点任务和镜头任务

## 3. 基础 TypeScript 类型

```ts
export type NodeType =
  | 'project_setup'
  | 'script_generation'
  | 'storyboard_generation'
  | 'character_design'
  | 'image_generation'
  | 'voice_subtitle_generation'
  | 'video_export'

export type RunKind = 'node' | 'shot' | 'publish'

export type RunEventType =
  | 'run.started'
  | 'run.log'
  | 'run.artifact'
  | 'run.warning'
  | 'run.completed'
  | 'run.failed'

export type LogLevel = 'info' | 'warning' | 'error'

export type AssetType =
  | 'project_context'
  | 'outline'
  | 'script'
  | 'storyboard'
  | 'character_sheet'
  | 'image_prompt'
  | 'character_image'
  | 'scene_image'
  | 'voice_audio'
  | 'subtitle'
  | 'final_video'
  | 'export_report'
```

## 4. 请求协议 TypeScript Interface

```ts
export interface ExecutionConstraint {
  timeoutSec?: number
  maxRetries?: number
  language?: string
  maxOutputLength?: number
  providerHints?: string[]
}

export interface UpstreamArtifactRef {
  assetId?: string
  assetType: AssetType
  uri: string
  version?: number
  mimeType?: string
  previewMeta?: Record<string, unknown>
}

export interface InputEnvelope<TPayload = Record<string, unknown>> {
  version: number
  payload: TPayload
}

export interface OutputSpec {
  assetTypes: AssetType[]
  requiresReview?: boolean
}

export interface ProjectContext {
  title: string
  genre?: string
  style?: string
  durationSec?: number
  language?: string
  contentMode?: 'single' | 'series'
  executionMode?: 'auto' | 'review_required'
}

export interface ExecutionRequest<TPayload = Record<string, unknown>> {
  projectId: string
  nodeId?: string
  shotId?: string
  runId: string
  runKind: RunKind
  nodeType?: NodeType
  sessionRef?: string
  projectContext: ProjectContext
  input: InputEnvelope<TPayload>
  upstreamArtifacts: UpstreamArtifactRef[]
  constraints?: ExecutionConstraint
  outputSpec: OutputSpec
}
```

## 5. 事件协议 TypeScript Interface

```ts
export interface BaseRunEvent<TPayload = Record<string, unknown>> {
  event: RunEventType
  projectId: string
  nodeId?: string
  shotId?: string
  runId: string
  timestamp: string
  payload: TPayload
}

export interface RunStartedPayload {
  message?: string
}

export interface RunLogPayload {
  level: LogLevel
  message: string
  step?: string
  details?: Record<string, unknown>
}

export interface RunArtifactPayload {
  assetType: AssetType
  uri: string
  version?: number
  mimeType?: string
  isFinal?: boolean
  previewMeta?: Record<string, unknown>
}

export interface RunWarningPayload {
  code: string
  message: string
  step?: string
  details?: Record<string, unknown>
}

export interface RunCompletedPayload {
  outputSummary: string
  requiresReview?: boolean
  finalArtifactVersion?: number
  outputMeta?: Record<string, unknown>
}

export interface AppErrorPayload {
  code: string
  message: string
  retryable: boolean
  domain: 'biz' | 'state' | 'input' | 'provider' | 'exec' | 'storage' | 'export'
  step?: string
  provider?: string
  details?: Record<string, unknown>
  rawRef?: string
}

export type RunStartedEvent = BaseRunEvent<RunStartedPayload> & {
  event: 'run.started'
}

export type RunLogEvent = BaseRunEvent<RunLogPayload> & {
  event: 'run.log'
}

export type RunArtifactEvent = BaseRunEvent<RunArtifactPayload> & {
  event: 'run.artifact'
}

export type RunWarningEvent = BaseRunEvent<RunWarningPayload> & {
  event: 'run.warning'
}

export type RunCompletedEvent = BaseRunEvent<RunCompletedPayload> & {
  event: 'run.completed'
}

export type RunFailedEvent = BaseRunEvent<AppErrorPayload> & {
  event: 'run.failed'
}

export type RunEvent =
  | RunStartedEvent
  | RunLogEvent
