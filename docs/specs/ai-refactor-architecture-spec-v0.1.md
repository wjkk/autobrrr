# AI 重构架构单页基线（v0.1）

版本：v0.1
日期：2026-03-16
状态：现行执行基线（用于收口 AI 重构架构口径）

## 1. 文档目的

本文只做一件事：把当前文档中分散在 `checklist`、`guardrails`、`planner-agent-refactor-design` 里的 AI 重构口径收敛成一页可执行基线。

本文不新增并列规划，不覆盖以下文档的原始职责：

1. `docs/specs/backend-implementation-checklist-v0.3.md`：Phase 顺序、DoD、任务拆分
2. `docs/specs/refactor-execution-guardrails-v0.1.md`：执行约束、停手条件、验证矩阵
3. `docs/specs/internal-execution-api-spec-v0.3.md`：Run / Worker / callback 协议
4. `docs/specs/video-model-capability-spec-v0.1.md`：视频模型能力字段定义

若旧设计草案与本文冲突，以本文为准；若本文与上述高可信基线冲突，以对应高可信基线为准。

## 2. 当前已确定的事实

### 2.1 当前主执行链路

当前代码中的 AI 主链路已经分成两类：

1. Planner / Creation 的同步业务调用
2. Run / worker 驱动的异步执行链路

当前事实：

1. `provider-adapters.ts` 已存在，但同时承担了 Run 执行适配和部分业务能力入口职责
2. `catalog-subject-image.ts` 仍直连 `platou-client.ts`
3. `run.inputJson` 仍是裸 JSON
4. Planner 尚未具备模型感知分镜提示词能力
5. Planner → Creation 尚未通过正式 `finalize` 交接

### 2.2 当前 provider 现实

当前有效 provider 语义如下：

1. `ark`：当前代码主链路已接入 TEXT；规划上应与 `platou` 一样，纳入 IMAGE / VIDEO / AUDIO 多能力接入，不能在架构上写死为 text-only provider
2. `platou`：当前已接入 TEXT + IMAGE + VIDEO
3. `mockProxyAdapter`：开发 / 测试兼容路径，存在于代码中，但不是产品主链路能力表述的重点

## 3. 目标态分层

目标态以“最小增量重构”为原则，不引入新的 package 分层，只把现有 AI 调用边界收干净。

```text
业务同步调用路径：

Planner / Creation / Provider Test / Catalog
        ↓
AI service layer
  - model-capability.ts
  - shot-prompt-generator.ts
        ↓
provider-gateway.ts
  - generateText
  - generateImage
  - submitVideoTask
  - queryVideoTask
  - audio capability entrypoints（命名待实现时确定）
        ↓
ark-client.ts / platou-client.ts
  - 纯 HTTP transport
  - instrumentation hook 插入点

Run 场景调用路径：

run-worker.ts / callback handlers
        ↓
provider-adapters.ts
  - 只负责 Run 场景
  - submit / poll / callback
        ↓
provider-gateway.ts
        ↓
ark-client.ts / platou-client.ts
```

说明：

1. 图中的 `↓` 表示调用方向，不表示“层级越靠下越底层”的唯一关系
2. `provider-adapters.ts` 不位于 `provider-gateway.ts` 的下层；它是 Run 场景下对 gateway 的调用方
3. 非 Run 的业务同步调用不经过 `provider-adapters.ts`

### 3.1 关键裁决

以下口径在本轮重构中固定：

1. `provider-gateway.ts` 才是业务 AI 调用的统一入口
2. `provider-adapters.ts` 不是业务统一入口，只负责 Run 场景
3. `ark-client.ts` / `platou-client.ts` 只保留 transport 职责，不再被业务文件直接调用
4. `model-capability.ts` 和 `shot-prompt-generator.ts` 属于 AI 服务层，不属于 provider 层

## 4. 各层职责

### 4.1 业务层

业务层包括：

1. Planner 路由 / orchestrator
2. Creation 命令路由
3. Provider test 路由
4. `catalog-subject-image.ts`

职责：

1. 组装业务输入
2. 调用 AI 服务层或 provider gateway
3. 创建 / 查询业务对象
4. 不直接发 HTTP 到外部 provider

### 4.2 AI 服务层

AI 服务层是本轮新增的业务能力层，当前至少包括：

