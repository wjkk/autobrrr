# 文档主索引（v0.4）

版本：v0.4
日期：2026-03-16
状态：现行基线（已修正 v0.3 中的失效引用）

---

## 1. 目标

本索引声明当前后端设计与实施的文档基线，并对各文档的**可信度分层**做明确标注。

规则：

1. 若文档与代码冲突，以代码为准。
2. 若多份文档冲突，以"高可信"层文档为准；"草案"与"历史快照"层不作为裁决依据。
3. `v0.2` 文档已归档，不再作为后端基线。

> ⚠️ **根目录 `prisma/schema.prisma` 已废弃。**
> 该文件是早期 PostgreSQL 设计的残留，包含已不使用的 `PipelineNode`、`EventLog`、`PublishDraft` 等模型。当前唯一有效的 schema 是 `apps/api/prisma/schema.prisma`（MySQL）。任何数据库相关决策一律以后者为准，根目录文件不得引用。
>
> ℹ️ **路由口径：`/internal/*` 是兼容入口，`/admin/*` 是实际入口。**
> `apps/web/src/app/internal/` 下的页面（如 `planner-debug`、`planner-agents`）均已直接 `redirect` 到 `/admin/*`，不再有实质内容。文档中凡写 `/internal/planner-debug` 等路径的，均以 `/admin/planner-debug` 为准。

---

## 2. 代码真相源

当前文档以以下代码为事实来源：

1. `apps/api/prisma/schema.prisma`（唯一有效 schema）
2. `apps/api/src/routes/*.ts`
3. `apps/api/src/lib/*.ts`
4. `apps/web/src/app/**/*.tsx`
5. `apps/web/src/features/**/*.tsx`

---

## 3. 现行文档清单

文档按可信度分为三层：

- **高可信**：与代码强对应，可作为重构唯一依据
- **专项草案**：设计方向正确，但状态未完全落地或存在局部过时内容，作为参考使用
- **历史快照**：某一时间点的诊断/规划记录，部分内容已被代码追上，只供回溯，不作为当前基线

---

### 3.1 高可信

#### 数据与接口

1. `docs/specs/database-schema-spec-v0.3.md`
   说明：MySQL 版数据库结构、主键/外键/索引与关键约束。与 `apps/api/prisma/schema.prisma` 对应。
2. `docs/specs/backend-data-api-spec-v0.3.md`
   说明：Web/客户端到后端的查询与命令接口规格。
3. `docs/specs/internal-execution-api-spec-v0.3.md`
   说明：后端到 Worker/provider 的内部任务下发与回传协议。
4. `docs/specs/explore-catalog-management-spec-v0.3.md`
   说明：首页主体/画风目录、项目入口配置快照与管理字段设计。

#### 状态与实施

1. `docs/specs/state-machine-and-error-code-spec-v0.3.md`
   说明：项目、分镜、任务等状态流转与错误码。新增错误码（如 `RUN_FAILED_NO_OUTPUT_URL`）应同步更新此文档。
2. `docs/specs/backend-implementation-checklist-v0.3.md`
   说明：当前最权威的实施清单，按 Phase 拆分任务、DoD 和顺序。**重构以此为准。**
3. `docs/specs/refactor-execution-guardrails-v0.1.md`
   说明：本轮重构的执行约束、Phase 前置条件、验证矩阵与停手条件。**开始动手前必读。**

#### 视频模型能力

1. `docs/specs/video-model-capability-spec-v0.1.md`
   说明：各主流视频生成模型的能力参数（多镜头叙事、音效、参考图、运镜词汇等），实现 Phase 4 分镜提示词生成功能时必读。

---

### 3.2 专项草案（方向正确，局部存在过时内容）

1. `docs/specs/backend-system-design-spec-v0.3.md`
   说明：后端系统设计稿，数据库表结构与 API 部分仍可信；AI 层描述（`ai-core / ai-providers / ai-capabilities / ai-applications` 分层）已与 Phase 2 重构方案冲突，该部分不作为依据。
