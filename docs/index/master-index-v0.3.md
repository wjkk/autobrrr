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

## 2. 代码真相源

当前文档以以下代码为事实来源：

1. `apps/web/src/lib/studio-service.ts`
2. `apps/web/src/app/api/studio/projects/route.ts`
3. `apps/web/src/features/creation/lib/creation-state.ts`
4. `apps/web/src/features/creation/lib/use-creation-workspace.ts`
5. `packages/domain/src/*.ts`
6. `packages/mock-data/src/fixtures/studio-fixtures.ts`
7. `prisma/schema.prisma`

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

### 3.3 状态与实施

1. `docs/specs/state-machine-and-error-code-spec-v0.3.md`  
   说明：项目、分镜、任务、配方执行等状态流转与错误码。
2. `docs/specs/backend-implementation-checklist-v0.3.md`  
   说明：按阶段拆分的实施清单、DoD、联调顺序与回归场景。

### 3.4 历史基线

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
