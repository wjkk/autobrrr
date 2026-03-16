# 后端复盘与重规划规格（v0.3）

版本：v0.3  
日期：2026-03-13  
状态：专项草案（保留历史决策背景，不作为当前数据库与接口实现裁决依据）

> ⚠️ 本文保留了“后端正式开工前”的历史判断。
>
> 其中涉及以下内容时，必须以新文档覆盖为准：
>
> 1. 数据库真相源：只认 `apps/api/prisma/schema.prisma`
> 2. 当前接口形态：只认 `docs/specs/backend-data-api-spec-v0.3.md`
> 3. 当前执行链路：只认 `docs/specs/internal-execution-api-spec-v0.3.md`
> 4. 当前重构顺序：只认 `docs/specs/backend-implementation-checklist-v0.3.md`

## 1. 目标

本文件用于固化当前后端设计复盘结果，并记录后续实现必须遵守的新要求。

本次重规划重点解决三类问题：

1. 当前代码中的产品模型、前端状态机、数据库设计三者脱节。
2. 团队已明确数据库改为 `MySQL`，原有若干 PostgreSQL 风格约束需要调整。
3. 产品新增“类似视频一键复用生成”与“模型官方/第三方来源区分”能力，现有模型与运行记录设计不足以支撑。

## 2. 当前现状复盘

### 2.1 当前仓库中的真实状态

当前仓库具备以下三个层次，但尚未打通为一个真实后端系统：

1. 前端页面与本地状态机
2. 领域模型与 mock fixture
3. Prisma schema 设计稿

代码真相源：

1. `apps/web/src/lib/studio-service.ts`
2. `apps/web/src/app/api/studio/projects/route.ts`
3. `apps/web/src/features/creation/lib/creation-state.ts`
4. `apps/web/src/features/creation/lib/use-creation-workspace.ts`
5. `packages/domain/src/*.ts`
6. `packages/mock-data/src/fixtures/studio-fixtures.ts`
7. `prisma/schema.prisma`

### 2.2 当前主要断层

#### 2.2.1 API 面严重不足

当前仓库内本地 Route Handler 仅实现：

1. `GET /api/studio/projects`
2. `POST /api/studio/projects`

而前端 `studio-service` 已经按更完整的后端能力设计，期望存在：

1. `GET /api/studio/explore`
2. `GET /api/studio/projects/:projectId`
3. `GET /api/studio/scenarios/:scenarioId`
4. 后续 Planner / Creation / Publish 工作区接口

这说明前端服务契约已经超前于实际后端实现。

#### 2.2.2 业务真相仍在前端

Creation 页里的大部分关键业务行为仍在前端 reducer / hook 内直接完成，例如：

1. 生成版本
2. 应用版本
3. 素材绑定
4. 画布编辑结果回写
5. 音乐 / 配音 / 对口型工作区状态更新
6. 导出提示与发布前准备

这意味着当前页面的“业务状态”不可持久化、不可审计、不可多端同步，也无法支持真实异步任务回放。

#### 2.2.3 数据库模型超前于运行系统

`prisma/schema.prisma` 已经建模了：

1. `Project / Episode`
2. `PlannerSession`
3. `Shot / ShotVersion / Asset`
4. `Run / PipelineNode / EventLog`
5. `PublishDraft / PublishRecord`

但当前缺少：

1. migration
2. Prisma Client 接入
3. repository / service 层
4. job queue / worker
5. 与页面联动的真实 API

#### 2.2.4 异步任务层缺位

当前产品本质是“长任务编排系统”，但还没有真实的：

1. 任务创建
2. 任务轮询
3. 任务取消 / 重试
4. provider 回调
5. 统一运行账本

## 3. 本次明确新增的业务要求

### 3.1 数据库使用 MySQL

原因：团队更熟悉，实施成本更低。

这会直接影响以下设计策略：

