# Planner Agent 文档 / 代码差异复盘（2026-03-14）

状态：首轮精确比对

已补充最终决策稿：`docs/reviews/planner-agent-final-decisions-2026-03-14.md`
范围：策划 Agent、主流程 Planner、内部调试页、相关表结构与接口

## 1. 比对范围

本轮重点比对以下文档：

1. `docs/specs/planner-agent-orchestration-spec-v0.1.md`
2. `docs/specs/planner-workflow-and-document-spec-v0.1.md`
3. `docs/specs/backend-data-api-spec-v0.3.md`
4. `docs/specs/database-schema-spec-v0.3.md`

对照的主要代码范围：

1. `apps/api/prisma/schema.prisma`
2. `apps/api/src/routes/planner-agent-profiles.ts`
3. `apps/api/src/routes/planner-commands.ts`
4. `apps/api/src/routes/planner-partial-reruns.ts`
5. `apps/api/src/routes/planner-debug.ts`
6. `apps/api/src/lib/planner-orchestrator.ts`
7. `apps/web/src/app/internal/planner-agents/page.tsx`
8. `apps/web/src/app/internal/planner-debug/*`
9. `apps/web/src/features/planner/lib/planner-api.ts`

## 2. 总体结论

结论分三层：

1. `planner-agent-orchestration-spec-v0.1.md` 与当前实现方向整体一致，已经不是“空设计稿”，而是大量内容已经落地。
2. 真正漂移最严重的是 `backend-data-api-spec-v0.3.md`，它仍停留在旧版 planner 接口模型，已经无法准确描述当前代码。
3. 当前代码也并非完全追上文档目标，尤其在 `debug replay`、`prompt 快照颗粒度`、`A/B 诊断维度` 上仍低于专项规格要求。

一句话判断：

- 基线方向：代码正确
- 文档状态：v0.1 专项文档大体对，v0.3 基线文档明显落后
- 剩余差距：主要是少数调试治理能力仍应继续补代码

## 3. 已经对齐的部分

以下内容文档与实现基本一致：

1. Agent / Sub-Agent 以数据库表为真相来源，而不是运行时本地常量
2. 一级内容类型与二级子类型体系已经完整落地到 seed 数据
3. Prompt 采用 AgentProfile + SubAgentProfile 组合
4. 输出协议已经拆分为 `outline` 与 `refinement` 两阶段
5. `planner_messages / planner_outline_versions / planner_refinement_versions / planner_step_analysis` 已落地
6. 内部调试页已独立于主流程页面存在
7. 支持草稿配置、发布快照、调试运行、回放和 A/B 基础能力

## 4. 差异清单

### 4.1 应优先更新文档

#### A. `backend-data-api-spec-v0.3.md` 的 Planner 接口已过时

文档写法：

- `POST /api/projects/:projectId/planner/submit`
- `POST /api/projects/:projectId/planner/generate-storyboard`
- `PATCH /api/projects/:projectId/planner/config`

见：`docs/specs/backend-data-api-spec-v0.3.md:159`

当前实现：

- `POST /api/projects/:projectId/planner/generate-doc`
- `POST /api/projects/:projectId/planner/partial-rerun`
- `POST /api/projects/:projectId/planner/outline-versions/:versionId/activate`
- `POST /api/projects/:projectId/planner/outline-versions/:versionId/confirm`
- `POST /api/projects/:projectId/planner/refinement-versions/:versionId/activate`

见：

- `apps/api/src/routes/planner-commands.ts:61`
- `apps/api/src/routes/planner-partial-reruns.ts:64`
- `apps/api/src/routes/planner-outline-versions.ts:131`
- `apps/api/src/routes/planner-outline-versions.ts:295`
- `apps/api/src/routes/planner-refinement-versions.ts:18`

判断：`更新文档`

原因：当前代码已经形成更完整的 outline/refinement 双阶段接口模型，v0.3 接口文档明显滞后，不应让代码回退去适配旧文档。

#### B. 调试页路径设计已变，文档仍停在旧路径

文档写法：

- `/internal/planner-agents`
- `/internal/planner-agents/:subAgentSlug`
- `/internal/planner-debug/runs/:runId`

见：`docs/specs/planner-agent-orchestration-spec-v0.1.md:576`

当前实现：

- `/internal/planner-agents`
- `/internal/planner-debug`
- `/internal/planner-debug/[subAgentSlug]`
- `/internal/planner-debug/compare`
- `/internal/planner-debug/runs`
- `/internal/planner-debug/runs/[runId]`

