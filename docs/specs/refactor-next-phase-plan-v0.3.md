# 重构续推计划（v0.3）

版本：v0.3
日期：2026-03-21
状态：已完成并封板

---

## 1. 本文件用途

`v0.3` 不再描述未来计划，而是记录已经完成的重构收口结果，避免继续把历史计划误当成当前现实。

---

## 2. 已完成结果

### 前端

- Creation 主链路热点已在更早阶段收口
- Planner 页面完成：
  - 去 context
  - 明确 `shell` / `thread` / `document` / `dialogs`
  - thread runtime / seed / composer 分层
  - document section 分层
- Catalog 管理页完成：
  - page shell 固化
  - auth / filter / editor / image / crud 子 hooks 拆分
  - auth / query / image / save client 拆分
  - draft helper 统一
- Provider Config 页面完成 page shell + state hook + shell component 分层

### 后端

- `planner/refinement/entity-service.ts` 完成 facade 化
- `planner/workspace-service.ts` 完成 query + assembler + presenter 分层
- `studio-project-service.ts` 完成 list + create + detail 分层

### 文档

- 路由口径统一为“Web 代理路径 vs Fastify 实现路径”双说明
- 当前架构基线、9 分路线图、执行记录与 todo 已同步更新

### 验证

- `pnpm typecheck`
- `pnpm typecheck:api`
- `pnpm --filter @aiv/web test:unit`
- `pnpm --filter @aiv/api test:unit`

---

## 3. 关闭结论

`v0.3` 已关闭，原因：

1. 主要 God Hook / God Service 已拆成可维护 seam
2. 页面壳、状态编排、请求副作用、纯展示层边界已清晰
3. 后端主链路已是 thin facade + sub-service 结构
4. 文档不再落后于代码现实

后续若继续优化，应按新增业务触达点做局部演进，而不是重新开启一轮泛化重构冲刺。
