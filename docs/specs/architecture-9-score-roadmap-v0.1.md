# 架构 9 分路线图（v0.1）

版本：v0.1
日期：2026-03-21
状态：已完成

---

## 1. 目标定义

“9 分”定义保持不变：

1. 主链路入口清楚
2. 页面壳 / 状态编排 / 请求副作用 / 展示层分层清楚
3. 后端 route / facade / query-assembler / domain seam 分层清楚
4. DTO、draft、page-model 没有继续隐式复制
5. 文档描述当前现实，而不是历史幻觉
6. 热点 seam 具备最小可靠测试护栏

本轮已经把仓库从“少数大热点仍明显阻碍演进”推进到“主链路可稳定扩展”的状态。

---

## 2. 已完成事项

### A. Planner 前端

- `planner-page.tsx` 不再依赖全局 context，只装配 `shell` / `thread` / `document` / `dialogs`
- `use-planner-page-state.ts` 保持页面级 orchestration，切片组装下沉到 `hooks/planner-page-state-slices.ts`
- `planner-thread-panel.tsx` 拆成 panel / runtime / seed / composer
- runtime message 解析下沉到 `lib/planner-thread-runtime-presenters.ts`
- `planner-document-panel.tsx` 拆成 summary / style / subjects / scenes / script / toc / footer 等 section 组件

### B. Settings / Catalog 前端

- `catalog-management-page.tsx` 保持 page shell
- `use-catalog-management-page-state.ts` 改成装配器，状态拆到：
  - `use-catalog-auth-state`
  - `use-catalog-filter-state`
  - `use-catalog-editor-state`
  - `use-catalog-image-actions`
  - `use-catalog-crud-actions`
- 请求层拆到：
  - `lib/catalog-management-client/auth-client.ts`
  - `lib/catalog-management-client/query-client.ts`
  - `lib/catalog-management-client/subject-image-client.ts`
  - `lib/catalog-management-client/save-client.ts`
- draft 规范统一到 `lib/catalog-management-drafts.ts`，形成 `create-empty` / `from-entity` / `to-payload` 模式
- Provider Config 页面保持 page shell + state hook + shell 组件三层

### C. API 后端

- `planner/refinement/entity-service.ts` 收口为 facade，职责拆到：
  - `entity-accessors.ts`
  - `entity-recommendation-service.ts`
  - `entity-mutation-service.ts`
  - `entity-asset-service.ts`
  - `entity-shot-service.ts`
- `planner/workspace-service.ts` 收口为 facade，拆到：
  - `workspace-query.ts`
  - `workspace-assembler.ts`
  - `workspace-presenters.ts`
- `studio-project-service.ts` 收口为 facade，拆到：
  - `studio-project-list-service.ts`
  - `studio-project-create-service.ts`
  - `studio-project-detail-service.ts`

### D. 测试护栏

新增或补强的重点测试覆盖：

- Planner page slice builders
- Planner thread runtime presenters
- Catalog drafts / filters / auth client / image client / save client
- Planner workspace assembler
- Planner / Studio presenters

---

## 3. 最终评价

当前评分：9 / 10

理由：

1. 主链路热点都已变成可读 facade 或 page shell
2. 副作用、draft 归一化、页面切片和展示层边界清楚
3. 后端厚 service 已拆成可维护 domain seams
4. 文档与代码现实已重新对齐
5. 剩余复杂度主要来自业务本身，而不是结构混乱

保留项：

- `use-planner-page-state.ts` 仍是页面总装配器，行数不算短，但内部细节已经明显下沉，不再是 God Hook
- 后续新增功能仍应优先延续当前 seam，而不是回流到 facade
