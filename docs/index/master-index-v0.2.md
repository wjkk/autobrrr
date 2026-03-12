# 文档主索引（v0.2）

版本：v0.2  
日期：2026-03-09  
状态：现行基线（与最新 Explore/Planner 代码对齐）

## 1. 目标

本索引只保留和当前代码一致的文档。

1. 若文档与代码冲突，以代码为准。
2. 若多份文档冲突，以本索引列出的文档为准。

## 2. 代码真相源

当前文档以以下代码为事实来源：

1. `apps/web/src/app/page.tsx`
2. `apps/web/src/app/explore/page.tsx`
3. `apps/web/src/app/projects/[projectId]/page.tsx`
4. `apps/web/src/app/projects/[projectId]/planner/page.tsx`
5. `apps/web/src/app/projects/[projectId]/creation/page.tsx`
6. `apps/web/src/app/projects/[projectId]/publish/page.tsx`
7. `apps/web/src/app/api/studio/projects/route.ts`
8. `apps/web/src/features/explore/components/explore-page.tsx`
9. `apps/web/src/features/planner/components/planner-page.tsx`
10. `apps/web/src/features/planner/hooks/use-planner-refinement.ts`
11. `apps/web/src/lib/studio-service.ts`
12. `packages/domain/src/*.ts`
13. `packages/mock-data/src/fixtures/studio-fixtures.ts`
14. `prisma/schema.prisma`

## 3. 现行文档清单

### 3.1 产品与路由

1. `docs/web/web-route-and-page-spec-v0.2.md`  
   说明：首页与各工作区路由、页面行为、后端最低要求。

### 3.2 架构文档

1. `docs/architecture/system-architecture-role-spec-v0.2.md`  
   说明：系统分层、角色边界、Planner 编排职责。
2. `docs/architecture/feasibility-and-tech-selection-v0.2.md`  
   说明：技术选型结论、风险与分阶段落地。
3. `docs/architecture/n8n-adoption-decision-v0.2.md`  
   说明：n8n 仅用于外围自动化的边界决策。
4. `docs/architecture/README-v0.2.md`  
   说明：架构文档目录索引。

### 3.3 规格文档

1. `docs/specs/frontend-domain-contract-spec-v0.2.md`  
   说明：前端聚合数据契约（`StudioFixture`）与字段语义。
2. `docs/specs/backend-data-api-spec-v0.2.md`  
   说明：外部接口（Web/客户端 <-> 后端）。
3. `docs/specs/internal-execution-api-spec-v0.2.md`  
   说明：内部接口（后端 <-> 执行器/Worker/Agent）。
4. `docs/specs/database-schema-spec-v0.2.md`  
   说明：数据库模型、关系、约束与增量建模建议。
5. `docs/specs/state-machine-and-error-code-spec-v0.2.md`  
   说明：状态流转规则、路由阶段映射、统一错误码。
6. `docs/specs/explore-planner-backend-guidance-v0.2.md`  
   说明：首页到策划页后端落地指导（创建项目、统一提交、版本历史、配置持久化）。
7. `docs/specs/backend-implementation-checklist-v0.2.md`  
   说明：后端实施清单（按 P0/P1 拆分任务、DoD、联调顺序与回归场景）。

## 4. 历史文档归档约定

历史文档（旧版本、恢复稿）不进入现行目录。若需在仓库内归档，使用以下约定目录（按需创建）：

1. `docs/_legacy-restored/`
2. `docs/_restored-guides/`

在 `docs` 其他目录中禁止保留旧版本文档。

后续新增文档时，必须先在本索引登记，否则视为草稿文档。
