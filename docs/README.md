# 文档主索引（v0.4）

版本：v0.4
日期：2026-03-20
状态：现行基线（已压缩为精简入口）

---

## 1. 使用规则

1. 文档与代码冲突时，以代码为准
2. 当前基线只认 `docs/specs/` 中列为现行基线的文档
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
- 项目工作区真实路由：
  - Planner：`/api/planner/projects/:projectId/*`
  - Creation：`/api/creation/projects/:projectId/*`
  - Publish：`/api/publish/projects/:projectId/*`

---

## 2. 现行基线

### 必读

1. `docs/specs/backend-implementation-checklist-v0.3.md`
2. `docs/specs/backend-data-api-spec-v0.3.md`
3. `docs/specs/internal-execution-api-spec-v0.3.md`
4. `docs/specs/database-schema-spec-v0.3.md`
5. `docs/specs/state-machine-and-error-code-spec-v0.3.md`

### 重构与执行

1. `docs/specs/refactor-execution-guardrails-v0.1.md`
2. `docs/specs/refactor-next-phase-plan-v0.3.md`
3. `docs/specs/ai-refactor-architecture-spec-v0.1.md`
4. `docs/specs/phase-2-ai-refactor-task-breakdown-v0.1.md`

### Planner / 视频专项

1. `docs/specs/planner-ai-capabilities-spec-v0.1.md`
2. `docs/specs/planner-phase-4-5-task-breakdown-v0.1.md`
3. `docs/specs/video-model-capability-spec-v0.1.md`

### 其他现行参考

1. `docs/specs/explore-catalog-management-spec-v0.3.md`
2. `docs/specs/frontend-workspace-contract-migration-v0.1.md`
3. `docs/specs/backend-system-design-spec-v0.3.md`
4. `docs/reviews/planner-agent-refactor-design-2026-03-16.md`
5. `docs/reviews/planner-real-provider-e2e.md`
6. `docs/reviews/planner-regression-gate-2026-03-18.md`
7. `docs/reviews/local-test-accounts.md`

---

## 3. 已归档

以下文档已退出现行基线：

1. `docs/archive/specs/refactor-next-phase-plan-v0.1.md`
2. `docs/archive/specs/refactor-next-phase-plan-v0.2.md`
3. `docs/archive/specs/refactor-todo-flat-table-v0.1.md`
4. `docs/archive/specs/refactor-execution-sequence-v0.1.md`
5. `docs/archive/specs/planner-agent-orchestration-spec-v0.1.md`
6. `docs/archive/specs/planner-workflow-and-document-spec-v0.1.md`
7. `docs/archive/specs/backend-replanning-and-recipe-model-spec-v0.3.md`
8. `docs/archive/reviews/planner-agent-doc-code-gap-review-2026-03-14.md`
9. `docs/archive/reviews/planner-agent-final-decisions-2026-03-14.md`
10. `docs/archive/reviews/system-admin-console-plan-2026-03-15.md`

归档说明见：`docs/archive/README.md`

---

## 4. 最短阅读路径

新加入项目时，按这个顺序读：

1. 本索引
2. `docs/specs/backend-implementation-checklist-v0.3.md`
3. `docs/specs/backend-data-api-spec-v0.3.md`
4. `docs/specs/internal-execution-api-spec-v0.3.md`
5. `docs/specs/database-schema-spec-v0.3.md`
6. `docs/specs/refactor-next-phase-plan-v0.3.md`

如果在做 Planner，再加读：

1. `docs/specs/planner-ai-capabilities-spec-v0.1.md`
2. `docs/specs/planner-phase-4-5-task-breakdown-v0.1.md`
3. `docs/specs/video-model-capability-spec-v0.1.md`