1. 不依赖 PostgreSQL partial unique index 实现“单一 active 记录”。
2. 关键“当前生效对象”改为挂在主表显式外键字段上。
3. 长任务状态流转靠应用层与任务账本控制，不依赖数据库高级特性。

### 3.2 新增“类似视频一键复用生成”

功能要求：

1. 用户点击后，只需提交自己的素材。
2. 后续模型、提示词、流程、参数、工作流配置都可复用原记录。
3. 复用配置必须可一键导出为 JSON。

这意味着系统不能只保存“运行结果”，还必须保存“可复用的生成配方”。

### 3.3 同一模型需要区分官方与第三方来源

功能要求：

1. 同一逻辑模型可能存在官方接入与第三方中转接入。
2. 运行记录必须能区分本次到底走了哪一个 provider / endpoint。
3. 历史复现、成本核算、回归排障、配方复用都必须保留这一层信息。

结论：不能只存一个简单的 `modelId`。

## 4. 新基线架构决策

### 4.1 架构形态

第一阶段采用“模块化单体 + 独立 worker”，不一开始拆成多服务。

建议目录目标：

1. `apps/web`：前端
2. `apps/api`：后端 API
3. `packages/domain`：领域类型与共享契约
4. `packages/db` 或 `apps/api/src/db`：Prisma 与仓储
5. `apps/worker`：异步任务执行器

### 4.2 运行时组件

基础组件建议：

1. `MySQL`
2. `Redis`
3. `Object Storage`（S3 兼容）
4. `API Server`
5. `Worker`

### 4.3 责任边界

#### API Server

职责：

1. 查询工作区聚合数据
2. 接收命令
3. 持久化业务对象
4. 创建 `Run`
5. 处理权限、校验、幂等、状态流转

#### Worker

职责：

1. 执行生成任务
2. 调用模型 provider
3. 写回运行结果与产物
4. 更新 `Run / EventLog / 业务对象状态`

#### 前端

职责：

1. 维护临时 UI 状态
2. 发送命令
3. 轮询或订阅任务状态
4. 展示后端返回的业务真相

前端不再负责生成业务结果本身。

## 5. MySQL 约束下的数据建模调整

### 5.1 原则

对于“当前生效对象唯一”的场景，不再依赖子表状态唯一约束，而改为主表显式引用。

### 5.2 需要显式外键化的字段

建议至少保留：

1. `Project.currentEpisodeId`
2. `Episode.activePlannerSessionId`
3. `Shot.activeVersionId`
4. `Shot.activeMaterialBindingId`（如保留素材栈）
5. `PublishDraft.activeExportRunId`（如存在当前导出任务）

### 5.3 不建议长期留在 JSON 中的核心对象

以下对象若进入正式业务高频路径，应从 snapshot 中拆出：

1. 音乐生成结果
2. 配音上传记录
3. 对口型生成结果
4. 导出结果
5. 类似视频复用配方与执行记录

## 6. 领域模型新基线

### 6.1 核心聚合根

后端正式实现建议围绕以下聚合根：

1. `Project`
2. `Episode`
3. `PlannerSession`
4. `Shot`
5. `ShotVersion`
6. `Asset`
7. `Run`
8. `GenerationRecipe`
9. `RecipeExecution`
10. `PublishDraft`

### 6.2 新增：GenerationRecipe

用途：描述一份可复用、可导出、可再次执行的生成配方。

建议字段：

1. `id`
2. `projectId`
3. `episodeId`
4. `sourceRunId`
5. `name`
6. `kind`：`image | video | multi_shot_video`
7. `definitionJson`
8. `version`
9. `isTemplate`
10. `createdById`
11. `createdAt`
12. `updatedAt`

`definitionJson` 内应包含：

1. 工作流步骤
2. prompt 模板
3. 模型选择策略
4. 默认参数
5. 素材槽位定义
6. 后处理规则
7. 导出配置

### 6.3 新增：RecipeExecution

