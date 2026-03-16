# Phase 2 AI 重构文件级任务拆解（v0.1）

版本：v0.1
日期：2026-03-16
状态：执行清单（服务于 Phase 2 落地）

## 1. 文档目的

本文把 [backend-implementation-checklist-v0.3.md](/Users/jiankunwu/project/aiv/docs/specs/backend-implementation-checklist-v0.3.md) 中的 Phase 2，进一步拆成“具体文件谁改什么”的执行清单。

本文不替代 Phase 2 的 DoD，而是把 DoD 落到文件和模块。

配套文档：

1. `docs/specs/ai-refactor-architecture-spec-v0.1.md`
2. `docs/specs/backend-implementation-checklist-v0.3.md`
3. `docs/specs/refactor-execution-guardrails-v0.1.md`
4. `docs/specs/internal-execution-api-spec-v0.3.md`

## 2. 提交级实施序列

为了避免一次提交同时改动 gateway、run input、storage、planner 修复，Phase 2 推荐拆成 6 个提交批次。

当前进度（2026-03-16）：

1. `Commit 1` 已完成：`run-input.ts` 已落地，主路径 Run 创建已切到 `serializeRunInput`，`provider-adapters.ts` 已切到统一解析入口
2. `Commit 2` 已完成：`provider-gateway.ts` 已落地，`provider-adapters.ts`、`catalog-subject-image.ts`、`planner-debug.ts`、`provider-configs.ts` 主测试路径已改走 gateway
3. ARK 多能力预留与注册表修正：`R-05A` 已完成，`seed-model-registry.ts` 已加入 ARK 的 IMAGE / VIDEO / AUDIO family 预留，`provider-configs.ts` 已改成 capability-aware 测试分发；`R-05B` 已完成，ARK 图片已接入统一 gateway 并通过真实 provider test；剩余真实 VIDEO / AUDIO 接入拆分为 `R-05C / R-05D`
4. 本地文件存储替代临时 URL：已完成，`asset-storage.ts`、本地上传访问路由、`run-lifecycle.ts` 的下载落盘链路都已接通，`generated.local` 已从 API 代码路径移除
5. `Transport Hooks`：已完成当前阶段，`transport-hooks.ts` 已落地，`ark-client.ts` / `platou-client.ts` 已接入统一 hook 触发点；Phase 3 已将其接到 `external_api_call_logs`，server / worker 双端自动安装 hook
6. `Planner 基础修复`：进行中，Prisma schema 已补 `sourceOutlineVersionId`，`planner-orchestrator.ts` 已开始写入 lineage，`planner-rerun-scope.ts` 已落地，`planner-partial-reruns.ts` 已开始兼容 typed `rerunScope`，前端 `planner-page.tsx` 已改发 typed `rerunScope`，`planner-doc.ts` / `planner-refinement-projection.ts` / `planner-refinement-sync.ts` 已开始接入 `entityKey` 以提升 asset 继承稳定性，Web `planner-structured-doc.ts` 已开始保留 `entityKey` round-trip
7. Focused smoke：已补 `smoke-planner-refactor.ts`，用于验证 `entityKey` 资产投影、多镜头 prompt 生成与 capability 解析；`smoke-planner-api-refactor.ts` 已通过，覆盖了标题改写后实体 ID/资产绑定保持稳定、主体资产回写同步到 structured doc、资产回写后的再次整包保存、shot entity patch 后 projection 同步、typed `rerunScope` 落库、refinement activation 后 workspace / run output 同步六条真实 API 路径

状态收口结论：

1. 可视为已完成：`R-06`、`R-08`、`R-09`
2. `R-07` 已完成；focused API smoke 已补齐 planner media generation 路径，事务边界验证闭环成立
3. `R-04` 已完成，Phase 3 的 `external_api_call_logs` 账本已接通并通过 focused smoke
4. 已拆成按 provider readiness 推进的持续项：`R-05C`、`R-05D`

每个提交批次要求：

