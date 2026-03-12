# 后端实施检查清单（v0.2）

版本：v0.2  
日期：2026-03-09  
状态：执行清单（P0/P1）

## 1. 目的

把现有规格文档转成可执行的后端任务清单，按实现优先级拆分为：

1. P0：打通 Explore -> Planner 闭环。
2. P1：补齐版本内编辑、执行编排与稳定性能力。

## 2. 当前基线（开始前需确认）

1. 首页已是“提交即创建项目，再按 `projectId` 跳转 planner”。
2. 策划页已采用“统一提交语义 + 历史版本按钮语义”。
3. 本仓库本地 API 当前仅实现：`GET/POST /api/studio/projects`。
4. 其余接口仍由外部 API 或 mock fallback 承接。

## 3. P0（必须一次打通）

### P0-1 项目创建服务化

1. 实现 `POST /api/studio/projects` 的真实持久化版本（替换 runtime mock）。
2. 创建项目时固化 `contentMode`（`single | series`），禁止后续修改。
3. 同步创建默认 episode / planner session。

完成定义（DoD）：

1. 返回稳定 `projectId`，页面可直接进入 `/projects/:projectId/planner`。
2. 重启服务后项目仍可查询。
3. `contentMode` 更新接口被拒绝（`CONFLICT` 或等价错误）。

### P0-2 策划工作区聚合查询

1. 实现 `GET /api/projects/:projectId/planner/workspace`。
2. 返回项目、episode、outline/refinement 状态、active doc snapshot、配置选项。
3. 初次进入时，右侧文档应为空快照（未细化）。

DoD：

1. 前端在无 mock 情况下能渲染 planner 首屏。
2. 接口能正确区分 `idle/running/ready/failed`。

### P0-3 统一提交接口

1. 实现 `POST /api/projects/:projectId/planner/submit`。
2. 未确认大纲：执行 `confirm_outline_and_start`。
3. 已确认大纲：执行 `rerun_refinement` 并创建新细化版本。

DoD：

1. 同一提交动作能覆盖两种语义。
2. rerun 不覆盖旧版本，版本号递增。

### P0-4 历史版本查询与激活

1. 实现版本列表接口与版本详情接口。
2. 实现版本激活接口（仅切换当前查看版本，不改内容）。

DoD：

1. 前端历史菜单可展示多版本并切换。
2. 旧版本内容可回看且不被覆盖。

### P0-5 策划配置持久化

1. 实现 `PATCH /api/projects/:projectId/planner/config`。
2. 配置项至少包含：`storyboardModelId`、`aspectRatio`。
3. Planner 比例枚举使用：`16:9 | 9:16 | 4:3 | 3:4`。

DoD：

1. 刷新页面后分镜模型和比例可回显。
2. 非法比例返回 `PLANNER_CONFIG_INVALID_ASPECT_RATIO`。

### P0-6 数据库迁移（最低集）

1. 新增 `PlannerOutlineVersion`。
2. 新增 `PlannerRefinementVersion`。
3. 新增 `PlannerRefinementStep`。
4. 新增 `PlannerGenerationConfig`。
5. 加唯一约束与索引（见 `database-schema-spec-v0.2.md`）。

DoD：

1. 关键唯一约束生效：版本号、active version、config 唯一键。
2. 版本列表按时间倒序查询可走索引。

## 4. P1（可编辑 + 稳定性）

### P1-1 版本内 Patch 能力

1. 实现 `PATCH /api/projects/:projectId/planner/refinement/versions/:versionId`。
2. 支持：`replace_subject`、`replace_scene`、`replace_shot`、`delete_shot`。
3. Patch 仅作用于目标版本。

DoD：

1. 主体/场景/分镜编辑可持久化并可回看。
2. 非 active 版本的 patch 策略明确（允许或禁止需一致）。

### P1-2 操作审计日志

1. 新增 `PlannerVersionOperationLog`（或等价能力）。
2. 记录操作人、操作类型、payload、时间。

DoD：

1. 任意版本变更可追踪来源。
2. 可按版本维度回放编辑轨迹。

### P1-3 内部执行链路（Planner）

1. 打通 `planner_outline_generate`、`planner_refinement_generate` 任务。
2. 支持步骤级进度回传与 partial snapshot。
3. 失败不污染已就绪版本。

DoD：

1. 任务状态与前端进度展示一致。
2. 异常中断后仍可切回旧版本继续工作。

### P1-4 并发与幂等

1. 同一 `(projectId, episodeId)` 同时仅允许一个 running refinement。
2. submit 接口支持幂等键。
3. 重试不产生重复版本。

DoD：

1. 并发压测下无重复版本号。
2. 重放请求可返回同一业务结果。

### P1-5 错误码与可观测性

1. 对齐统一错误响应结构。
2. 补齐 Planner 关键错误码：
- `PLANNER_REFINEMENT_RUNNING_CONFLICT`
- `PLANNER_VERSION_NOT_FOUND`
- `PLANNER_VERSION_EDIT_CONFLICT`
3. 建立指标：提交成功率、细化耗时、失败率、版本切换频次。

DoD：

1. 日志可按 `projectId/episodeId/versionId/runId` 关联。
2. 错误码可用于前端精准提示。

## 5. 联调顺序建议

1. `P0-1 -> P0-2 -> P0-3`（先打通主链路）。
2. `P0-4 -> P0-5 -> P0-6`（补历史与配置持久化）。
3. `P1-1 -> P1-2`（先做可编辑能力）。
4. `P1-3 -> P1-4 -> P1-5`（最后稳态化）。

## 6. 验收场景（最小回归）

1. 首页提交后，拿到真实 `projectId` 并进入 planner。
2. 首次提交触发确认+细化，右侧逐步渲染。
3. 第二次提交创建新版本，历史里能切回上一版。
4. 在新版本修改主体/场景/分镜，不影响旧版本。
5. 修改分镜模型和比例后刷新仍保持。
6. 并发重复点击提交，不产生重复 running 版本。

## 7. 关联文档

1. `docs/specs/explore-planner-backend-guidance-v0.2.md`
2. `docs/specs/backend-data-api-spec-v0.2.md`
3. `docs/specs/database-schema-spec-v0.2.md`
4. `docs/specs/state-machine-and-error-code-spec-v0.2.md`
5. `docs/specs/internal-execution-api-spec-v0.2.md`
