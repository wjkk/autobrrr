# 后端实施检查清单（v0.3）

版本：v0.3
日期：2026-03-16
状态：按当前代码现状重写后的实施与重构清单

## 1. 文档目的

本文不再描述“后端从零开工”的目标态任务，而是描述：

1. 当前已经完成了什么
2. 仍缺什么
3. 下一阶段应按什么顺序推进

## 2. 已完成基线

### 2.1 基础设施与认证

已完成：

1. `MySQL + Prisma` 已落地
2. `apps/api` 已可运行
3. 用户注册 / 登录 / 登出 / 当前用户查询 已落地
4. 业务接口默认已接入登录校验

### 2.2 项目与工作区

已完成：

1. `GET /api/studio/projects`
2. `POST /api/studio/projects`
3. `GET /api/studio/projects/:projectId`
4. Planner / Creation / Publish workspace 聚合查询

### 2.3 首页目录与项目入口配置

已完成：

1. 主体目录后端化
2. 画风目录后端化
3. 项目入口配置快照 `project_creation_configs`
4. 主体图模型目录查询
5. 主体图上传 / AI 生成
6. 用户侧目录页与后台公共目录页

### 2.4 Planner 主链路

已完成：

1. `outline -> refinement` 两阶段主流程
2. planner message timeline
3. outline / refinement 版本切换与确认
4. partial rerun
5. planner 主体 / 场景 / 分镜实体同步
6. planner 图片草稿生成
7. planner debug / replay / compare
8. sub-agent 草稿编辑与发布快照

### 2.5 Creation 主链路

已完成：

1. shot 图片生成命令
2. shot 视频生成命令
3. `Run + worker + polling/callback` 执行链路
4. `Asset + ShotVersion` 回写
5. run 查询与取消

### 2.6 Publish 主链路

已完成：

1. publish workspace 查询
2. publish submit 命令
3. 发布前活动版本检查

### 2.7 模型目录与 provider 配置

已完成：

1. model families / providers / endpoints
2. 用户级 provider 配置
3. provider test
4. provider model sync（Platou）
5. 用户默认模型与 enabled model 过滤

## 3. 当前未完成或未达标部分

### 3.1 系统文档收口

仍需继续收口：

1. `docs/specs/planner-agent-orchestration-spec-v0.1.md` 状态说明
2. `docs/specs/planner-workflow-and-document-spec-v0.1.md` 状态说明
3. 其余 specs 与 review 之间的交叉引用

### 3.2 AI 层收口不足

当前已完成：

1. AICSO provider 已从主执行链路剔除（2026-03-16）
2. `provider-adapters.ts` 已形成 gateway 雏形（ProviderAdapter interface + arkAdapter + platouAdapter）
3. 当前剩余 provider：`ark`（text only）、`platou`（text + image + video）

仍需重构：

1. `run.inputJson` 是裸 JSON 字段，路由写入与 adapter 读取靠字符串路径约定，编译期无保护
2. `catalog-subject-image.ts` 直连 `platou-client.ts`，是唯一绕开统一 gateway 的业务 AI 调用路径
3. `run-lifecycle.ts` 中 `resolveProviderSourceUrl` 找不到 URL 时回退到假地址 `https://generated.local/...`，静默污染 Asset 数据
4. `ark-client.ts` / `platou-client.ts` 无 instrumentation 钩子，Phase 3 的外部调用日志无法统一落点

### 3.3 Planner AI 专项缺口

当前 Planner + Creation AI 调用清单（代码层实际状态）：

**Planner 页**：

- 策划大纲/细化生成：TEXT，ARK（Doubao），同步，经 gateway ✅
- 局部重跑：TEXT，ARK（Doubao），同步，经 gateway ✅（但 scope 字符串化，见 Phase 2-F3）
- 主体草图生成：IMAGE，Platou，**直连 `platou-client.ts`，绕过 gateway** ⚠️（见 Phase 2-B）
- Debug 运行：TEXT，ARK（Doubao），同步，经 gateway ✅

**Creation 页**：

- Shot 图片生成：IMAGE，Platou，同步，经 gateway ✅
- Shot 视频生成：VIDEO，Platou，异步 + 6s 轮询，经 gateway ✅

**核心 AI 功能缺口**（影响产品差异化，优先级最高）：