1. 改动面单一
2. 能独立做类型检查
3. 能独立跑最小 smoke
4. 文档口径和代码同步

### Commit 1：Run Input 类型化骨架

目标：

1. 新建 `apps/api/src/lib/run-input.ts`
2. 引入 `RunInputPayload` 判别联合
3. 让 `provider-adapters.ts` 先摆脱字符串路径解析

主要文件：

1. `apps/api/src/lib/run-input.ts`
2. `apps/api/src/lib/provider-adapters.ts`
3. `apps/api/src/routes/creation-commands.ts`
4. `apps/api/src/routes/planner-commands.ts`
5. `apps/api/src/routes/planner-partial-reruns.ts`
6. `apps/api/src/routes/planner-outline-versions.ts`
7. `apps/api/src/routes/planner-refinement-versions.ts`
8. `apps/api/src/routes/planner-media-generation.ts`
9. `apps/api/src/routes/publish-commands.ts`

本提交不做：

1. 不引入 `provider-gateway.ts`
2. 不改本地文件存储
3. 不改 transport hooks

完成标准：

1. `provider-adapters.ts` 不再直接靠字符串路径读取 `inputJson`
2. 所有创建 Run 的主路径改走 `serializeRunInput`
3. 历史脏数据会在 `parseRunInput` 明确失败

最小验证：

1. 类型检查通过
2. planner 文本 run 可正常创建并完成
3. creation 图片 run 可正常创建并进入执行链路

### Commit 2：Provider Gateway 收口

目标：

1. 新建 `apps/api/src/lib/provider-gateway.ts`
2. 让所有业务同步调用不再直连 provider client
3. `provider-adapters.ts` 收缩为 Run-only

主要文件：

1. `apps/api/src/lib/provider-gateway.ts`
2. `apps/api/src/lib/provider-adapters.ts`
3. `apps/api/src/lib/catalog-subject-image.ts`
4. `apps/api/src/routes/provider-configs.ts`
5. `apps/api/src/routes/planner-debug.ts`
6. `apps/api/src/lib/ark-client.ts`
7. `apps/api/src/lib/platou-client.ts`

本提交不做：

1. 不改 `run-lifecycle.ts` 的本地落盘逻辑
2. 不加 instrumentation hook

完成标准：

1. 业务代码不再 import `ark-client.ts` / `platou-client.ts`
2. `catalog-subject-image.ts` 走 gateway
3. `/api/provider-configs/:providerCode/test` 走 gateway

最小验证：

1. provider test 文本路径可用
2. planner 主体图生成路径可用
3. creation 图片 / 视频主路径不回归

### Commit 3：ARK 多能力预留与注册表修正

目标：

1. 把 ARK 多能力接入正式落到注册表和测试入口
2. 移除一切 `ark = text-only` 假设

主要文件：

1. `apps/api/scripts/seed-model-registry.ts`
2. `apps/api/src/routes/model-registry.ts`
3. `apps/api/src/routes/provider-configs.ts`
4. `apps/api/src/lib/provider-gateway.ts`

本提交不做：

1. 不要求一次性接完 ARK 全部 image / video / audio capability
2. 不做 planner 侧新功能

完成标准：

1. `seed-model-registry.ts` 不再只把 ARK 当 text family provider
2. provider test 与 gateway 接口对 ARK 新能力可扩展
3. 后续新增 ARK endpoint 不需要再改 Phase 2 分层

最小验证：

1. model registry 接口可返回新增的 ARK family / endpoint
2. provider test 不因 ARK family 增加而报错
3. 现有 Platou 路径不受影响

### Commit 4：本地文件存储替代临时 URL

目标：

1. 删除 `generated.local`
2. 图片 / 视频结果先下载到本地，再写 `Asset.sourceUrl`

主要文件：

1. `apps/api/src/lib/asset-storage.ts`
2. `apps/api/src/lib/run-lifecycle.ts`
3. `apps/api/src/server.ts`
4. `apps/api/src/routes/assets.ts`
5. `docs/specs/state-machine-and-error-code-spec-v0.3.md`