2. `docs/specs/backend-replanning-and-recipe-model-spec-v0.3.md`
   说明：冻结 MySQL 方向的规划文档，历史上有效；其中 Recipe 模型相关内容与当前实施优先级不符，数据库章节引用了旧 PostgreSQL 设计，阅读时注意甄别。
3. `docs/specs/planner-agent-orchestration-spec-v0.1.md`
   说明：Planner Agent / Sub-Agent 编排与 Prompt 调试治理的专项设计。状态仍为草案，部分细节已被代码实现超前，供专项参考，不作为重构的唯一依据。
4. `docs/specs/planner-workflow-and-document-spec-v0.1.md`
   说明：两阶段策划工作流与 Outline/Refinement 文档结构设计。同上，供专项参考。
5. `docs/reviews/planner-agent-refactor-design-2026-03-16.md`
   说明：Planner Agent 重构设计草稿（最新）。包含 AI 功能现状盘点、模型感知分镜提示词亮点功能设计、Shot 级重跑、SSE 进度、策划确认交接的完整设计。Phase 4/5 实施时的核心参考文档。
6. `docs/specs/frontend-workspace-contract-migration-v0.1.md`
   说明：前端主工作区从 `StudioFixture` 过渡到正式 workspace DTO / view model 的迁移说明。做 Phase 7 时的直接参考。

---

### 3.3 历史快照（诊断记录，只供回溯）

以下文档是特定时间点的诊断或裁决记录，部分内容已被代码实现追上，不代表当前现状：

1. `docs/reviews/planner-agent-doc-code-gap-review-2026-03-14.md`
   说明：2026-03-14 的 Planner Agent 文档与代码差异复盘。部分已修复问题仍在其中，阅读时注意对照代码现状。
2. `docs/reviews/planner-agent-final-decisions-2026-03-14.md`
   说明：对 Planner 口径问题的最终裁决（`assistant_error`、profile 创建边界等）。结论仍有参考价值。
3. `docs/specs/frontend-domain-contract-spec-v0.2.md`
   说明：前端领域契约规格（v0.2），准确描述了当前过渡态——Planner/Creation 页面仍将真实 API 响应映射回 `StudioFixture`（见 `planner-api.server.ts`、`creation-api.server.ts`）。这是对现状的准确描述，但不代表前端重构终态，不适合直接用于指导下一阶段契约设计。

---

### 3.4 已归档（不再作为基线）

1. `docs/index/master-index-v0.3.md`（存在失效引用，已由本文件替代）
2. `docs/specs/*.md` 中的 `v0.2` 文档
3. `docs/architecture/system-architecture-role-spec-v0.2.md`（路由描述已严重过时）
4. `docs/web/web-route-and-page-spec-v0.2.md`（路由描述已严重过时）
5. 根目录 `prisma/schema.prisma`（PostgreSQL 旧 schema，已废弃）

---

## 4. 阅读顺序

新人上手或进入重构时，按以下顺序阅读：

### 第一优先级（必读）

1. 本索引
2. `refactor-execution-guardrails-v0.1.md`（本轮重构怎么做、哪些不能做）
3. `backend-implementation-checklist-v0.3.md`（当前在做什么、下一步做什么）
4. `database-schema-spec-v0.3.md`（表结构）
5. `backend-data-api-spec-v0.3.md`（接口）

### 第二优先级（按需读）

1. `internal-execution-api-spec-v0.3.md`（涉及 Run/Worker 时）
2. `state-machine-and-error-code-spec-v0.3.md`（涉及状态流转时）
3. `explore-catalog-management-spec-v0.3.md`（涉及 Explore 目录时）
4. `video-model-capability-spec-v0.1.md`（实现 Phase 4 时）

### 第三优先级（专项参考）

1. `planner-agent-refactor-design-2026-03-16.md`（做 Planner 重构时）
2. `planner-agent-orchestration-spec-v0.1.md`（做 Planner Agent 编排时）
3. `planner-workflow-and-document-spec-v0.1.md`（做 Planner 工作流时）
4. `planner-agent-final-decisions-2026-03-14.md`（Planner 口径有争议时）
5. `frontend-workspace-contract-migration-v0.1.md`（做前端契约迁移时）
