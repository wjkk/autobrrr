# Planner 状态边界与文档对齐执行记录（v0.1）

版本：v0.1
日期：2026-03-21
状态：已完成

---

## 1. 本轮实际解决的问题

本轮最终解决了四类现实问题：

1. Planner 页面状态边界过于集中
2. Planner thread / document 展示层仍有大组件
3. Settings catalog 的新 orchestration seam 正在变厚
4. 架构文档与当前代码现实存在漂移

---

## 2. 已完成改动

### 2.1 Planner 前端

- 移除 `planner-page-context.tsx`
- `planner-page.tsx` 只装配页面切片
- `use-planner-page-state.ts` 维持页面 orchestration，切片 builder 下沉到 `hooks/planner-page-state-slices.ts`
- thread 区拆成 runtime / seed / composer
- runtime message 解析拆到 `lib/planner-thread-runtime-presenters.ts`
- document panel 拆到 `internal/planner-document-*.tsx`

### 2.2 Settings / Catalog

- 页面壳继续维持精简
- 状态拆到 auth / filter / editor / image / crud 子 hooks
- 请求副作用拆到 `lib/catalog-management-client/*.ts`
- draft helper 统一到 `lib/catalog-management-drafts.ts`
- 新增 catalog drafts / filters / auth / image / save tests

### 2.3 API 后端

- `entity-service.ts` 改为 facade
- `workspace-service.ts` 改为 facade + query + assembler
- `studio-project-service.ts` 改为 facade + list / create / detail
- 新增 workspace assembler test，补 presenter tests

### 2.4 文档口径

- 当前基线文档补到 `current-architecture-baseline-v0.1.md`
- 架构评分口径改由更保守的评审与路线图文档维护，不再保留 9 分路线图
- `todo.list` 作为本轮执行落单清单关闭
- 继续保留 Web 代理路径 vs Fastify 实现路径双口径说明

---

## 3. 验收结果

已通过：

1. `pnpm typecheck`
2. `pnpm typecheck:api`
3. `pnpm --filter @aiv/web test:unit`
4. `pnpm --filter @aiv/api test:unit`

结论：本轮不再只是“文档对齐”，而是完成了 Planner / Settings / API 三侧热点的结构收口与文档闭环。
