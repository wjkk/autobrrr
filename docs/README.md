# 文档主索引（v0.5）

版本：v0.5
日期：2026-03-21
状态：现行基线

---

## 1. 使用规则

1. 文档与代码冲突时，以代码为准
2. 当前基线只认 `docs/specs/` 中仍标注为现行或已完成闭环的文档
3. `docs/archive/` 只用于回溯，不作为实现裁决依据

关键代码真相源：

1. `apps/api/prisma/schema.prisma`
2. `apps/api/src/routes/*.ts`
3. `apps/api/src/lib/*.ts`
4. `apps/web/src/app/**/*.tsx`
5. `apps/web/src/features/**/*.tsx`

补充口径：

- 数据库唯一真相源：`apps/api/prisma/schema.prisma`
- 管理页真实入口：`/admin/*`；`/internal/*` 仅兼容跳转
- Web 代理层对外工作区路由：
  - Planner：`/api/planner/projects/:projectId/*`
  - Creation：`/api/creation/projects/:projectId/*`
  - Publish：`/api/publish/projects/:projectId/*`
- Fastify 后端实现工作区路由：
  - Planner：`/api/projects/:projectId/planner/*`
  - Creation：`/api/projects/:projectId/creation/*`
  - Publish：`/api/projects/:projectId/publish/*`

---

## 2. 必读文档

1. `docs/specs/current-architecture-baseline-v0.1.md`
2. `docs/specs/backend-implementation-checklist-v0.3.md`
3. `docs/specs/backend-data-api-spec-v0.3.md`
4. `docs/specs/backend-system-design-spec-v0.3.md`
5. `docs/specs/refactor-next-phase-plan-v0.3.md`
6. `docs/specs/planner-state-and-doc-alignment-plan-v0.1.md`
7. `docs/specs/architecture-9-score-roadmap-v0.1.md`

如果在做 Planner，再加读：

1. `docs/specs/planner-ai-capabilities-spec-v0.1.md`
2. `docs/specs/planner-phase-4-5-task-breakdown-v0.1.md`
3. `docs/specs/video-model-capability-spec-v0.1.md`

---

## 3. 已归档

旧计划、旧评审、旧重构顺序统一进入 `docs/archive/`，不再作为当前实现判断依据。