1. Planner agent 生成 Shot Script 时，完全不知道目标视频模型是什么，输出通用描述而非模型专属格式
2. 没有 `model-capability.ts` 和 `shot-prompt-generator.ts`，亮点功能的两个核心服务层均未实现
3. 生成的 Shot 描述未经格式化就直接暴露给用户，需要手动改写才能投入视频生成
4. Planner 草稿图（`PlannerSubject.generatedAssetIds`）没有自动流转到 Creation Shot，数据链路断裂

### 3.4 外部调用日志不足

当前未完成：

1. 独立的 `external_api_call_logs` 表
2. request / response 全量审计
3. latency / trace id / provider request id 统一记录

### 3.5 AICSO 语义残留

已完全清除（2026-03-16）。清理范围：

1. `apps/api/src/lib/aicso-client.ts`：文件删除
2. `apps/api/src/lib/provider-adapters.ts`：移除 aicsoAdapter 及相关 helper
3. `apps/api/src/lib/catalog-subject-image.ts`：移除 aicso 分支
4. `apps/api/src/routes/provider-configs.ts`：移除 aicso import、test 块、pickTestEndpoint 分支
5. `apps/api/scripts/seed-model-registry.ts`：删除 AICSO provider、3 个 family、4 个 endpoint
6. `apps/api/scripts/smoke.ts`：移除 aicso 配置块和环境变量
7. `apps/web/src/features/settings/components/provider-config-page.tsx`：移除常量和 UI 文案
8. `docs/specs/internal-execution-api-spec-v0.3.md`：删除 7.2 AICSO 小节
9. `docs/specs/backend-system-design-spec-v0.3.md`：移除 aicso-client.ts 列项

### 3.6 dormant 模型未清理

当前需明确降级处理：

1. `GenerationRecipe`
2. `RecipeExecution`

说明：

1. 它们现在存在于 schema，但不应继续作为当前主实施清单的中心任务。

## 4. 下一阶段实施顺序

## Phase 1：文档与架构真相收口

1. 重写核心 specs，确保与代码一致
2. 固定代码真相源
3. 将系统复盘文档纳入主索引

DoD：

1. 文档可反映真实代码
2. 新人不再需要同时猜测“目标态”和“实现态”

## Phase 2：AI 层收口重构

原则：只抽出一个新文件 `provider-gateway.ts`，其余不建新包、不建新层，做六件有明确 DoD 的事。

**目标分层边界**：

```text
ark-client.ts / platou-client.ts    ← 纯 HTTP transport，含 instrumentation 钩子（Phase 2-D）
         ↓
provider-gateway.ts（新建）          ← provider 级能力入口，暴露：
                                       generateText / generateImage / submitVideo / queryVideoTask
         ↓                 ↓
provider-adapters.ts         catalog-subject-image.ts / provider /test 路由 / 未来 planner 同步调用
（只负责 Run 场景）           （都走 gateway，不直连 transport client）
```

这一分层解决了当前"provider-adapters.ts 既是 Run 执行适配器、又是所有业务能力入口"的语义混乱。

### A. RunInputPayload 类型化（判别联合 + Zod 运行时校验）

现状：

- `run.inputJson` 是 Prisma `Json` 字段，路由写入和 adapter 读取靠字符串路径约定
- 编译期无法检测字段名漂移（`getPrompt`、`getEndpointModelKey` 等函数都是字符串路径访问）
- `Run.inputJson` 是数据库字段，历史脏数据在运行时不会触发编译错误，纯 TS 类型不足以防护

目标产物：

- `RunInputPayload` 判别联合类型（`TextRunInput | ImageRunInput | VideoRunInput | PlannerDocRunInput`），按 `runType` 区分，各类型只含自身必要字段
- `runInputSchemaByType`：对应每个 `runType` 的 Zod schema，用于运行时校验从数据库读出的 JSON
- `parseRunInput(run): RunInputPayload`：从数据库 Run 对象读取并用 Zod 校验，失败抛出明确错误
- `serializeRunInput(...): Json`：写入时序列化，供路由层共用

DoD：

- 路由层写入 Run 和 adapter 读取 Run 共用同一类型定义
- 字段名改动触发编译错误，不再依赖字符串路径约定
- `parseRunInput` 对历史脏数据或格式错误抛出有意义的错误，不静默返回 undefined

### B. 新建 provider-gateway.ts，消灭业务侧直连 provider client

现状：

- `catalog-subject-image.ts` 直接调用 `submitPlatouImageGeneration()`，绕开所有统一入口
- `provider-adapters.ts` 同时承担"Run 执行适配"和"业务能力入口"两个职责，语义混乱
- Phase 3 日志在 `catalog-subject-image.ts` 路径漏网

目标产物：

