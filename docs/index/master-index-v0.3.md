# 文档主索引（v0.3）

版本：v0.3  
日期：2026-03-13  
状态：现行基线（后端开工版）

## 1. 目标

本索引用于声明当前后端设计与实施的现行文档基线。

规则：

1. 若文档与代码冲突，以代码为准。
2. 若多份文档冲突，以本索引列出的 `v0.3` 文档为准。
3. `v0.2` 文档保留供回溯，不再作为后端开工基线。

补充口径：

1. Planner Agent 相关内容已在 2026-03-14 做过一轮“文档 vs 代码”精确对齐。
2. 若涉及 Planner Agent / Planner Debug / Outline-Refinement 两阶段工作流，除主规格外，还应同时参考本索引列出的两份 review 文档。
3. 自 2026-03-15 起，系统级文档与代码一致性、以及下一阶段重构方向，额外以系统复盘文档为准。

## 2. 代码真相源

当前文档以以下代码为事实来源：

1. `apps/api/prisma/schema.prisma`
2. `apps/api/src/routes/*.ts`
3. `apps/api/src/lib/*.ts`
4. `apps/web/src/app/**/*.tsx`
5. `apps/web/src/features/**/*.tsx`
6. `docs/reviews/system-doc-code-audit-2026-03-15.md`
7. `docs/reviews/system-refactor-plan-2026-03-15.md`

## 3. 现行文档清单

### 3.1 架构与总规划

1. `docs/specs/backend-replanning-and-recipe-model-spec-v0.3.md`  
   说明：后端复盘与重规划基线，冻结 MySQL、Recipe、Model Registry 等核心方向。
2. `docs/specs/backend-system-design-spec-v0.3.md`  
   说明：后端系统设计稿，覆盖领域模型、表结构、API、Worker 与迁移路线。

### 3.2 数据与接口

1. `docs/specs/database-schema-spec-v0.3.md`  
   说明：MySQL 版数据库结构、主键/外键/索引与关键约束。
2. `docs/specs/backend-data-api-spec-v0.3.md`  
   说明：Web/客户端到后端的查询与命令接口。
3. `docs/specs/internal-execution-api-spec-v0.3.md`  
   说明：后端到 Worker/provider 的内部任务下发与回传协议。
4. `docs/specs/explore-catalog-management-spec-v0.3.md`  
   说明：首页主体/画风目录、项目入口配置快照与后续管理字段设计。
5. `docs/specs/planner-agent-orchestration-spec-v0.1.md`  
   说明：Planner 阶段 Agent / Sub-Agent 编排、结构化输出、消息流与 Prompt 调试治理专项设计。
6. `docs/specs/planner-workflow-and-document-spec-v0.1.md`  
   说明：基于 Seko 规划页反推的两阶段策划工作流、Outline/Refinement 文档结构、主体/场景生命周期与实施顺序。

### 3.3 Planner 专项复盘与裁决

1. `docs/reviews/planner-agent-doc-code-gap-review-2026-03-14.md`  
   说明：Planner Agent 相关文档与代码的逐项差异复盘，标注哪些应改文档、哪些应改代码。
2. `docs/reviews/planner-agent-final-decisions-2026-03-14.md`  
   说明：对剩余口径问题的最终裁决，统一 `assistant_error`、profile 创建边界、planner 规划期图片能力等说法。

### 3.4 系统级复盘与重构

1. `docs/reviews/system-doc-code-audit-2026-03-15.md`
   说明：系统级文档与代码一致性审计，标注哪些文档已偏离真实实现。
2. `docs/reviews/system-refactor-plan-2026-03-15.md`
   说明：在不考虑兼容老数据和老业务的前提下，定义下一阶段重构方向、AI 模块化原则与外部接口日志方案。
3. `docs/reviews/planner-agent-refactor-design-2026-03-16.md`
   说明：Planner Agent 重构设计草稿。诊断当前架构缺陷（版本链断裂、衍生数据非原子、scope 字符串化），定义目标能力矩阵，给出模型感知分镜提示词、Shot 级重跑、SSE 实时进度、策划确认交接的设计决策与实施顺序。

### 3.5 状态与实施

1. `docs/specs/state-machine-and-error-code-spec-v0.3.md`  
  说明：项目、分镜、任务、配方执行等状态流转与错误码。
2. `docs/specs/backend-implementation-checklist-v0.3.md`  
  说明：按阶段拆分的实施清单、DoD、联调顺序与回归场景。

### 3.6 视频模型能力

1. `docs/specs/video-model-capability-spec-v0.1.md`
   说明：各主流视频生成模型的能力参数（多镜头叙事、最大时长、分辨率、参考图数量、音效支持等），供 Planner 分镜提示词生成、前端选型 UI、Run 创建校验使用。包含结构化 JSON 字段定义（对应 `capabilityJson.videoCapability`）及分镜提示词生成规则。

### 3.7 历史基线

以下文档保留为上一个阶段的历史参考：

1. `docs/index/master-index-v0.2.md`
2. `docs/specs/*.md` 中的 `v0.2` 文档

## 4. 使用方式

正式开工后端时，默认按以下顺序阅读：

1. 本索引
2. `backend-replanning-and-recipe-model-spec-v0.3.md`
3. `backend-system-design-spec-v0.3.md`
4. `database-schema-spec-v0.3.md`
5. `backend-data-api-spec-v0.3.md`
6. `internal-execution-api-spec-v0.3.md`
7. `state-machine-and-error-code-spec-v0.3.md`
8. `backend-implementation-checklist-v0.3.md`
9. `planner-agent-orchestration-spec-v0.1.md`
10. `planner-workflow-and-document-spec-v0.1.md`
11. `planner-agent-doc-code-gap-review-2026-03-14.md`
12. `planner-agent-final-decisions-2026-03-14.md`
13. `system-doc-code-audit-2026-03-15.md`
14. `system-refactor-plan-2026-03-15.md`
15. `video-model-capability-spec-v0.1.md`（实现 Phase 4 分镜提示词生成功能时必读）