完成标准：

1. 代码库不再出现 `https://generated.local`
2. provider 临时 URL 不直接写进 `Asset.sourceUrl`
3. URL 缺失时明确失败

最小验证：

1. 图片生成完成后本地 `uploads/` 有文件
2. 视频轮询完成后本地 `uploads/` 有文件
3. 返回的 `Asset.sourceUrl` 为本地可访问路径
4. 无 URL 输出时 run 明确失败

### Commit 5：Transport Hooks

目标：

1. 在 `ark-client.ts` / `platou-client.ts` 增加 instrumentation hook
2. 为 Phase 3 的 `external_api_call_logs` 铺路

主要文件：

1. `apps/api/src/lib/transport-hooks.ts`
2. `apps/api/src/lib/ark-client.ts`
3. `apps/api/src/lib/platou-client.ts`
4. `apps/api/src/lib/provider-gateway.ts`
5. `apps/api/src/lib/provider-adapters.ts`
6. `apps/api/src/routes/provider-configs.ts`
7. `apps/api/src/lib/catalog-subject-image.ts`

完成标准：

1. transport client 有统一 hook 接口
2. 上下文参数能显式透传
3. 敏感字段脱敏入口统一

最小验证：

1. 文本 / 图片 / 视频调用都能经过 hook
2. no-op 默认实现不影响现有主路径
3. 敏感字段在 hook 层被统一处理

### Commit 6：Planner 基础修复

目标：

1. 修复版本链
2. 修复 refinement 同步原子性
3. 修复 rerun scope 类型化
4. 修复 asset 关联稳定性

主要文件：

1. `apps/api/prisma/schema.prisma`
2. `apps/api/prisma/migrations/*`
3. `apps/api/src/lib/planner-orchestrator.ts`
4. `apps/api/src/lib/planner-refinement-projection.ts`
5. `apps/api/src/lib/planner-rerun-scope.ts`
6. `apps/api/src/routes/planner-partial-reruns.ts`
7. `apps/api/src/routes/planner-commands.ts`
8. `apps/api/src/routes/planner-outline-versions.ts`
9. `apps/api/src/routes/planner-refinement-versions.ts`

完成标准：

1. `sourceOutlineVersionId` 可追溯
2. 衍生数据同步在事务内
3. `PlannerRerunScope` 类型统一
4. asset 关联不再主要依赖标题匹配
5. 前端 structured doc round-trip 不会丢失稳定标识

最小验证：

1. outline -> refinement 正常完成
2. partial rerun 在新 scope 类型下可用
3. 标题修改后 asset 关联不丢失
4. 中途失败不会留下脏 refinement 版本
5. Web/API 双侧 typecheck 通过

当前剩余残项：

1. `smoke-planner-api-refactor.ts` 现已覆盖 planner media generation：包括 shot `generate-image` run 创建、run finalize、资产落盘后 `PlannerShotScript` 与 structured doc 投影同步
2. refinement activation、资产回写后的再次整包保存、shot entity patch 同步已纳入真实 API smoke
3. 不再预期需要重做 `entityKey` 或 `typed rerunScope` 的主设计

## 3. 执行顺序

建议按以下顺序推进，避免互相打架：

1. A. `Run.inputJson` 类型化
2. B. `provider-gateway.ts` 收口
3. C. 本地文件存储替代临时 URL / 假 URL
4. D. transport instrumentation hook
5. E. ARK 多能力接入预留
6. F. Planner 基础修复
7. G. smoke / 文档 / 清尾

## 4. 工作流 A：Run.inputJson 类型化

### 3.1 新增文件

1. `apps/api/src/lib/run-input.ts`

目标：

1. 定义 `RunInputPayload` 判别联合
2. 定义各 `runType` 对应 Zod schema
3. 暴露 `parseRunInput(run)` 与 `serializeRunInput(input)`

### 3.2 必改文件

