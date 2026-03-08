# OpenClaw 集成规格

版本：v0.1  
状态：实现规格  
适用范围：MVP
关联文档：
- `docs/architecture/system-architecture-role-spec-v0.1.md`
- `docs/specs/mvp-domain-model-spec-v0.1.md`
- `docs/specs/mvp-command-query-event-spec-v0.1.md`
- `docs/openclaw/openclaw-contract-spec-v0.1.md`
- `docs/openclaw/openclaw-protocol-schema-v0.1.md`

## 1. 文档目标

本文档用于定义平台与 OpenClaw 的集成方式，重点包括：

- 核心角色分工
- 节点与镜头执行时序
- 执行任务 envelope
- 事件上报与幂等规则
- 审核、重试、回退、版本替换、发布的边界
- OpenClaw session 与正式业务对象的边界

目标不是描述 OpenClaw 内部实现细节，而是定义一套稳定、可重试、可观测、可扩展的集成契约。

## 2. 角色划分

### 2.1 Web Studio

职责：

- 展示项目、节点、镜头、版本、日志、发布结果
- 提供审核、编辑后继续、重试、回退、镜头替换、发布入口
- 承载精细生产操作

### 2.2 Domain Backend / Orchestrator

职责：

- 维护项目和节点状态真相
- 维护镜头、镜头版本、发布记录等正式对象
- 接收 Web 与 OpenClaw 的统一命令
- 创建执行任务
- 接收 OpenClaw 回传事件
- 判定是否推进下一个节点或下一个镜头动作

### 2.3 Queue / Scheduler

职责：

- 调度可执行节点与镜头任务
- 控制并发、重试和超时
- 派发执行请求

### 2.4 OpenClaw Gateway / Agents

职责：

- 理解自然语言意图
- 调用只读 / 可写 / 高风险工具
- 把查询结果和操作回执翻译为用户可读反馈
- 在被允许时作为 Agent Worker 执行特定任务

### 2.5 OpenClaw Agent Worker

职责：

- 执行单节点任务或单镜头任务
- 调用模型、工具、脚本和浏览器能力
- 产生日志、中间产物和最终结果
- 以结构化方式回传结果

## 3. 核心原则

- 平台维护业务真相
- Web 与 OpenClaw 是两个入口，但最终调用同一套后端命令
- OpenClaw 只执行当前被批准的任务
- 每次执行都必须绑定唯一 `runId`
- 所有正式输入都要显式版本化
- OpenClaw 的输入输出必须结构化
- 审核等待由平台管理，不由 OpenClaw 会话悬挂
- 镜头版本激活属于业务动作，不属于执行器内部动作

## 4. 对象边界

### 4.1 Project

业务对象，表示一个漫剧项目。

### 4.2 PlannerSession

业务对象，表示 Planner 页中的正式策划会话。

### 4.3 PipelineNode

编排对象，表示项目中的固定阶段账本。

### 4.4 Shot

业务对象，表示项目中的单个镜头单元。

### 4.5 ShotVersion

业务对象，表示镜头的候选视觉版本。

### 4.6 PublishDraft

业务对象，表示发布前的可编辑草稿。

### 4.7 Run

执行对象，表示某个节点或镜头的一次具体执行。

### 4.8 OpenClaw Session

执行上下文对象，用于复用上下文和工具环境，但不承担业务主真相。

### 4.9 边界原则

- `Project` 决定项目与剧集的主阶段摘要
- `PlannerSession` 决定策划页是否 ready 以及当前文档输入
- `PipelineNode` 负责编排账本，不取代页面工作区对象
- `Shot` 决定镜头当前生成态
- `ShotVersion` 决定镜头正式生效版本
- `PublishDraft` 决定发布前编辑态
- `Run` 决定一次执行的输入输出与日志
- `OpenClaw Session` 只负责协助执行，不作为业务唯一依据

## 5. 核心时序