- 新建 `lib/provider-gateway.ts`，暴露 provider 级能力函数：
  - `generateText(providerCode, config, input)`
  - `generateImage(providerCode, config, input)`
  - `submitVideoTask(providerCode, config, input) → taskId`
  - `queryVideoTask(providerCode, config, taskId) → status`
- `provider-gateway.ts` 是 `ark-client.ts` / `platou-client.ts` 的**唯一直接调用方**
- `provider-adapters.ts` 改为只负责 Run 场景，内部调用 `provider-gateway.ts` 而非直连 client
- `catalog-subject-image.ts`、`/test` 路由、未来 planner 同步图片调用：都走 `provider-gateway.ts`

规则：

- `ark-client.ts` / `platou-client.ts` 的导出函数只能被 `provider-gateway.ts` 调用
- 业务层（routes、lib 业务文件）不得 import provider client

DoD：

- `platou-client.ts` / `ark-client.ts` 的业务调用方只剩 `provider-gateway.ts`
- `catalog-subject-image.ts` 改为经过 `provider-gateway.ts`
- `/test` 路由改为经过 `provider-gateway.ts`（不需要塞进 Run adapter 语义）

### C. 删除 generated.local stub + 建立本地文件存储

现状：

- `run-lifecycle.ts` 中 `resolveProviderSourceUrl` 找不到 URL 时，回退到 `https://generated.local/${runId}.ext`
- Asset 被写入假 URL，后续媒体展示静默失败，无任何错误日志
- 当前 `Asset.sourceUrl` 直接存储 provider 返回的临时 URL（ARK / Platou TOS 链接，约 24h 失效）

目标：

**Asset 生命周期改为"下载 → 本地存储 → 未来同步 OSS"三段式**：

```text
provider 返回临时 URL（图片：同步；视频：轮询完成后）
         ↓
立即下载文件到本地（run-lifecycle.ts 回写阶段）
  └── 存储路径：apps/api/uploads/{image|video}/{YYYY-MM}/{assetId}.{ext}
         ↓
Asset.sourceUrl 写本地服务地址
  └── 格式：/uploads/{image|video}/{YYYY-MM}/{assetId}.{ext}
  └── 由 express 静态路由或专用 GET /uploads/* 路由提供访问
         ↓
（后期）OSS 同步 job
  └── 将 uploads/ 目录文件批量上传 OSS
  └── 更新 Asset.sourceUrl 为 OSS 永久地址
  └── 删除本地文件（可选，节省磁盘）
```

具体改动：

- 删除 `buildGeneratedAssetUrl` stub 函数
- `resolveProviderSourceUrl` 找不到 URL 时返回 `null`；调用方收到 `null` 时调 `failRun`
- 在 `state-machine-and-error-code-spec-v0.3.md` 中定义错误码 `RUN_FAILED_NO_OUTPUT_URL`
- 新增 `lib/asset-storage.ts`：封装下载 + 写本地 + 返回本地路径逻辑
- 图片（同步返回）：provider 调用完成后立即下载
- 视频（异步轮询）：poll 到 completed 状态后立即下载，再写 Asset

DoD：

- `https://generated.local` 从代码库完全消失
- Asset URL 缺失时 Run 状态变为 FAILED，错误码 `RUN_FAILED_NO_OUTPUT_URL`
- 所有图片/视频生成结果下载到本地后再写 `Asset.sourceUrl`，不直接存储 provider 临时 URL
- `uploads/` 目录可通过 HTTP 访问（静态路由已配置）
- OSS 同步为后期任务，当前 Phase 2 不实现

### D. Transport 层 instrumentation 钩子（Phase 3 前置）

现状：

- `ark-client.ts` 和 `platou-client.ts` 无任何 instrumentation
- 若只在 adapter 层落日志，`/test` 路由和 catalog 直连路径会漏网

目标：

- 在 `ark-client.ts` 和 `platou-client.ts` 的 HTTP 请求层加可替换的 instrumentation 钩子
- Phase 2 只需定义 hook interface 和插入点，实现可为 no-op；Phase 3 替换为写 `external_api_call_logs`
- 业务上下文（`runId` / `userId` / `projectId`）通过**显式传参**注入，不使用 `AsyncLocalStorage`
  - 理由：当前系统复杂度不需要 ALS，显式传参更易 debug，也无 Node.js 版本兼容问题
- **安全要求**：记录 request/response 时，`Authorization`、`apiKey`、`api_key` 等敏感字段必须脱敏（mask 为 `***`），不得明文落库