1. `apps/api/src/lib/provider-adapters.ts`
   目标：删除 `getPrompt`、`getEndpointModelKey`、`getProviderCode` 这类字符串路径读取，统一改用 `parseRunInput`
2. `apps/api/src/routes/creation-commands.ts`
   目标：创建图片 / 视频 Run 时改用 `serializeRunInput`
3. `apps/api/src/routes/planner-commands.ts`
   目标：创建 planner run 时改用 `serializeRunInput`
4. `apps/api/src/routes/planner-partial-reruns.ts`
   目标：局部重跑的 run 输入改走统一类型
5. `apps/api/src/routes/planner-outline-versions.ts`
   目标：版本切换/重跑相关 run 输入改走统一类型
6. `apps/api/src/routes/planner-refinement-versions.ts`
   目标：细化版本相关 run 输入改走统一类型
7. `apps/api/src/routes/planner-media-generation.ts`
   目标：Planner 主体 / 场景 / 分镜图片生成 Run 输入改走统一类型
8. `apps/api/src/routes/publish-commands.ts`
   目标：Publish run 输入如继续存在，至少接入统一序列化入口
9. `apps/api/src/lib/run-lifecycle.ts`
   目标：读取 `run.inputJson` 时改用统一 parser，而不是散落的 `readObject`

### 3.3 验证

1. 任一 `runType` 字段名变更会触发编译错误
2. 历史脏数据能在 `parseRunInput` 抛出明确错误
3. `provider-adapters.ts` 内不再有基于字符串路径的输入解析 helper

## 5. 工作流 B：provider-gateway.ts 收口

### 4.1 新增文件

1. `apps/api/src/lib/provider-gateway.ts`

目标导出：

1. `generateText`
2. `generateImage`
3. `submitVideoTask`
4. `queryVideoTask`
5. 音频相关能力入口预留（命名可在实现时定稿，但 Phase 2 不能把 gateway 设计写死成仅 text/image/video）

### 4.2 必改文件

1. `apps/api/src/lib/provider-adapters.ts`
   目标：adapter 内部只调用 `provider-gateway.ts`
2. `apps/api/src/lib/catalog-subject-image.ts`
   目标：目录主体图生成改走 `provider-gateway.ts`
3. `apps/api/src/routes/provider-configs.ts`
   目标：`/test` 路由改走 `provider-gateway.ts`；`sync-models` 不属于本阶段重点
4. `apps/api/src/routes/planner-debug.ts`
   目标：去掉对 `ark-client.ts` / `platou-client.ts` 的直接 import，改走 gateway 或单独 debug-safe wrapper
5. `apps/api/src/lib/ark-client.ts`
   目标：收缩为纯 transport
6. `apps/api/src/lib/platou-client.ts`
   目标：收缩为纯 transport
7. `apps/api/scripts/seed-model-registry.ts`
   目标：移除“ARK 只有 text family”的规划假设，至少把 family / endpoint 结构改成可继续扩展到 IMAGE / VIDEO / AUDIO
8. `apps/api/src/routes/model-registry.ts`
   目标：确认 Ark 新增 family / endpoint 后，无需额外 provider 特判即可透出

### 4.3 需要确认的边界

1. `planner-debug.ts` 是否全部改走 gateway，还是保留单独 debug transport wrapper  
   当前建议：改走 gateway，避免文档口径再次双轨
2. `provider-configs.ts` 的 model sync 能力暂不纳入 gateway  
   当前建议：只改 `/test` 路径，不扩大到 catalog sync
3. ARK 的 IMAGE / VIDEO / AUDIO 是否在 Phase 2 直接全量接入  
   当前建议：Phase 2 先完成架构和注册表预留，至少不要再让 `ark` 被文档与代码结构写死成 text-only；具体 capability 接入可按 endpoint readiness 逐项落地

### 4.4 验证

