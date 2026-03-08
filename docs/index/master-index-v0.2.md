# 文档主索引（v0.2）

版本：v0.2  
日期：2026-03-08  
状态：现行基线（替代 v0.1 全套文档）

## 1. 目标

本索引只保留和当前代码一致的文档。
如果文档与代码冲突，以代码为准；如果两份文档冲突，以本索引列出的 v0.2 文档为准。

## 2. 代码真相源

当前文档以以下代码为事实来源：

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/explore/page.tsx`
- `apps/web/src/app/projects/[projectId]/page.tsx`
- `apps/web/src/app/projects/[projectId]/planner/page.tsx`
- `apps/web/src/app/projects/[projectId]/creation/page.tsx`
- `apps/web/src/app/projects/[projectId]/publish/page.tsx`
- `apps/web/src/features/explore/components/explore-page.tsx`
- `apps/web/src/lib/studio-service.ts`
- `packages/domain/src/*.ts`
- `packages/mock-data/src/fixtures/studio-fixtures.ts`
- `prisma/schema.prisma`

## 3. 现行文档清单

1. `docs/web/web-route-and-page-spec-v0.2.md`  
   说明：首页与各工作区路由、页面行为、数据要求。
2. `docs/specs/frontend-domain-contract-spec-v0.2.md`  
   说明：前端聚合数据契约（`StudioFixture`）与字段语义。
3. `docs/specs/backend-data-api-spec-v0.2.md`  
   说明：外部接口（Web/客户端 <-> 后端）。
4. `docs/specs/internal-execution-api-spec-v0.2.md`  
   说明：内部接口（后端 <-> 执行器/Worker/Agent）。
5. `docs/specs/database-schema-spec-v0.2.md`  
   说明：数据库模型、关系与查询约束（对齐 Prisma）。
6. `docs/specs/state-machine-and-error-code-spec-v0.2.md`  
   说明：状态流转规则、路由阶段映射、统一错误码。

## 4. 本次清理结果

已删除旧版 v0.1/v0.2 混合文档（`architecture/`、`openclaw/`、`product/` 以及旧 `web/`、`specs/` 文档），避免“多份规范并存且互相矛盾”。

后续新增文档时，必须先在本索引登记，否则视为草稿文档。