```typescript
// hook interface 参考（Phase 2 只需定义，实现为 no-op）
interface TransportHooks {
  onRequest?(ctx: {
    provider: string;
    path: string;
    runId?: string;
    userId?: string;
    projectId?: string;
  }): void;
  onResponse?(ctx: {
    provider: string;
    path: string;
    statusCode: number;
    latencyMs: number;
    runId?: string;
    error?: string;
  }): void;
}
```

DoD：

- `ark-client` / `platou-client` 的每一次 HTTP 请求都经过可替换的 instrumentation 钩子
- hook interface 已定义，Phase 3 只需替换实现
- 敏感字段脱敏逻辑在 hook 层统一处理，不依赖各调用方自行过滤

### E. AICSO 语义完全清除 ✓ 已完成（2026-03-16）

全仓库 AICSO 字符串已清零，执行 `seed:model-registry` 不再写入 AICSO 数据。

DoD：

- 仓库内无任何 AICSO 字符串残留（seed、前端、文档全部清除）
- 执行 `seed:model-registry` 不再写入 AICSO 数据

### Phase 2 总 DoD

1. `run.inputJson` 有编译期约束（TS 判别联合）和运行时校验（Zod schema），不同 runType 不共享字段定义
2. 业务代码不直连 provider client；`ark-client.ts` / `platou-client.ts` 只能被 `provider-gateway.ts` 调用
3. `provider-adapters.ts` 只负责 Run 场景，内部调用 `provider-gateway.ts`
4. 所有图片/视频生成结果下载到本地后再写 `Asset.sourceUrl`，不存储 provider 临时 URL
5. `Asset.sourceUrl` 不存在假 URL；URL 缺失时明确 failRun，错误码 `RUN_FAILED_NO_OUTPUT_URL`
6. `ark-client` / `platou-client` 有可替换的 instrumentation 钩子，敏感字段在 hook 层统一脱敏
7. 仓库内 AICSO 语义完全清除
8. Planner 版本链完整，版本数据原子同步，Rerun scope 有编译期约束

### F. Planner 架构基础修复（Phase 4 前置）

#### F-1. 版本链完整性

现状：

- `PlannerRefinementVersion` 没有 `sourceOutlineVersionId` 字段
- 无法追踪"这次细化来自哪个大纲"，版本决策链断裂

目标：

- 新增 `sourceOutlineVersionId String?` 字段及对应外键关系
- 执行 Prisma migration
- 创建 RefinementVersion 时写入来源大纲版本 ID

DoD：

- 任意 RefinementVersion 可追溯其来源 OutlineVersion
- 历史版本链可完整重建

#### F-2. 衍生数据原子同步

现状：

- `finalizePlannerConversation` 先创建 RefinementVersion，再同步 Subject/Scene/ShotScript
- 中途失败会留下有版本但无衍生数据的脏状态

目标：

- 将 RefinementVersion 创建 + Subject/Scene/Shot 同步包裹在同一 Prisma 事务中
- 中途失败整体回滚

DoD：

- 数据库中不存在"有 RefinementVersion 但无 Subject/Scene/Shot"的脏记录

#### F-3. Partial Rerun scope 类型化

现状：

- `applyPartialRerunScope` 通过字符串 `input.scope` 和 `input.targetEntity` 判断重跑范围
- 无 Zod 约束，字段漂移不触发编译错误

目标：

- 定义 `PlannerRerunScope` 判别联合类型：

```typescript
type PlannerRerunScope =
  | { type: 'full' }
  | { type: 'subjects_only' }
  | { type: 'scenes_only' }
  | { type: 'shots_only' }
  | { type: 'subject'; subjectId: string }
  | { type: 'scene'; sceneId: string }
  | { type: 'act'; actKey: string }
  | { type: 'shot'; shotId: string };
```

- 路由层和 orchestrator 统一使用该类型

DoD：

- `PlannerRerunScope` 字段变动触发编译错误
- 路由层 Zod 校验与 orchestrator 使用同一类型定义

#### F-4. Asset 关联稳定性修复

现状：

- `syncPlannerRefinementDerivedData` 通过 `normalize(title + prompt)` 匹配旧版本 Subject/Scene
- 用户改了标题，已生成的 asset 关联丢失

目标：

- 改为优先按实体 `id` 匹配（用户编辑时保留原 ID）
- 仅在 id 不存在时（新增实体）才走 normalize 兜底

DoD：

- 标题变更不导致 asset 关联丢失
- 新增实体正常获得新 ID

