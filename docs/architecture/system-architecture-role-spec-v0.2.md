# 系统架构与角色边界（v0.2）

版本：v0.2  
日期：2026-03-09  
状态：已归档（总体方向仍可参考，路由与运行时描述已过时）

> ⚠️ 本文中的路由与运行时形态不再作为当前裁决依据。
>
> 当前应改读：
>
> 1. `docs/index/master-index-v0.4.md`
> 2. `docs/specs/backend-data-api-spec-v0.3.md`
> 3. `docs/specs/internal-execution-api-spec-v0.3.md`
> 4. `docs/specs/refactor-execution-guardrails-v0.1.md`

关联文档：
- `docs/web/web-route-and-page-spec-v0.2.md`
- `docs/specs/backend-data-api-spec-v0.2.md`
- `docs/specs/database-schema-spec-v0.2.md`
- `docs/specs/explore-planner-backend-guidance-v0.2.md`
- `docs/architecture/n8n-adoption-decision-v0.2.md`

## 1. 文档目标

定义当前系统的稳定分层和职责边界，回答三个问题：

1. 谁是业务真相层
2. 谁负责 AI 编排与执行
3. Web、后端、Worker、外围自动化如何协作

## 2. 总体结论

推荐系统形态：

`Web Studio + Domain Backend/BFF + Planner Orchestrator + Worker 执行层 + 事件与任务基础设施`

核心原则：

1. 业务真相只有一份，落在后端数据库。
2. 前端只消费结构化状态，不直接耦合 LLM 会话。
3. AI 任务异步化，接口快速返回，进度通过状态回传。
4. 版本不可覆盖，历史只读可回放。

## 3. 架构总览

```mermaid
flowchart LR
  U[用户] --> WEB[Web Studio]

  WEB -->|HTTP| BFF[Domain Backend / BFF]
  BFF --> ORCH[Planner Orchestrator]

  ORCH --> Q[Job Queue]
  Q --> W[Planner Workers]
  W --> AI[LLM / 图像模型 / 媒体 Provider]

  W -->|progress/events| ORCH
  ORCH --> DB[(MySQL/PostgreSQL)]
  ORCH --> BUS[Event Bus / SSE Channel]
  BUS --> WEB

  ORCH --> N8N[n8n (可选外围自动化)]
```

## 4. 分层职责

## 4.1 Web Studio

职责：

1. 承载 Explore、Planner、Creation、Publish 页面交互。
2. 展示状态机、版本、步骤进度、错误提示。
3. 发起结构化命令（创建项目、提交、切版本、patch、配置更新）。

不负责：

1. 长任务编排
2. LLM 输出容错
3. 状态机合法性判断

## 4.2 Domain Backend / BFF

职责：

1. 提供页面聚合接口和命令接口。
2. 执行权限校验、幂等控制、输入校验。
3. 保证状态机和数据约束（如 contentMode 不可变）。
4. 持久化版本快照、步骤状态和操作日志。

## 4.3 Planner Orchestrator

职责：

1. 把提交意图路由成具体动作：
- 首次提交：确认大纲并启动细化
- 再次提交：创建新细化版本
2. 维护 `OutlineVersion`、`RefinementVersion` 生命周期。
3. 将细化任务拆解为步骤并下发 Worker。
4. 聚合 Worker 回传，更新 `progress/steps/docSnapshot`。

## 4.4 Worker 执行层

职责：

1. 调用 LLM 与图像模型。
2. 输出结构化 JSON（必须满足 schema）。
3. 逐步回传 partial snapshot（支持渐进渲染）。
4. 把模型错误转为可归一错误码。

## 4.5 n8n（可选）

职责仅限外围自动化：通知、报表、外部系统同步。  
不进入核心制作状态机。

## 5. Planner 链路的架构落点

## 5.1 请求链路

1. `POST /api/studio/projects`：创建项目并固化 `contentMode`。
2. `GET /api/projects/:projectId/planner/workspace`：拉取聚合状态。
3. `POST /api/projects/:projectId/planner/submit`：统一提交入口。
4. `GET .../refinement/versions*`：历史列表与详情。
5. `PATCH .../versions/:versionId`：版本内微调。
6. `PATCH .../planner/config`：分镜模型/画面比例配置。

## 5.2 状态机

1. `Project`: `DRAFT -> PLANNING -> READY_FOR_STORYBOARD`
2. `OutlineVersion`: `GENERATING -> READY -> CONFIRMED`
3. `RefinementVersion`: `RUNNING -> READY`（失败分支 `FAILED`）
4. rerun：`READY(vN) -> RUNNING(vN+1)`，旧版本保持只读

## 6. 数据所有权与一致性

1. `Project.contentMode`：创建后不可更新。
2. `RefinementVersion`：每个 session 同时最多一个 active。
3. 文档展示以 `docSnapshot` 为准，不从消息文本反推。
4. 主体/场景/分镜编辑只写当前目标版本。

## 7. 关键非功能要求

1. 幂等：提交接口支持 `idempotencyKey`。
2. 并发控制：同一 `(project, episode)` 仅允许一个 running refinement。
3. 可观测性：记录 job、step、provider、耗时、token、错误码。
4. 恢复：失败不污染已就绪版本，可随时回看历史版本。

## 8. 演进建议

1. 先以轮询读取 workspace/version 进度。
2. 稳定后增加 SSE 推送，降低轮询压力。
3. 后续引入一致性检查服务（角色名/场景名/风格词冲突）。
