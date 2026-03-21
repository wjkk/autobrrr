# 当前架构基线（v0.1）

版本：v0.1
日期：2026-03-21
状态：现行

---

## 1. Workspace 结构

```text
apps/
  api/      Fastify + Prisma + domain services
  web/      Next.js App Router + feature-first UI
packages/
  domain/   稳定共享契约
  mock-data 前端种子数据
  ui/       通用 UI primitive
docs/
  README.md
  specs/current-architecture-*
  specs/refactor-*
```

---

## 2. Web 当前分层

### Planner

当前真实边界：

1. 路由入口：`apps/web/src/app/projects/[projectId]/planner/page.tsx`
2. 页面装配：`apps/web/src/features/planner/components/planner-page.tsx`
3. 页面 orchestration：`apps/web/src/features/planner/hooks/use-planner-page-state.ts`
4. 页面切片 builder：`apps/web/src/features/planner/hooks/planner-page-state-slices.ts`
5. 线程分层：
   - `planner-thread-panel.tsx`
   - `internal/planner-thread-runtime.tsx`
   - `internal/planner-thread-seed.tsx`
   - `internal/planner-thread-composer.tsx`
6. 文档分层：
   - `planner-document-panel.tsx`
   - `internal/planner-document-*.tsx`
7. runtime message presenter：`lib/planner-thread-runtime-presenters.ts`

结论：Planner 页面已从“全局 context + 大 panel”转为“page shell + orchestration + section / presenter seams”。

### Settings / Catalog

当前真实边界：

1. 页面壳：`apps/web/src/features/settings/components/catalog-management-page.tsx`
2. 页面装配 hook：`apps/web/src/features/settings/hooks/use-catalog-management-page-state.ts`
3. 子状态 hooks：
   - `hooks/catalog-management/use-catalog-auth-state.ts`
   - `hooks/catalog-management/use-catalog-filter-state.ts`
   - `hooks/catalog-management/use-catalog-editor-state.ts`
   - `hooks/catalog-management/use-catalog-image-actions.ts`
   - `hooks/catalog-management/use-catalog-crud-actions.ts`
4. 请求客户端：`lib/catalog-management-client/*.ts`
5. draft / payload mappers：
   - `lib/catalog-management-drafts.ts`
   - `lib/catalog-management-filters.ts`

### Settings / Provider Config

当前真实边界：

1. 页面壳：`apps/web/src/features/settings/components/provider-config-page.tsx`
2. 页面状态：`apps/web/src/features/settings/hooks/use-provider-config-page-state.ts`
3. 展示壳：`apps/web/src/features/settings/components/provider-config-page-shell.tsx`
4. 请求客户端：`apps/web/src/features/settings/lib/provider-config-client.ts`

---

## 3. API 当前分层

当前真实边界：

1. 入口：`apps/api/src/server.ts`
2. 路由层：`apps/api/src/routes/*.ts`
3. 业务层：`apps/api/src/lib/**/*.ts`
4. Planner 域：`apps/api/src/lib/planner/*`

关键 facade 已收口：

- `planner/refinement/entity-service.ts` -> access / recommendation / mutation / asset / shot seams
- `planner/workspace-service.ts` -> query / assembler / presenters
- `studio-project-service.ts` -> list / create / detail

结论：后端主链路已经从“大 service 直接拼 DTO”转为“route -> facade -> sub-service / assembler / presenter”。

---

## 4. 路由口径

当前必须区分两层：

1. Web 代理对外路径：
   - `/api/planner/projects/:projectId/*`
   - `/api/creation/projects/:projectId/*`
   - `/api/publish/projects/:projectId/*`
2. Fastify 后端实现路径：
   - `/api/projects/:projectId/planner/*`
   - `/api/projects/:projectId/creation/*`
   - `/api/projects/:projectId/publish/*`

---

## 5. 现阶段架构评价

当前状态：9 / 10

1. 页面壳、状态编排、请求副作用、展示层边界已经清楚
2. 后端关键热点已经变成 thin facade
3. draft / payload 模式已在 Catalog 侧统一
4. 文档已经能够反映代码现实
5. 剩余复杂度主要属于业务复杂度，而非结构债