1. `model-capability.ts`
2. `shot-prompt-generator.ts`

职责：

1. 从模型注册表读取结构化视频模型能力
2. 生成可注入 Planner prompt 的模型能力摘要
3. 将 `PlannerShotScript[]` 格式化为模型感知提示词
4. 不直接触达 provider client

### 4.3 Provider Gateway

`provider-gateway.ts` 是同步业务 AI 能力的统一入口。

职责：

1. 将业务语义映射为 provider 级能力调用
2. 统一路由到 `ark-client.ts` / `platou-client.ts`
3. 为非 Run 场景提供稳定入口
4. 供 `provider-adapters.ts` 复用，而不是与其平级重复造逻辑

目标导出能力：

1. `generateText(...)`
2. `generateImage(...)`
3. `submitVideoTask(...)`
4. `queryVideoTask(...)`
5. 音频相关能力入口（如 `generateAudio(...)` / `processAudio(...)`），至少要在接口设计上预留，不得把 `ark` 写死成 text-only

### 4.4 Provider Adapters

`provider-adapters.ts` 保留，但职责收缩。

职责：

1. 根据 `Run` 解析 provider / model / capability
2. 调用 `provider-gateway.ts`
3. 处理 `submit / poll / callback` 三类 Run 场景
4. 将 provider 结果回传给 run lifecycle

不再承担：

1. 业务同步图片生成入口
2. 目录主体草图生成入口
3. provider test 路由的通用调用入口

### 4.5 Transport Clients

`ark-client.ts` / `platou-client.ts` 的职责固定为：

1. HTTP 请求与响应解析
2. 统一 instrumentation hook 插入点
3. 敏感字段脱敏前的原始 request / response 接触点

不承担：

1. Run 语义
2. 业务对象语义
3. Planner / Creation 领域逻辑

## 5. Planner 侧 AI 流程

### 5.1 当前与目标

Planner 侧 AI 重构分为两层：

1. Phase 2：先把底层 AI 边界收口
2. Phase 4-5：再补模型感知和 Planner 体验
3. ARK 的 IMAGE / VIDEO / AUDIO 能力接入属于本轮规划内能力扩展，架构上从 Phase 2 开始预留，不允许后续因 text-only 假设而返工

### 5.2 refinement 才是模型感知注入的主场

当前文档明确的目标态重点是：

1. 用户选择目标视频模型
2. Planner refinement 阶段注入目标模型能力摘要
3. Agent 产出更适合目标模型的 shot 描述原料
4. `PlannerShotScript` 记录 `targetModelFamilySlug`

本文不把“outline 阶段必须注入模型能力”作为硬性执行口径。

### 5.3 Planner 新增能力

Planner 侧目标新增以下能力：

1. `model-capability.ts`
2. `shot-prompt-generator.ts`
3. `PlannerRerunScope` 判别联合
4. `GET /api/studio/projects/:projectId/planner/shot-prompts?modelSlug=xxx`
5. `GET /api/projects/:projectId/planner/stream`
6. `POST /api/projects/:projectId/planner/finalize`

这三个接口分别承担：

1. 提示词预览
2. 实时步骤流
3. Planner → Creation 正式交接

### 5.4 多镜头模型的明确边界

对 `Seedance 2.0` 这类 `supportsMultiShot = true` 的视频模型，本轮重构明确支持两种使用方式：

1. 多个相邻 `shot` 合并为单次生成任务
2. 单个 `shot` 内部通过提示词表达多次镜头切换

当前裁决：

1. Phase 4 先通过 `shot-prompt-generator.ts` 的提示词生成能力支持这两种模式
2. 本轮不新增 `subShot`、`shotSegments`、`cameraBeats` 之类的新数据结构
3. `PlannerShotScript` 仍作为最小策划单元；单个 shot 内部的多镜头切换先体现在生成后的 prompt 中，而不是先扩展数据库模型
4. 若后续需要精确编辑单个 shot 内部的镜头节奏，再单独立项做 shot 内部分段建模

## 6. Creation 侧 AI 流程

Creation 侧保持当前 Run 驱动执行主干，但要修正两个关键问题：输入契约和产物存储。

### 6.1 标准链路

目标态 Creation 执行链路如下：