见：

- `apps/web/src/app/internal/planner-agents/page.tsx:1`
- `apps/web/src/app/internal/planner-debug/page.tsx:1`
- `apps/web/src/app/internal/planner-debug/[subAgentSlug]/page.tsx:1`
- `apps/web/src/app/internal/planner-debug/compare/page.tsx:1`
- `apps/web/src/app/internal/planner-debug/runs/[runId]/page.tsx:1`

判断：`更新文档`

原因：当前页面职责已经清晰拆成“管理页 + 调试页 + compare + runs”，应让文档反映真实信息架构。

#### C. Agent 配置接口文档比当前实现更“大”

文档写法：

- `GET /api/planner/sub-agent-profiles`
- `POST /api/planner/sub-agent-profiles`

见：`docs/specs/planner-agent-orchestration-spec-v0.1.md:561`

当前实现：

- `GET /api/planner/agent-profiles` 返回嵌套 sub-agent 配置
- `PATCH /api/planner/sub-agent-profiles/:id`
- `GET /api/planner/sub-agent-profiles/:id/releases`
- `POST /api/planner/sub-agent-profiles/:id/publish`

见：

- `apps/api/src/routes/planner-agent-profiles.ts:11`
- `apps/api/src/routes/planner-debug.ts:830`
- `apps/api/src/routes/planner-debug.ts:895`
- `apps/api/src/routes/planner-debug.ts:940`

判断：`优先更新文档`

原因：当前系统是 seed + 编辑发布模型，不是页面内新增 profile 模型。除非明确要在 UI 中支持新建 Agent / Sub-Agent，否则文档应先改成真实已实现能力。

#### D. `OutlineDoc / RefinementDoc / PlannerWorkspaceDto` 拆分已基本落地，工作流文档还在“建议态”

文档写法：

- 建议拆为 `OutlineDoc / RefinementDoc / PlannerWorkspaceDto`

见：`docs/specs/planner-workflow-and-document-spec-v0.1.md:688`

当前实现：

- 后端已有 `PlannerOutlineDoc`
- 前端已有 `ApiPlannerWorkspace`，包含 `activeOutline` 与 `activeRefinement`
- workspace DTO 已携带 outline/refinement/version/message 等聚合结果

见：

- `apps/api/src/lib/planner-outline-doc.ts:16`
- `apps/web/src/features/planner/lib/planner-api.ts:11`

判断：`更新文档`

原因：这块已经不是“建议重构”，而是应改成“现状说明 + 未完项”。

#### E. Planner 业务边界文档比实现更保守

文档写法：

- Planner 阶段不直接负责图片生成

见：`docs/specs/planner-agent-orchestration-spec-v0.1.md:48`

当前实现：

- 已存在 planner 阶段主体/场景/分镜图生成接口
- 已存在 planner 阶段主体/场景素材绑定接口

见：

- `apps/api/src/routes/planner-media-generation.ts:183`
- `apps/api/src/routes/planner-media-generation.ts:284`
- `apps/api/src/routes/planner-media-generation.ts:386`
- `apps/api/src/routes/planner-refinement-entities.ts:247`
- `apps/api/src/routes/planner-refinement-entities.ts:343`

判断：`更新文档`

原因：现在的真实边界已经变成“Planner 可做规划期图像草稿与素材绑定，但不负责最终创作/导出”，文档应据此重写边界描述。

### 4.2 应优先更新代码

#### F. 缺少正式的 debug replay 接口

文档要求：

- `POST /api/planner/debug/runs/:runId/replay`
- 历史 run 需要支持“以相同输入重新运行”

见：`docs/specs/planner-agent-orchestration-spec-v0.1.md:507`、`docs/specs/planner-agent-orchestration-spec-v0.1.md:569`

当前实现：

- 有 `GET /api/planner/debug/runs`
- 有 `GET /api/planner/debug/runs/:id`
- 有 `POST /api/planner/debug/run`
- UI 支持把历史 run 回填到表单再手动重跑
- 但没有独立 replay API

见：`apps/api/src/routes/planner-debug.ts:525`

判断：`更新代码`

原因：专项文档对 replay 的要求是“平台能力”，不是纯 UI 手工替代。正式 replay 接口能保证可复现、可自动化测试、可脚本化回归。

#### G. Debug run 的 prompt 快照颗粒度仍然不够

文档要求：

每次 run 至少保存：