## Phase 3：外部调用审计能力

1. 新增 `external_api_call_logs`
2. 所有外部调用统一落日志
3. 建立 trace 关联：`run_id / user_id / project_id / provider_code / capability`

DoD：

1. 任意一次外部模型调用都可查 request / response / latency / error
2. 后期成本分析与失败分析有稳定数据来源

## Phase 4：模型感知分镜提示词生成 ⭐ 亮点功能

### 功能定位

Planner agent 在生成 `planner_shot_scripts` 时，不再输出通用描述，而是**按目标视频模型的能力特征，自动生成针对性的分镜提示词**。

核心价值：

- 对多镜头叙事模型（Seedance 2.0 / Veo 3.1 / Kling 3.0），输出包含镜头切换指令的完整叙事段落
- 对单镜头模型（Wan / Pika 等），自动拆分为逐镜独立描述
- 音效描述规则按模型能力自动选择（内联叙事 vs 忽略）
- 运镜词汇按模型语言习惯适配（中文分镜词 vs 英文电影术语）

### A. 模型能力注册表结构化

现状：

- 模型能力数据仅存在于文档（`memory/video-models-capability.md`）
- `model_families.capabilityJson` 字段为自由 JSON，无类型约束

目标产物：

- 定义 `VideoModelCapability` 类型，包含关键字段：
  - `supportsMultiShot: boolean` — 是否支持单次生成多镜头叙事
  - `maxShotsPerGeneration: number` — 单次最多镜头数（如 Seedance 1.0 Pro 为 3）
  - `promptStyle: 'narrative' | 'single-shot'` — 提示词风格
  - `audioDescStyle: 'inline' | 'none'` — 音效描述方式
  - `cameraVocab: 'chinese' | 'english-cinematic'` — 运镜词汇风格
  - `timestampMeaning: 'narrative-hint' | 'hard-constraint' | 'ignored'` — 时间码语义
- 更新 `seed-model-registry.ts`，为各 family 写入结构化能力数据
- 在 `lib/model-capability.ts` 中封装 `getVideoModelCapability(familySlug)` 查询函数

DoD：

- 每个 video model family 有完整的 `VideoModelCapability` 结构
- `getVideoModelCapability()` 编译期有类型约束，字段缺失即报错

### B. 分镜提示词生成服务

现状：

- `planner_shot_scripts` 仅存储 agent 原始输出的通用描述
- 无模型感知的提示词转化逻辑

目标产物：

- 新建 `lib/shot-prompt-generator.ts`
- 核心函数：`generateShotPrompt(shots: PlannerShotScript[], modelFamilySlug: string): ShotPromptOutput[]`
- 按模型能力实现两种核心模式：
  1. **多镜头叙事模式**（Seedance 2.0 / Veo 3.1 / Kling 3.0 等）：将多个 shot 合并为单次生成的分镜段落，包含景别切换词、运镜指令、内联音效描述
  2. **单镜头分拆模式**（Wan / Runway / Pika 等）：每个 shot 独立输出，保持简洁，去除音效字段

DoD：

- `generateShotPrompt` 对多镜头模型输出可直接投入使用的叙事段落
- 对单镜头模型输出按 shot 数量对应的独立提示词列表
- 音效描述内联/忽略逻辑由 `audioDescStyle` 字段驱动，不硬编码模型名

### C. Planner Agent 注入目标模型上下文

现状：

- Planner agent（`planner-orchestrator.ts`）生成 refinement 时，对目标模型无感知
- agent prompt 不包含任何模型能力提示，shot 描述为通用格式

目标产物：

- Planner refinement 阶段写入 `planner_shot_scripts` 时携带 `targetModelFamilySlug`
- agent system prompt 中注入目标模型的多镜头能力摘要，引导 agent 产出更适合该模型的 shot 描述原料
- 示例注入内容：`目标视频模型支持单次生成多镜头叙事，请在 shot 描述中明确使用景别词（全景/中景/近景/特写）和运镜词，便于后续提示词生成`

DoD：

- `PlannerShotScript` 记录携带 `targetModelFamilySlug`
- agent 在多镜头模型语境下主动使用景别词和运镜词，而非平铺描述

### D. Shot Prompt 预览接口

目标产物：

- `GET /api/studio/projects/:projectId/planner/shot-prompts?modelSlug=xxx`
- 接受可选 `modelSlug` 参数，默认取项目配置的默认视频模型
- 返回按目标模型格式化的分镜提示词列表，供前端预览、一键复制、或直接提交生成

DoD：