1. `ark-client.ts` / `platou-client.ts` 的业务直接调用方只剩 `provider-gateway.ts`
2. `catalog-subject-image.ts` 不再 import provider client
3. `provider-configs.ts` `/test` 路径不再 import provider client
4. `seed-model-registry.ts` 与 gateway 设计中不再存在 “ark = text-only” 的硬编码假设

## 6. 工作流 C：本地文件存储替代临时 URL / 假 URL

### 5.1 新增文件

1. `apps/api/src/lib/asset-storage.ts`

职责：

1. 下载 provider 返回的临时 URL
2. 写入 `apps/api/uploads/{image|video}/{YYYY-MM}/...`
3. 返回本地访问路径与基础元数据

### 5.2 必改文件

1. `apps/api/src/lib/run-lifecycle.ts`
   目标：
   - 删除 `buildGeneratedAssetUrl`
   - `resolveProviderSourceUrl` 找不到地址时返回 `null`
   - 图片 / 视频在写 `Asset` 前先走 `asset-storage.ts`
2. `apps/api/src/server.ts`
   目标：补静态资源访问或 `/uploads/*` 路由
3. `apps/api/src/routes/assets.ts`
   目标：如现有 asset 返回字段依赖 `sourceUrl` 语义，确认本地路径可直接暴露
4. `docs/specs/state-machine-and-error-code-spec-v0.3.md`
   目标：补 `RUN_FAILED_NO_OUTPUT_URL`

### 5.3 验证

1. 代码库中不再出现 `https://generated.local`
2. provider 临时 URL 不直接写入 `Asset.sourceUrl`
3. URL 缺失时 Run 进入 FAILED，而不是静默成功

## 7. 工作流 D：transport instrumentation hook

### 6.1 必改文件

1. `apps/api/src/lib/ark-client.ts`
2. `apps/api/src/lib/platou-client.ts`

目标：

1. 定义统一 hook interface
2. 在 HTTP request / response 两侧插入 hook
3. 统一敏感字段脱敏入口

### 6.2 可能新增文件

1. `apps/api/src/lib/transport-hooks.ts`

建议职责：

1. 定义 hook 类型
2. 统一 no-op 默认实现
3. 统一脱敏 helper

### 6.3 需要联动文件

1. `apps/api/src/lib/provider-gateway.ts`
   目标：显式把 `runId / userId / projectId / capability` 等上下文往下透传
2. `apps/api/src/lib/provider-adapters.ts`
   目标：Run 场景补齐传参
3. `apps/api/src/routes/provider-configs.ts`
   目标：测试路径补齐传参
4. `apps/api/src/lib/catalog-subject-image.ts`
   目标：目录生成路径补齐传参
5. `apps/api/scripts/seed-model-registry.ts`
   目标：为后续 ARK 多能力接入保留统一 capability 元数据入口

### 6.4 验证

1. transport client 层已有 hook interface
2. 默认实现可为 no-op，但接入点完整
3. 敏感字段脱敏不依赖调用方手工处理

## 8. 工作流 E：ARK 多能力接入预留

### 7.1 必改文件

1. `apps/api/scripts/seed-model-registry.ts`
   目标：为 ARK 增加可继续扩展到 IMAGE / VIDEO / AUDIO 的 family / endpoint 结构，不再只有 text family 口径
2. `apps/api/src/lib/provider-gateway.ts`
   目标：接口命名和能力路由允许 ARK 接入 image / video / audio，而不需要重新拆层
3. `apps/api/src/routes/provider-configs.ts`
   目标：`/test` 路径允许后续为 ARK 扩展 image / video / audio 测试
4. `apps/api/src/routes/model-registry.ts`
   目标：Ark 新 family / endpoint 接入后可以自然透出

### 7.2 交付要求

1. Phase 2 不要求一次性完成 ARK 全能力接入
2. 但必须把 ARK 的 IMAGE / VIDEO / AUDIO 接入正式列入开发计划
3. 不能再在任何现行文档、gateway 设计、registry 设计中把 ARK 固化为 text-only

### 7.3 验证