- `systemPromptFinal`
- `developerPromptFinal`
- `messagesFinal`
- `modelSelectionSnapshot`
- `inputContextSnapshot`
- `outputRawText`
- `outputParsedJson`

见：`docs/specs/planner-agent-orchestration-spec-v0.1.md:489`

当前实现：

- `PlannerDebugRun` 仅持久化 `finalPrompt`
- 另存 `inputJson / modelSnapshotJson / rawText / providerOutputJson / assistantPackageJson`
- 没有把 system/developer/messages 分开冻结

见：

- `apps/api/prisma/schema.prisma:544`
- `apps/api/src/lib/planner-orchestrator.ts:96`

判断：`更新代码`

原因：如果后续需要精确做 prompt 治理、定位到底是 system 还是 developer 层出了问题，现在的数据粒度不够。

#### H. A/B 对比维度还没有完全达到专项规格

文档要求重点维度：

- `assistantMessage`
- `steps`
- `structuredDoc`
- `分镜数量`
- `字段完整度`
- `长度与成本`

见：`docs/specs/planner-agent-orchestration-spec-v0.1.md:518`

当前实现：

- 已比对 prompt 长度
- 已比对输出字段集合
- 已比对主体/场景/分镜数量
- 已展示主图预览
- 已展示 assistantMessage 摘要
- 但还没有 token / cost 对比
- 也没有 stepAnalysis 的结构化差异视图
- 也没有字段完整度的显式评分

见：`apps/web/src/features/planner-debug/components/planner-debug-compare-view.tsx:121`

判断：`更新代码`

原因：这块已经有基础 UI，不需要推翻；适合继续补“步骤差异 / 字段完整度 / token 成本”三项，把专项规格打满。

### 4.3 需要做设计决策后再动

#### I. 消息流错误类型不一致

文档写法：

- 有 `assistant_error`

见：`docs/specs/planner-agent-orchestration-spec-v0.1.md:331`

当前实现：

- 有 `USER_INPUT / ASSISTANT_TEXT / ASSISTANT_OUTLINE_CARD / ASSISTANT_STEPS / ASSISTANT_DOCUMENT_RECEIPT / SYSTEM_TRANSITION`
- 没有明确的 `ASSISTANT_ERROR`

见：

- `apps/api/prisma/schema.prisma:412`
- `apps/api/src/lib/planner-orchestrator.ts:417`
- `apps/api/src/routes/planner-outline-versions.ts:347`

判断：`待决策`

建议：

- 如果产品上要把 planner 失败显式放进左侧时间线，就补代码
- 如果错误只走 toast / run 状态，不进消息流，就更新文档枚举

#### J. 是否要支持页面内新建 Agent / Sub-Agent

文档写法：

- 预留了 `POST /api/planner/sub-agent-profiles`

当前实现：

- 只有 seed + 编辑 + 发布，没有创建入口

判断：`待决策`

建议：

- 如果未来配置主要由少量固定类型演进，保持当前模式并更新文档
- 如果运营/算法同学会持续扩子类型，就应该补创建接口和新建 UI

## 5. 建议动作优先级

### P0：立即更新文档

1. 更新 `docs/specs/backend-data-api-spec-v0.3.md`
2. 更新 `docs/specs/planner-agent-orchestration-spec-v0.1.md` 中的页面路径与接口清单
3. 更新 `docs/specs/planner-workflow-and-document-spec-v0.1.md` 中已完成/未完成状态描述
4. 在 v0.3 主索引中补充 planner agent 专项现状说明，避免团队继续参考过期接口

### P1：尽快补代码

1. 增加 `POST /api/planner/debug/runs/:runId/replay`
2. 扩充 `planner_debug_runs` 的 prompt 快照颗粒度
3. 增强 A/B 对比：steps、完整度、token/cost

### P2：做一次设计裁决

1. 是否保留 `assistant_error` 作为正式消息类型
2. 是否支持 UI 内新建 Agent / Sub-Agent
3. Planner 阶段“图像草稿生成”是否正式纳入产品边界文档

## 6. 复盘结论

本轮最重要的发现不是“代码偏离设计”，而是：

1. `专项设计文档` 与 `当前代码` 已经相当接近
2. `v0.3 主基线文档` 明显落后于当前实现
3. 还需要继续补的，主要集中在调试治理深度，而不是基础架构方向

因此下一步最合理的顺序是：

1. 先修正文档真相
2. 再补 replay / prompt snapshot / A/B 诊断深度
3. 最后再决定是否扩展配置创建能力