### 5.1 时序一：创建项目并启动首节点

1. 用户在 Web Studio 或 OpenClaw 中发起创建项目
2. 后端执行 `CreateProject`
3. 后端创建 `Project`、默认 `Episode`、active `PlannerSession` 与固定 `PipelineNode` 账本
4. 后端执行 `StartProject`
5. Scheduler 选出首个可执行节点
6. 后端创建 `Run`
7. 平台向执行层发起执行请求
8. 执行层持续上报结构化事件
9. 后端写入日志、产物和状态
10. 节点完成后，平台判定是否进入下一个节点或等待审核

### 5.2 时序二：节点执行成功并自动推进

1. Agent Worker 接收节点执行任务
2. Worker 读取结构化输入和上游有效产物
3. Worker 执行节点逻辑
4. Worker 上报 `run.started`
5. Worker 上报若干 `run.log` 与 `run.artifact`
6. Worker 上报 `run.completed`
7. 后端将当前节点状态改为 `completed`
8. 若下一个节点无需人工处理，则 Scheduler 创建下一个 `Run`
9. 后端继续派发下一个节点执行请求

### 5.3 时序三：节点完成后进入审核态

1. OpenClaw 或 System Worker 完成一个需审核节点
2. 完成结果中标记 `requiresReview = true`
3. 后端写入当前产物和版本记录
4. 后端将节点状态置为 `awaiting_review`
5. 后端将项目状态更新为 `awaiting_review`
6. Web Studio 提示用户处理
7. OpenClaw 本次 `Run` 结束，不悬挂等待用户输入

### 5.4 时序四：用户审核通过并继续

1. 用户在 Web Studio 或 OpenClaw 触发 `ApproveNode`
2. 后端写入 `Review`
3. 后端将当前节点状态更新为 `completed`
4. Scheduler 选出下一个节点
5. 后端创建新的 `Run`
6. 平台将正式版本输入传给执行层
7. 执行层开始执行下一个节点

### 5.5 时序五：用户编辑后继续

1. 用户在 Web Studio 编辑审核内容
2. 后端执行 `EditNodeAndContinue`
3. 后端保存编辑结果为新版本
4. 后端写入 `Review`，动作类型为 `edit_and_continue`
5. 后端将新版本标记为当前有效输入
6. 后端将当前节点状态更新为 `completed`
7. 下游节点新的 `Run` 基于新版本启动

### 5.6 时序六：节点执行失败

1. Worker 在执行时遇到错误
2. Worker 上报 `run.failed`
3. 后端将 `Run` 状态更新为 `failed`
4. 后端将节点状态更新为 `failed`
5. 后端将项目状态更新为 `failed` 或维持可恢复态
6. Web Studio 与 OpenClaw 都能读取到错误摘要和恢复动作

### 5.7 时序七：镜头批量生成

1. 用户在 Web Studio 提交 `BatchGenerateShots`
2. 后端校验当前节点必须为 `image_generation`
3. 后端为每个目标镜头创建 `Run(runKind=shot)`
4. Scheduler 分批调度镜头任务
5. Worker 逐镜头上报 `run.started`、`run.log`、`run.artifact`
6. 后端为成功镜头创建 `ShotVersion`
7. 若是首个成功版本，后端可自动激活为正式版本
8. Web 工作台实时刷新镜头状态与版本列表

### 5.8 时序八：镜头版本替换

1. 用户在版本面板点击“设为当前版本”
2. Web 调用 `ActivateShotVersion`
3. 后端校验项目状态、镜头归属和版本归属
4. 后端将原 `active` 版本归档
5. 后端将目标版本设为 `active`
6. 后端写入 `Review` 或业务操作日志
7. Web 工作台刷新镜头主图与版本状态
8. OpenClaw 若查询该镜头，应读取最新正式版本

### 5.9 时序九：发布提交

1. 用户在发布页点击“提交发布”
2. 后端执行 `SubmitPublish`