```text
路由层创建 Run
   ↓
run-worker.ts 取 QUEUED / 可轮询任务
   ↓
resolveProviderAdapter(run)
   ↓
provider-adapters.ts
   ↓
provider-gateway.ts
   ↓
platou-client.ts / ark-client.ts
```

### 6.2 必须同步完成的修正

1. `Run.inputJson` 必须类型化并做 Zod 运行时校验
2. 图片 / 视频产物必须先下载到本地，再写 `Asset.sourceUrl`
3. `generated.local` 假 URL 必须彻底删除
4. URL 缺失时必须显式失败，而不是静默写脏数据

### 6.3 Creation 的提示词来源

目标态下，视频生成应优先消费正式交接后的提示词数据，而不是继续依赖 Planner 页上的原始通用描述。

因此：

1. `finalize` 之后，Creation 侧读取的是正式交接后的 Shot 提示词数据
2. 前端不应要求用户再次手工把通用描述改写成视频模型可用 prompt

## 7. Planner → Creation 交接

这是本轮 AI 重构必须打通的业务链路。

`POST /api/projects/:projectId/planner/finalize` 至少完成：

1. 当前 `activeRefinement` 标记确认
2. 按 `ShotScript[]` 创建或更新 Creation `Shot`
3. 将模型感知格式化结果写入 Shot 对应提示词字段
4. 将 `targetVideoModelFamilySlug` 一并写入 Shot 侧元数据
5. 将 `PlannerSubject.generatedAssetIds` 自动绑定到 Shot 草稿图或素材绑定

目标结果：

1. 用户点击“确认策划”后，Creation 立刻拿到可生成的数据
2. 用户不需要手动搬运草稿图
3. 用户不需要手动把通用描述重写成目标模型 prompt

## 8. Phase 映射

### 8.1 Phase 2：AI 层收口重构

本阶段只做边界收口，不做亮点功能完整实现。

必须完成：

1. `Run.inputJson` 类型化
2. `provider-gateway.ts` 新建
3. `provider-adapters.ts` 收缩为 Run-only
4. `catalog-subject-image.ts` 改走 `provider-gateway.ts`
5. transport instrumentation hook 插入点
6. 本地文件存储替代 provider 临时 URL / 假 URL
7. 清除“ARK = text-only provider”的架构假设，为后续 IMAGE / VIDEO / AUDIO 接入预留统一入口

### 8.2 Phase 3：外部调用审计

本阶段才把 instrumentation hook 接到 `external_api_call_logs`。

必须完成：

1. `external_api_call_logs`
2. request / response / latency / error 记录
3. `run_id / user_id / project_id / provider_code / capability` 关联

### 8.3 Phase 4：模型感知分镜提示词

本阶段实现亮点功能。

必须完成：

1. `VideoModelCapability` 结构化查询
2. `model-capability.ts`
3. `shot-prompt-generator.ts`
4. `shot-prompts` 预览接口
5. Planner refinement 模型能力注入

### 8.4 Phase 5：Planner 体验升级

必须完成：

1. `planner/stream` SSE
2. shot 级精细化重跑
3. `planner/finalize`
4. Planner 草稿图自动流转到 Creation

### 8.5 Phase 6-7：收口

1. Phase 6：route / service / orchestrator 边界明确化
2. Phase 7：前端移除 `StudioFixture` 主工作区运行时依赖

## 9. 本文明确反对的错误表述

以下说法在本轮重构中不再使用：

1. “`provider-adapters.ts` 是所有业务 AI 调用的唯一出口”
2. “`catalog-subject-image.ts` 的目标态是直接走 `provider-adapters.ts`”
3. “Phase 2 就已经有 `external_api_call_logs` 完整落库”
4. “旧的 `ai-core / ai-providers / ai-capabilities / ai-applications` 分层是本轮实现目标”
5. “Planner 必须先重跑一次才能切换模型预览提示词”

## 10. 最小阅读顺序

进入 AI 重构实现前，建议按以下顺序阅读：

1. 本文
2. `docs/specs/backend-implementation-checklist-v0.3.md`
3. `docs/specs/refactor-execution-guardrails-v0.1.md`
4. `docs/specs/internal-execution-api-spec-v0.3.md`
5. `docs/specs/video-model-capability-spec-v0.1.md`
6. `docs/reviews/planner-agent-refactor-design-2026-03-16.md`
