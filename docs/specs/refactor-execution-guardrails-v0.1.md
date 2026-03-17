# 重构执行约束（v0.1）

版本：v0.1
日期：2026-03-16
状态：现行执行约束（适用于即将开始的重构阶段）

## 1. 文档目的

本文不定义业务功能，而是定义本轮重构必须遵守的执行约束，避免在实现过程中再次混入旧口径、旧边界和隐式目标。

本文回答 5 个问题：

1. 当前到底以哪些代码和文档为真相源
2. 本轮重构的明确目标与非目标是什么
3. 每个 Phase 开工前必须满足什么前置条件
4. 哪些目录和模块本轮可以动，哪些暂时不要动
5. 每个 Phase 完成后至少需要做哪些验证

## 2. 真相源与裁决顺序

### 2.1 代码真相源

本轮重构一律以下列代码为事实来源：

1. `apps/api/prisma/schema.prisma`
2. `apps/api/src/routes/*.ts`
3. `apps/api/src/lib/*.ts`
4. `apps/web/src/app/**/*.tsx`
5. `apps/web/src/features/**/*.tsx`

### 2.2 文档裁决顺序

若文档互相冲突，按以下顺序裁决：

1. `docs/index/master-index-v0.4.md`
2. `docs/specs/backend-implementation-checklist-v0.3.md`
3. `docs/specs/database-schema-spec-v0.3.md`
4. `docs/specs/backend-data-api-spec-v0.3.md`
5. 其他被 `master-index-v0.4.md` 标记为“高可信”的文档
6. 专项草案文档
7. 历史快照 / `v0.2` 文档

### 2.3 明确排除项

以下内容不得作为当前重构裁决依据：

1. 已移除的根目录旧 `prisma/` 目录
2. 已移除的旧 `v0.3` 主索引口径
3. `docs/architecture/*.md` 与 `docs/web/*.md` 中已过时的 `v0.2` 路由说明
4. 任何只描述“目标态”、但未与当前代码对齐的旧 review 记录

## 3. 本轮重构目标

### 3.1 必须达成

1. 后端边界清晰：`route -> service/orchestrator -> provider gateway / persistence`
2. AI 调用统一入口：业务代码不再直连 provider client
3. `Run.inputJson` 类型化并有运行时校验
4. 生成资产不再写入假 URL 或 provider 临时 URL
5. Planner 版本链、局部重跑、衍生数据同步的基础正确性提升
6. 前端逐步摆脱 `StudioFixture` 作为运行时长期契约
7. 文档只保留一套可执行基线

### 3.2 明确非目标

本轮重构默认不做以下事情，除非后续单独立项：

1. 不先拆微服务
2. 不先引入 Redis / event bus 作为前置工作
3. 不先做 Recipe 全链路
4. 不先做大规模 UI 改版
5. 不为了“抽象完美”引入新的 packages 分层
6. 不为了兼容旧设计而继续扩展 `StudioFixture`

## 4. Phase 依赖关系

### 4.1 阶段顺序

当前推荐顺序固定为：

1. Phase 1：文档与架构真相收口
2. Phase 2：AI 层收口重构
3. Phase 3：外部调用审计能力
4. Phase 4：模型感知分镜提示词生成
5. Phase 5：Planner 体验升级
6. Phase 6：API 分层重构
7. Phase 7：前端与后端契约清理

### 4.2 前置条件

每个 Phase 开工前至少满足：

1. Phase 2 开工前：Phase 1 文档基线已固定，所有参与者对真相源无争议
2. Phase 3 开工前：Phase 2 的 instrumentation hook 已存在
3. Phase 4 开工前：Phase 2 的 provider gateway、typed run input、Planner 基础修复已完成
4. Phase 5 开工前：Phase 4 的模型能力与 shot prompt 生成已可用
5. Phase 6 开工前：Phase 2-5 的核心行为已稳定，否则 route/service 分层会放大变动面
6. Phase 7 开工前：API DTO 已基本稳定，否则前端迁移会反复返工

当前状态：

1. 该前置条件已满足
2. Phase 7 主工作区真实路径迁移已完成，后续 guardrail 重点转为避免重新把 `StudioFixture` 拉回主路径

## 5. 变更范围约束

### 5.1 本轮优先可动目录