1. 新增 ARK image / video / audio family / endpoint 不需要重构 gateway 分层
2. provider test 的接口形态不需要因为 ARK 新能力接入而推翻
3. 文档中 ARK 多能力接入已被明确写入计划

## 9. 工作流 F：Planner 基础修复

### 8.1 Schema / migration

1. `apps/api/prisma/schema.prisma`
   目标：新增 `PlannerRefinementVersion.sourceOutlineVersionId`
2. `apps/api/prisma/migrations/*`
   目标：补 migration 与回填策略说明

### 8.2 必改文件

1. `apps/api/src/lib/planner-orchestrator.ts`
   目标：
   - 创建 refinement version 时写 `sourceOutlineVersionId`
   - 将版本创建与衍生数据同步包进事务
2. `apps/api/src/lib/planner-refinement-projection.ts`
   目标：同步逻辑支持事务化调用，并优先按实体 ID 保留 asset 关联
3. `apps/api/src/routes/planner-partial-reruns.ts`
   目标：引入 `PlannerRerunScope` 判别联合 + Zod 校验
4. `apps/api/src/routes/planner-commands.ts`
   目标：若有 refinement 入口拼装 scope / stage 输入，统一改用类型化结构
5. `apps/api/src/routes/planner-outline-versions.ts`
   目标：版本切换与来源 outline 关系一致化
6. `apps/api/src/routes/planner-refinement-versions.ts`
   目标：active refinement 切换逻辑与新字段口径一致

### 8.3 可能新增文件

1. `apps/api/src/lib/planner-rerun-scope.ts`

职责：

1. 定义 `PlannerRerunScope`
2. 暴露 route / orchestrator 共用 schema 与 TS 类型

### 8.4 验证

1. `sourceOutlineVersionId` 能完整追溯版本链
2. 中途失败不会留下“有 refinement version 但无衍生数据”的脏记录
3. `PlannerRerunScope` 不再靠字符串常量散落判断
4. 标题变化不再导致已有 asset 关联丢失

## 10. 工作流 G：验证与清尾

### 9.1 必改文件

1. `apps/api/scripts/smoke.ts`
   目标：补 Phase 2 主路径 smoke
2. `docs/specs/backend-implementation-checklist-v0.3.md`
   目标：如落地中发现新的文件边界或前置依赖，及时回写
3. `docs/specs/ai-refactor-architecture-spec-v0.1.md`
   目标：如实现与单页基线有偏移，先修正文档再继续扩写代码

### 9.2 推荐 smoke 覆盖

1. planner 文本生成 run 正常完成
2. planner 主体图生成走 gateway
3. creation 图片生成结果写本地 `uploads`
4. creation 视频轮询完成后写本地 `uploads`
5. provider test 路径走 gateway
6. 缺失 output URL 时返回明确失败

## 11. 并行建议

可以并行：

1. 工作流 A 与工作流 E
2. 工作流 B 与工作流 D
3. 文档更新与 smoke 脚本补充

不要并行：

1. 工作流 B 与工作流 C 的最终收口提交  
   原因：gateway 调整和 lifecycle 存储调整会同时影响生成主路径，容易互相遮蔽问题
2. Schema 迁移与前端契约迁移  
   原因：Phase 7 尚未开始，不应提前扩大联动面

## 12. 完成定义

Phase 2 文件级层面视为完成，至少满足：

1. `provider-gateway.ts` 已存在并成为业务同步 AI 调用统一入口
2. `provider-adapters.ts` 只负责 Run 场景
3. `run-input.ts` 已接管 `Run.inputJson` 的类型化与校验
4. `asset-storage.ts` 已接管临时 URL 下载与本地落盘
5. `ark-client.ts` / `platou-client.ts` 已有可替换 instrumentation hook
6. Planner 基础修复已完成最小闭环
7. smoke 覆盖至少通过一条 planner 和一条 creation 主路径
8. ARK 的多能力接入已进入统一规划口径，不再被视为 text-only provider