用途：记录一次基于配方的实际执行。

建议字段：

1. `id`
2. `recipeId`
3. `projectId`
4. `episodeId`
5. `status`
6. `inputAssetBundleId`
7. `resolvedConfigJson`
8. `outputProjectId`
9. `outputEpisodeId`
10. `runGroupId`
11. `createdById`
12. `createdAt`
13. `finishedAt`

## 7. 模型目录与 provider 建模

### 7.1 设计目标

同一逻辑模型可能在多个 provider 下可调用，因此必须把“模型能力”、“模型来源”、“模型实际 endpoint”拆开。

### 7.2 新增：ModelFamily

用途：逻辑模型定义。

建议字段：

1. `id`
2. `slug`
3. `name`
4. `kind`：`image | video | audio | lipsync`
5. `capabilityJson`
6. `isActive`

示例：

1. `kling-v2`
2. `wanx-2.1-video`
3. `seko-image`

### 7.3 新增：ModelProvider

用途：接入来源定义。

建议字段：

1. `id`
2. `code`
3. `name`
4. `providerType`：`official | proxy | internal`
5. `baseUrl`
6. `credentialRef`
7. `isActive`

### 7.4 新增：ModelEndpoint

用途：某个逻辑模型在某个 provider 下的一个具体调用入口。

建议字段：

1. `id`
2. `familyId`
3. `providerId`
4. `remoteModelKey`
5. `label`
6. `status`
7. `priority`
8. `costConfigJson`
9. `rateLimitConfigJson`
10. `defaultParamsJson`

### 7.5 运行记录必须保留的模型信息

所有生成类 `Run` 必须记录：

1. `modelFamilyId`
2. `modelEndpointId`
3. `providerId`
4. `remoteModelKey`
5. `requestConfigSnapshot`
6. `promptSnapshot`

禁止仅保存单一 `modelId`。

## 8. 一键复用生成的后端流程

### 8.1 用户视角

用户点击“类似视频一键生成”后，只需要：

1. 上传自己的素材
2. 选择必要的最小输入

其余配置全部沿用原记录。

### 8.2 后端执行流程

1. 读取原记录对应的 `GenerationRecipe`
2. 创建新的 `RecipeExecution`
3. 绑定本次用户上传素材
4. 解析配方中的变量槽位与模型策略
5. 生成一组真实 `Run`
6. Worker 顺序或按 DAG 执行
7. 结果写入新的 `Project / Episode / Shot / ShotVersion / Asset`

### 8.3 JSON 导出规则

导出的 JSON 应只包含“可复用配置”，不得包含：

1. 临时 token
2. provider 密钥
3. 内部回调地址
4. 敏感成本策略明细（若不适合对外）

建议导出内容包括：

1. recipe 元信息
2. workflow definition
3. prompt 模板
4. 模型选择策略
5. 素材槽位定义
6. 渲染参数
7. 导出配置

## 9. API 新规划

### 9.1 查询接口

1. `GET /api/studio/explore`
2. `GET /api/studio/projects`
3. `GET /api/studio/projects/:projectId`
4. `GET /api/projects/:projectId/planner/workspace`
5. `GET /api/projects/:projectId/creation/workspace`
6. `GET /api/projects/:projectId/publish/workspace`
7. `GET /api/runs/:runId`
8. `GET /api/model-families`
9. `GET /api/model-endpoints`
10. `GET /api/recipes/:recipeId`

### 9.2 命令接口

#### 项目与策划

1. `POST /api/studio/projects`
2. `POST /api/projects/:projectId/planner/submit`
3. `POST /api/projects/:projectId/planner/generate-storyboard`

#### 创作

1. `POST /api/shots/:shotId/generate-image`
2. `POST /api/shots/:shotId/generate-video`
3. `POST /api/shots/:shotId/materials`
4. `POST /api/shots/:shotId/versions/:versionId/apply`
5. `POST /api/shots/:shotId/canvas-edits`
6. `POST /api/projects/:projectId/voice/upload`
7. `POST /api/projects/:projectId/music/generate`
8. `POST /api/shots/:shotId/lipsync`