- 前端可通过该接口预览任意模型格式的分镜提示词
- 切换模型 slug 即可实时重新格式化，无需重新运行 Planner

### Phase 4 总 DoD

1. 任意 shot script 可按目标模型 slug 生成针对性提示词
2. 多镜头模型输出含镜头切换、运镜、内联音效的完整叙事段落
3. 单镜头模型输出拆分后的逐镜独立描述
4. Planner agent 在多镜头模型语境下主动产出更适合该模型的原始描述
5. Shot prompt 预览接口可用，支持前端切换模型实时重新格式化

---

## Phase 5：Planner 体验升级

依赖：Phase 4 完成（模型感知分镜提示词已就绪）

### A. SSE 实时步骤推送

现状：

- Planner 生成过程中用户只能等待，`ASSISTANT_STEPS` 消息在完成后整体展示
- 对长时间生成（多幕剧本）用户体验极差

目标：

- 新增 SSE 端点：`GET /api/projects/:projectId/planner/stream`
- `planner-orchestrator.ts` 执行过程中，通过 SSE 推送步骤事件：
  - `{ event: 'step_started', stepKey, stepTitle }`
  - `{ event: 'step_done', stepKey, details[] }`
  - `{ event: 'generation_done', versionId }`
- 前端订阅 SSE，实时展示步骤进度，完成后 fetch 完整版本数据

DoD：

- 用户在 Planner 生成过程中可实时看到步骤推进
- 生成完成后前端自动切换到新版本文档，无需手动刷新

### B. Shot 级精细化重跑

现状：

- 最细粒度的重跑为 `shots_only`（全部分镜重跑）或 `act` 级别
- 无法单独重跑某一个 Shot

目标：

- 路由支持 `PlannerRerunScope = { type: 'shot', shotId }` 和 `{ type: 'act', actKey }`
- agent 接收单 shot 上下文：前后镜头 + 所在幕 + 角色信息 + 目标模型能力
- 只更新目标 Shot 字段，不修改其他 Shot

DoD：

- 用户可对任意 Shot 发起"仅重生成此镜头"操作
- 其他 Shot 不受影响

### C. 策划确认 → Creation 交接

现状：

- 没有明确的"策划完成"动作
- ShotScript → Creation Shot 的转换路径不清晰，用户不知道什么时候可以去 Creation

目标：

- 新增接口：`POST /api/projects/:projectId/planner/finalize`
- 动作：
  1. 当前 `activeRefinement` 标记 `isConfirmed = true`
  2. 按 `ShotScript[]` 批量创建或更新 `Shot` 记录
  3. 将 Subject/Scene 的 `generatedAssetIds` 写入 Shot 草稿图绑定
  4. 将 `targetVideoModelFamilySlug` 写入每个 Shot 的关联元数据
- 完成后前端跳转到 Creation Workspace

DoD：

- 用户点击"确认策划"后，Creation 中立即出现按分镜结构排好的 Shot 列表
- 每个 Shot 带有草稿图引用和目标模型关联

### Phase 5 总 DoD

1. Planner 生成过程有实时步骤进度，不再是黑盒等待
2. 用户可对任意 Shot 发起单独重跑，不影响其他内容
3. "确认策划"动作可以一键打通 Planner → Creation 数据链路

---

## Phase 6：API 分层重构

1. route 层只保留协议转换
2. 业务逻辑下沉到 service / orchestrator
3. provider 逻辑收口到 adapter / gateway
4. repository 边界显式化

DoD：

1. route 文件明显变薄
2. AI 能力与业务逻辑分离

## Phase 7：前端与后端契约清理

1. 对 workspace DTO 做正式冻结
2. 清理前端残余 mock/旧状态逻辑
3. 统一错误码与状态映射

DoD：

1. web 不再依赖隐式字段猜测
2. 工作区 DTO 成为稳定契约

## 5. 当前不再建议继续投入的旧任务

以下任务不再作为当前近期优先级：

1. 先上 Redis 再说
2. 先把 Recipe 全链路做完
3. 先把 event bus 协议做全
4. 继续围绕旧文档里的 `event_logs` 目标态补代码

原因：

1. 这些不是当前真实系统的主要瓶颈
2. 当前更紧迫的是：文档真相、AI 模块化、外部调用日志

## 6. 当前实施判断

今天的后端不是“等待开工”的状态，而是：

1. 主业务链路已可运行
2. 架构需要第二阶段系统性重构
3. 下一阶段的重点已经从“从零搭建”切换成“重构与模块化升级”