1. `apps/api/src/lib`
2. `apps/api/src/routes`
3. `apps/api/prisma/schema.prisma`
4. `apps/web/src/features/planner`
5. `apps/web/src/features/creation`
6. `apps/web/src/features/publish`
7. `docs/index`
8. `docs/specs`
9. `docs/reviews` 中仍被索引引用的专项文档

### 5.2 本轮谨慎变更目录

以下目录可改，但应放在后期或尽量减少：

1. `packages/domain`
2. `packages/mock-data`
3. `apps/web/src/features/explore`
4. `apps/web/src/features/settings`
5. `apps/web/src/features/admin`

原因：

1. 它们当前承载较多兼容层或非主链路能力
2. 过早改动会扩大联动面
3. 当前重构收益主要不在这些模块

## 6. 数据迁移约束

### 6.1 Schema 变更原则

涉及 schema 变更时，默认遵守：

1. 新增字段优先允许 `nullable`
2. 先写 schema + 代码兼容，再做回填
3. 回填前不得让接口强依赖新字段非空
4. 每次 schema 改动都要补“无旧数据 / 有旧数据 / 半旧半新数据”三种场景说明

### 6.2 本轮重点迁移对象

当前已知需要重点考虑回填策略的字段：

1. `PlannerRefinementVersion.sourceOutlineVersionId`
2. `PlannerShotScript.targetModelFamilySlug`
3. 任何用于 Planner -> Creation 交接的新元数据字段

## 7. 验证矩阵

### 7.1 每个 Phase 至少完成

1. 类型检查
2. 受影响纯逻辑的单元测试
3. 受影响路径的 smoke 验证
4. 文档同步更新
5. 至少一条“主路径成功”验证
6. 至少一条“失败路径不污染数据”验证

### 7.2 分层验证重点

后端：

1. route 输入校验
2. service/orchestrator 行为
3. schema 迁移与回填
4. run / worker / callback 正常闭环

前端：

1. 页面首屏可正常引导进入 workspace
2. 关键 CTA 调用的 API 路径与 payload 未漂移
3. 错误态不依赖旧 fixture 默认值“补出来”

文档：

1. 新增或调整的口径在 `master-index-v0.4.md` 中可定位
2. 被降级的旧文档头部有明确警告
3. 不再存在“当前基线引用不存在文件”的情况

### 7.3 AI 模块专项要求

所有 AI 相关重构默认必须同时满足 3 条：

1. 可观测：外部调用必须经过 transport hook，并可进入 `external_api_call_logs`
2. 可重现：prompt 组装、能力摘要、typed input、rerun scope 等纯逻辑必须有确定性单元测试覆盖
3. 可回归：仓库内必须存在可直接执行的回归入口，而不是只依赖人工点页面

当前执行入口：

1. `pnpm test:unit:api`
2. `pnpm test:ai:regression`
3. `pnpm test:web:regression`

当前辅助机制：

1. Planner prompt artifact 会随版本快照持久化到 `inputSnapshotJson.promptArtifact`
2. provider client 支持 file-based capture / replay：
   `AIV_PROVIDER_CAPTURE_DIR=/abs/path`
   `AIV_PROVIDER_REPLAY_DIR=/abs/path`
3. 浏览器主链路回归脚本已入仓：`scripts/smoke-browser-main-flow.py`
4. 失败分支测试应优先覆盖“不支持能力直接失败”和“为保护已有生成历史而拒绝 destructive finalize”两类高风险行为

## 8. 回滚与停手条件

出现以下情况时，应先停手收口，不继续横向扩写：

1. 一个 Phase 内同时改动 schema、provider、前端契约三层以上
2. 主路径 smoke 失败但仍继续引入新抽象
3. 文档与代码再次出现明显双轨
4. 新增抽象层无法明显减少耦合，反而增加调用跳转

## 9. 与其他文档的关系

本文与以下文档配套使用：

1. `docs/index/master-index-v0.4.md`
2. `docs/specs/backend-implementation-checklist-v0.3.md`
3. `docs/specs/frontend-workspace-contract-migration-v0.1.md`

其中：

1. `master-index-v0.4.md` 负责定义“信什么”
2. `backend-implementation-checklist-v0.3.md` 负责定义“按什么顺序做”
3. `frontend-workspace-contract-migration-v0.1.md` 负责定义“前端契约怎么迁”