#### 配方与复用生成

1. `POST /api/recipes`
2. `POST /api/recipes/:recipeId/export-json`
3. `POST /api/recipes/import-json`
4. `POST /api/recipes/:recipeId/execute`

#### 运行控制

1. `POST /api/runs/:runId/cancel`
2. `POST /api/runs/:runId/retry`

## 10. Run / Worker 统一模型

### 10.1 原则

所有异步动作统一映射为 `Run`，不按功能单独造主账本。

### 10.2 Run 至少应具备的字段

1. `id`
2. `runType`
3. `status`
4. `resourceType`
5. `resourceId`
6. `executorType`
7. `inputJson`
8. `outputJson`
9. `errorCode`
10. `errorMessage`
11. `startedAt`
12. `finishedAt`

### 10.3 需要统一进入 Run 的动作

1. `PLANNER_DOC_UPDATE`
2. `STORYBOARD_GENERATION`
3. `IMAGE_GENERATION`
4. `VIDEO_GENERATION`
5. `MUSIC_GENERATION`
6. `VOICE_PROCESSING`
7. `LIPSYNC_GENERATION`
8. `EXPORT`
9. `PUBLISH`
10. `RECIPE_EXECUTION`

## 11. 前后端职责重划

### 11.1 前端保留内容

前端只保留：

1. 面板开合
2. 表单草稿
3. 本地 hover / selection / dialog 状态
4. 播放器即时 UI 状态

### 11.2 必须迁出前端的业务真相

以下状态必须迁回后端：

1. shot 状态
2. version 列表
3. 当前生效 version
4. 素材绑定
5. 配音上传结果
6. 音乐生成结果
7. 对口型生成结果
8. 导出结果
9. Recipe 与 RecipeExecution

## 12. 分阶段实施建议

### 12.1 Phase 1：把读取能力真后端化

目标：

1. 接入 MySQL + Prisma
2. 实现 `project / planner / creation / publish` 查询接口
3. 前端摆脱 fixture 读取依赖

### 12.2 Phase 2：把 Creation 核心命令后端化

目标：

1. 生图
2. 生视频
3. 素材上传
4. 版本应用
5. 画布编辑结果保存

此阶段 Worker 可先 mock，API 与 DB 必须真实。

### 12.3 Phase 3：接入音频链路

目标：

1. 配音上传
2. 音乐生成
3. 对口型生成

### 12.4 Phase 4：接入配方复用与 JSON 导出

目标：

1. `GenerationRecipe`
2. `RecipeExecution`
3. recipe 导出 / 导入
4. 类似视频一键复用生成

### 12.5 Phase 5：导出与发布

目标：

1. 导出 run
2. 发布草稿
3. 发布记录

## 13. 当前必须先做的设计冻结项

正式开工前，以下决策必须冻结：

1. 数据库：`MySQL`
2. 后端形态：`apps/api + apps/worker`
3. 统一任务账本：`Run`
4. 统一模型目录：`ModelFamily / ModelProvider / ModelEndpoint`
5. 一键复用生成基于：`GenerationRecipe / RecipeExecution`
6. 前端 reducer 不再作为业务真相来源

## 14. 关联文档

1. `docs/specs/backend-data-api-spec-v0.2.md`
2. `docs/specs/database-schema-spec-v0.2.md`
3. `docs/specs/internal-execution-api-spec-v0.2.md`
4. `docs/specs/state-machine-and-error-code-spec-v0.2.md`
5. `prisma/README.md`

## 15. 后续文档更新要求

本文件落地后，后续至少需要同步更新以下文档到 `v0.3`：

1. 外部接口规格
2. 数据库设计规格
3. 内部执行接口规格
4. 后端实施清单
5. 文档主索引
