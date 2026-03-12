# 可行性分析与技术选型（v0.2）

版本：v0.2  
日期：2026-03-09  
状态：现行选型结论（对齐最新首页/策划页）

关联文档：
- `docs/architecture/system-architecture-role-spec-v0.2.md`
- `docs/specs/backend-data-api-spec-v0.2.md`
- `docs/specs/database-schema-spec-v0.2.md`
- `docs/specs/explore-planner-backend-guidance-v0.2.md`

## 1. 目标

评估“当前产品目标下”后端与 AI 执行架构的可行性，并给出实现优先级。

## 2. 选型结论

## 2.1 架构选型

采用：

`Next.js Web + Domain Backend/BFF + Queue + Worker + 模型 Provider`

不采用：

1. 前端直接驱动 LLM 并持久化结果
2. 以工作流平台替代业务状态机
3. 以会话上下文作为业务真相

## 2.2 数据模型选型

采用：

1. `Project/Episode/PlannerSession` 作为业务主干。
2. `OutlineVersion/RefinementVersion/RefinementStep` 作为策划版本化核心。
3. `docSnapshot(JSON)` 作为版本渲染主数据。

原因：

1. 历史切换简单可靠。
2. 与 UI 渐进渲染天然匹配。
3. 便于审计与问题追踪。

## 2.3 接口选型

采用“统一提交接口”模式：

1. `POST /api/projects/:id/planner/submit`
2. 后端内部判断首次确认或 rerun

原因：

1. 与当前页面交互一致（单提交按钮）。
2. 降低前端分支复杂度。
3. 便于后端做幂等和并发控制。

## 3. 可行性评估

## 3.1 工程可行性

高。当前前端已稳定输出以下契约：

1. 创建项目后仅按 `projectId` 进入策划页。
2. 模式固定于创建阶段。
3. 细化版本与历史切换具备明确交互模型。

## 3.2 风险点

1. AI 输出结构不稳定，可能破坏快照 schema。
2. 并发提交导致重复版本。
3. 长任务失败后状态不一致。
4. 比例枚举正在从 `1:1` 迁移到 `16:9/9:16/4:3/3:4`。

## 3.3 风险缓解

1. Worker 输出强制 JSON Schema 校验。
2. 提交接口加 `idempotencyKey`。
3. 使用 job 状态回写与补偿机制。
4. 在 Planner 引入独立比例配置表并做向后兼容。

## 4. 分阶段实现建议

## 阶段 A（最小闭环）

1. `POST /api/studio/projects`
2. `GET planner/workspace`
3. `POST planner/submit`
4. `GET refinement/versions*`

## 阶段 B（可编辑）

1. `PATCH refinement version`
2. `PATCH planner/config`
3. Worker 步骤进度回传

## 阶段 C（优化）

1. SSE 实时推送
2. 一致性检查服务
3. 成本与质量路由（模型选择策略）

## 5. 验收标准（架构层）

1. 核心状态不依赖会话上下文。
2. 版本历史可查询、可切换、不可覆盖。
3. 单次提交语义清晰，幂等可靠。
4. 失败可恢复，且不会污染已就绪版本。
