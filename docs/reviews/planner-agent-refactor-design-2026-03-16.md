# Planner Agent 重构设计（v0.1）

日期：2026-03-16
状态：设计草稿，待评审后纳入实施清单

---

## 0. 竞品参照与差异化定位

### 0.1 Seko（商汤）策划页输出分析

通过对 Seko 策划页实际输出页面（`plan.html`）的分析，Seko 每个分镜的字段结构如下：

| 字段 | 示例值 |
| --- | --- |
| 画面描述 | 大刘抱着喵霸，从客厅入口处走入画面中央，脸上带着兴奋的笑容。 |
| 构图设计 | 全景，三分法构图 |
| 运镜调度 | 固定镜头 / 慢推，聚焦喵霸 / 跟镜头，跟随小绿飞行 |
| 配音角色 | 旁白 / 大刘 / 小绿 |
| 台词内容 | "当当当当！家庭新成员，喵霸！" |

**Seko 的核心局限**（这是我们的差异化切入点）：

1. **每个分镜是完全孤立的单元** — 没有任何跨镜头的连续生成逻辑
2. **无模型感知** — 构图和运镜描述是通用汉字，不针对任何具体视频模型优化
3. **1 分镜 = 1 次视频生成** — 用户需要一条一条地提交，无法利用多镜头模型的多镜头叙事能力
4. **无音效描述** — 没有声音/音效字段，生成视频后音效质量取决于模型默认
5. **提示词未合成** — 用户看到的是分离字段，需要手动拼接或直接使用画面描述作为 prompt

### 0.2 我们的差异化策略

在 Seko 的基础字段之上，我们通过**模型感知分镜提示词生成**实现差异化：

| 能力维度 | Seko | 我们（目标态） |
| --- | --- | --- |
| 分镜单元 | 每个 Shot 独立 | 支持多 Shot 合并为单次生成 |
| 模型感知 | 无 | 按目标模型生成专属提示词格式 |
| 提示词输出 | 原始字段，需手动拼接 | 一键输出可直接投入视频模型的完整提示词 |
| 多镜头叙事 | ❌ 不支持 | ✅ Seedance 2.0 / Veo 3.1 / Kling 3.0 自动生成多镜头叙事段落 |
| 音效描述 | ❌ 无 | ✅ 按模型能力决定是否内联音效描述 |
| 运镜词汇 | 通用中文 | 按模型语言习惯选择（中文 vs 英文电影术语） |

**亮点场景举例**：

同样的 4 个相邻分镜（01-1 到 01-4，均在"现代科技感客厅"），Seko 需要用户分 4 次提交视频生成；我们在 Seedance 2.0 模式下，自动将这 4 镜合并为 1 条多镜头叙事提示词，用户一次提交即可生成含 4 次镜头切换的连贯视频。

---

## 1. AI 功能现状盘点与目标架构

### 1.1 Planner 页：AI 调用现状

| 调用场景 | 触发点 | 模型类型 | Provider | 调用方式 | 当前问题 |
| --- | --- | --- | --- | --- | --- |
| 策划大纲生成 | generate-doc（outline 阶段） | TEXT | ARK（Doubao） | 同步，经 gateway | TEXT 模型硬绑定，无视频模型感知 |
| 策划细化生成 | generate-doc（refinement 阶段） | TEXT | ARK（Doubao） | 同步，经 gateway | agent prompt 不携带目标模型能力，输出通用描述 |
| 局部重跑 | partial-rerun | TEXT | ARK（Doubao） | 同步，经 gateway | scope 字符串化，无编译期约束 |
| 主体草图生成 | catalog-subject-image | IMAGE | Platou | 同步，**直连 platou-client.ts，绕过 gateway** | 唯一绕开统一 gateway 的业务 AI 调用路径 |
| Debug 运行 | planner-debug | TEXT | ARK（Doubao） | 同步，经 gateway | 结果无法 apply 到主流程 |

**核心缺口**：

- TEXT 模型全部走 ARK Doubao，Planner 对用户配置的其他文本模型无感知
- Agent prompt 完全不携带目标视频模型能力信息，输出的 shot 描述是通用格式，**无法直接投入视频生成**
- `shot-prompt-generator.ts` 与 `model-capability.ts` 均未实现，亮点功能的核心服务层缺失

### 1.2 Creation 页：AI 调用现状

| 调用场景 | 触发点 | 模型类型 | Provider | 调用方式 | 状态 |
| --- | --- | --- | --- | --- | --- |
| Shot 图片生成 | shot image command | IMAGE | Platou | 同步，经 gateway | ✅ 正常 |
| Shot 视频生成 | shot video command | VIDEO | Platou | 异步 + 轮询（6s interval） | ✅ 正常 |
| Run 状态轮询 | run-worker（nextPollAt 定时触发） | — | Platou | `queryPlatouVideoGeneration` | ✅ 正常 |

**Creation 页 AI 链路相对完整，但存在关键数据断层**：

- Planner 策划完成后，`ShotScript.visualDescription` 等通用描述**未经模型感知格式化**就暴露给用户，用户需要手动改写
- `PlannerSubject.generatedAssetIds`（策划阶段生成的角色草稿图）**没有自动流转**到 Creation Shot，需要用户手动关联

### 1.3 目标 AI 架构：端到端多镜头叙事全链路

以下是目标态下从策划到视频生成的完整 AI 数据流：

```text
用户选择目标视频模型（如 Seedance 2.0）
         ↓
Planner refinement 执行（planner-orchestrator.ts）
  ├── model-capability.ts 生成模型能力摘要
  ├── 注入摘要到 agent system prompt
  │     "目标模型 Seedance 2.0 支持多镜头叙事，请使用景别词和运镜词"
  ├── Agent 输出带景别词/运镜词的 shot 描述
  └── 写入 PlannerShotScript + targetModelFamilySlug
         ↓
shot-prompt-generator.ts（按模型格式化）
  ├── Seedance 2.0 / Kling 3.0：将同 act 的 N 个 shot 合并为多镜头叙事段落
  ├── Veo 3.1：合并 + 转英文电影运镜术语
  └── Wan 2.6 / Pika：每个 shot 独立输出，移除音效字段
         ↓
GET /planner/shot-prompts?modelSlug=seedance-2.0（预览接口）
  └── 前端可切换模型实时重新格式化，不需要重跑 Planner
         ↓
用户点击"确认策划" → POST /planner/finalize
  ├── 格式化后的提示词写入 Shot 记录
  └── 草稿图（generatedAssetIds）自动绑定到 Shot.materialBindings
         ↓
Creation Workspace
  ├── 直接展示按分镜结构组织的 Shot 列表
  ├── 每个 Shot 携带已格式化的视频生成提示词（可直接提交）
  └── 多镜头模型模式：相邻分镜自动合并为单次视频生成任务
```

**与 Seko 的核心差距体现于此**：Seko 用户需要对 4 个相邻分镜分 4 次手动提交视频生成，AIV 在 Seedance 2.0 模式下将 4 镜合并为 1 条提示词，用户一次提交即可生成含 4 次镜头切换的连贯视频。

### 1.4 架构修复优先级汇总

| 问题 | 当前状态 | 目标状态 | 优先级 |
| --- | --- | --- | --- |
| `catalog-subject-image.ts` 直连 `platou-client` | 绕过 gateway | 改走 `provider-adapters.ts` | P1（Phase 2-B） |
| Agent prompt 无视频模型能力注入 | 无 | `model-capability.ts` 生成摘要注入 | **P0**（Phase 4-C） |
| `shot-prompt-generator.ts` 缺失 | 不存在 | 完整实现多镜头/单镜头两种模式 | **P0**（Phase 4-B） |
| 视频生成提示词未经格式化 | 通用描述直接暴露 | 经 `shot-prompt-generator` 格式化后再使用 | **P0** |
| Planner → Creation 数据链路断裂 | 用户手动复制 | `finalize` API 自动流转提示词和草稿图 | P1（Phase 5-C） |
| TEXT 模型无感知切换 | 硬绑定 ARK | 走模型注册表，支持用户配置 | P2 |
| 无 SSE 实时进度 | 完成后整体展示 | `step_started` / `step_done` 事件推送 | P2（Phase 5-A） |

---

## 2. 当前问题诊断

### 2.1 架构缺陷（代码层，影响功能正确性）

**A. 版本链断裂**

`PlannerRefinementVersion` 没有 `sourceOutlineVersionId` 字段，无法追踪"这次细化来自哪个大纲"。结果：

- 版本历史无法重建完整的决策链
- 切换大纲版本后重新细化时，旧的细化版本与新大纲的关系不清
- 调试时无法还原"当时基于哪个大纲生成的"

**B. 衍生数据同步非原子**

`syncPlannerRefinementDerivedData` 在创建 `RefinementVersion` 后，再同步 Subject / Scene / ShotScript。若中途报错，版本已存在但衍生数据不完整，数据库处于脏状态，无法自动恢复。

**C. Partial Rerun scope 字符串化**

`applyPartialRerunScope` 通过 `input.scope`（字符串）和 `input.targetEntity` 来决定重跑范围，没有 Zod schema 约束。字段名漂移触发不了编译错误，测试覆盖困难。

**D. Asset 关联在版本切换时脆弱**

衍生数据同步通过对 `title + prompt` normalize 做字符串匹配来保留 asset 关联。用户改了标题，关联断裂，已生成的图片丢失。

**E. Debug 运行与主流程脱节**

`PlannerDebugRun` 表保存了调试运行的完整输出，但没有办法将调试结果"应用"到主流程，也无法将主流程运行在调试页中回放。两套机制互相独立。

---

### 2.2 用户体验缺口

**F. 生成过程是黑盒**

当前 Planner 执行时，用户只能等待，无法感知 agent 正在做什么。`ASSISTANT_STEPS` 消息在批量生成完成后才整体展示，不是实时进度。

**G. 局部修改需要全量重跑**

用户说"第二幕镜头感不对，改一下"，只能走整体 refinement 重跑，耗时久且其他已调好的内容可能被意外改动。Shot 级精细化重跑路径不清晰。

**H. 策划完成的终点不清晰**

用户不知道"策划到什么程度才算可以去 Creation"。缺少明确的"确认发布策划"动作，也没有明确的 Shot Script → Creation Shot 映射路径的说明。

**I. Agent 对目标视频模型无感知**

Agent 生成 Shot Script 时，不知道用户最终要用哪个视频模型生成视频。生成的 `visualDescription`、`composition`、`cameraMotion` 是通用描述，无法直接投入 Seedance 2.0 或 Veo 3.1。

---

### 2.3 功能缺失

**J. 无模型感知分镜提示词**（最重要，亮点功能）

当前 ShotScript 有 `visualDescription`、`composition`、`cameraMotion` 三个分离字段，但没有合并后的、面向特定视频模型的完整提示词。

问题：
- Seedance 2.0 要求景别词触发多镜头叙事，音效描述内联
- Veo 3.1 要求英文电影运镜术语，参考图最多 3 张
- 单镜头模型（Pika / Wan）需要每次只描述一个镜头

如果 Planner 只输出通用描述，用户每次都要手动按模型格式改写，违背了"导演级可控"的产品定位。

**K. 无版本对比能力**

当前可以切换激活版本，但无法在同一页面对比两个版本的差异（如大纲 v1 vs 大纲 v2 的人物设定有何不同）。

**L. 无输入快照完整回放**

虽然 `inputSnapshotJson` 存储了部分输入上下文，但没有完整的 prompt 快照（包含 system prompt 和 developer prompt）。无法精确重现某次生成时的完整 LLM 调用。

---

## 3. 目标态：完整 Planner Agent 能力矩阵

| 能力 | 现状 | 目标 | 优先级 |
| --- | --- | --- | --- |
| 两阶段策划（Outline → Refinement） | ✅ 已有 | 增加版本链关联 | P1 |
| 版本历史与切换 | ✅ 已有 | 补 Outline → Refinement 溯源 | P1 |
| 版本对比 | ❌ 无 | 前端双版本对比 | P3 |
| 全量重跑 | ✅ 已有 | 保持 | - |
| 局部重跑（类型化 scope） | ⚠️ 脆弱 | 判别联合类型约束 | P1 |
| Shot 级精细化重跑 | ❌ 无 | 支持 shot/act 级别重生成 | P2 |
| 衍生数据原子同步 | ❌ 有风险 | 事务包装 | P1 |
| Asset 关联稳定性 | ⚠️ 脆弱 | 改为 ID 匹配而非 title 匹配 | P1 |
| 生成进度实时反馈 | ⚠️ 批量后展示 | SSE 推送步骤进度 | P2 |
| 模型感知 Shot Prompt | ❌ 核心缺失 | **亮点功能，完整实现** | **P0** |
| Agent 目标模型注入 | ❌ 无 | 生成时携带目标模型能力 | **P0** |
| Shot Prompt 预览接口 | ❌ 无 | API + 前端切换模型预览 | **P0** |
| 完整 Prompt 快照 | ⚠️ 不完整 | 完整保存 system + developer + messages | P2 |
| 策划确认 → Creation 推送 | ⚠️ 路径不清 | 明确 finalize 动作和转换规则 | P1 |
| Debug 与主流程打通 | ❌ 脱节 | Debug 运行可 apply 到主流程 | P3 |

---

## 4. 核心设计决策

### 4.1 模型感知分镜提示词（⭐ 亮点功能核心设计）

#### 设计原则

- **生成时感知，按需格式化**：ShotScript 存储的是结构化原始数据（visualDescription + composition + cameraMotion），不改变存储结构
- **格式化在服务层完成**：`shot-prompt-generator.ts` 负责按模型能力将原始字段组合成最终提示词
- **模型可切换**：同一套 ShotScript 可以随时切换目标模型并重新格式化

#### ShotScript 扩展字段（新增）

```prisma
model PlannerShotScript {
  // 现有字段保持不变 ...

  // 新增：目标视频模型（可选，不填则使用项目默认）
  targetModelFamilySlug  String?

  // 新增：Agent 在生成时使用的景别/运镜风格提示（原始值）
  // 用于存储 agent 已经按模型语义生成的描述，与通用 cameraMotion 并存
  modelHintedMotion      String?
}
```

#### 提示词生成逻辑（shot-prompt-generator.ts）

输入：`PlannerShotScript[]` + `modelFamilySlug` + `VideoModelCapability`

**多镜头叙事模式**（supportsMultiShot: true）：

- 将连续 N 个 shot（同一 act 或按 maxShotsPerGeneration 分组）合并为单条提示词
- 使用景别词（全景/中景/近景/特写）+ `cameraVocab` 指定的运镜词汇
- 若 `audioDescStyle = 'inline'`，将 `dialogue` 和环境音描述融入叙事文本
- 若目标模型为 Veo 3.1，运镜词改为英文电影术语

**单镜头模式**（supportsMultiShot: false）：

- 每个 shot 独立输出一条提示词
- 移除音效描述
- 移除时间码
- 保持动作描述简洁单一

#### 示例输出对比（同一 ShotScript，不同模型）

原始数据：
```
visualDescription: "马良背着柴草走在乡间小路上，表情落寞"
composition: "中景侧面，背景是远山和夕阳"
cameraMotion: "固定机位，缓慢推进"
dialogue: ""（无）
```

Seedance 2.0 输出：
```
中景侧面，马良背着柴草走在乡间小路上，表情落寞，
远山和夕阳作为背景，镜头缓缓推进，脚步声和风声轻柔混入。
```

Veo 3.1 输出：
```
Medium shot from the side, a boy named Ma Liang carrying a bundle of firewood
walks along a rural path, looking dejected. Mountain silhouettes and warm sunset
in background. Slow dolly push. Natural ambient sound of wind and footsteps.
```

Wan 2.6 / Pika（单镜头分拆）输出：
```
一个衣衫褴褛的古代男孩背着一捆柴草，走在黄土乡间小路上，
远山夕阳作为背景，表情落寞疲惫，画面静谧。
```

---

### 4.2 Agent 目标模型注入

在 Planner refinement 执行时，从以下来源解析目标视频模型：

1. 用户选择的 `targetVideoModelFamilySlug`（存储在 `ProjectCreationConfig` 或请求参数）
2. 如果没有显式选择，使用项目默认视频模型（`ModelEndpoint.isDefault = true` 的 VIDEO 类型）

注入到 agent system prompt 的内容（由 `model-capability.ts` 生成）：

```
目标视频生成模型：Seedance 2.0
支持能力：
- 单次生成最多 6 个镜头的连贯叙事（多镜头叙事模式）
- 音效描述：请将音效融入叙事文本，不要单独标注
- 运镜词汇：使用中文景别词（全景/中景/近景/特写）和运镜词（推镜/拉镜/摇镜/移镜）
- 时间码：可作为节奏提示，不是硬约束

请在生成 shot 描述时主动使用上述景别词和运镜词，确保分镜描述适合该模型直接使用。
```

---

### 4.3 Partial Rerun 类型化

废弃当前字符串 scope，改为判别联合类型：

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

对应路由请求体统一走 Zod 判别联合校验，编译期和运行期都有约束。

---

### 4.4 版本链完整性

`PlannerRefinementVersion` 新增字段：

```prisma
model PlannerRefinementVersion {
  // 现有字段保持不变 ...

  // 新增：来源大纲版本（可选，直接从需求生成的 refinement 为 null）
  sourceOutlineVersionId  String?
  sourceOutlineVersion    PlannerOutlineVersion? @relation(fields: [sourceOutlineVersionId], references: [id])
}
```

---

### 4.5 衍生数据原子同步

`finalizePlannerConversation` 中，将 `RefinementVersion` 创建 + Subject/Scene/Shot 同步 包裹在同一个 Prisma 事务中：

```typescript
await prisma.$transaction(async (tx) => {
  const refinementVersion = await tx.plannerRefinementVersion.create(...);
  await syncDerivedData(tx, refinementVersion, newDoc, previousProjection);
});
```

若中途失败，整个操作回滚，不产生脏数据。

---

### 4.6 策划确认与 Creation 交接

明确定义"策划确认"动作：

**触发条件**：用户主动点击"确认策划，进入创作"（非自动触发）

**动作内容**：

1. 将当前 `activeRefinement` 标记为 `isConfirmed = true`
2. 按 `ShotScript[]` 批量创建或更新 `Shot` 记录
3. 复制 `PlannerSubject.generatedAssetIds` → `Shot.materialBindings`（草稿图绑定）
4. 将 `ProjectCreationConfig.targetVideoModelFamilySlug` 写入每个 `Shot` 的关联元数据

**结果**：Creation Workspace 中可以立即看到按分镜结构组织好的 Shot 列表，每个 Shot 带有草稿图和准备好的提示词。

---

## 5. 实施分阶段建议

### 阶段一：架构基础修复（纳入 Phase 2 代码质量项）

优先级：P1，影响数据正确性

1. `PlannerRefinementVersion` 添加 `sourceOutlineVersionId` 字段（schema + migration）
2. `finalizePlannerConversation` 改为事务包装
3. `applyPartialRerunScope` 改为 `PlannerRerunScope` 判别联合
4. Subject/Scene asset 关联改为 ID 稳定匹配（不依赖 title normalize）

---

### 阶段二：模型感知分镜提示词（Phase 4，⭐ 亮点功能）

优先级：P0，核心产品差异化能力

完整内容见 `backend-implementation-checklist-v0.3.md` Phase 4，本文不重复。

关键依赖：阶段一完成后实施，确保 ShotScript 数据干净。

---

### 阶段三：Planner 体验升级（新 Phase）

优先级：P2，用户体验质量提升

**3-A. SSE 实时步骤推送**

- 在 `planner-orchestrator.ts` 执行过程中，通过 SSE 推送每个步骤的开始/完成事件
- 前端订阅 `GET /api/projects/:projectId/planner/stream`
- 推送格式：`{ event: 'step_started' | 'step_done', stepKey, stepTitle, details? }`
- 整体完成后推送 `{ event: 'generation_done', versionId }`，前端再 fetch 完整数据

**3-B. Shot 级精细化重跑**

- 用户可以右键单个 Shot，选择"重新生成这个镜头"
- 后端接收 `{ type: 'shot', shotId }` scope，只重跑该 shot 的描述
- agent 接收单 shot 的上下文（前后镜头 + 当前 act + 角色信息）
- 输出只更新该 Shot 的字段，不触碰其他 Shots

**3-C. 策划确认 → Creation 交接流程**

- 明确的确认动作 API：`POST /api/projects/:projectId/planner/finalize`
- 交接完成后，跳转到 Creation Workspace，Shot 列表已填充

---

### 阶段四：调试与可观测性（与 Phase 3 外部审计合并）

优先级：P3

**4-A. 完整 Prompt 快照持久化**

- 将 `systemPromptFinal` + `developerPromptFinal` + `messagesFinal` 存入 `PlannerRefinementVersion.promptSnapshotJson`
- Phase 3 的 external_api_call_logs 中同时记录 Planner 相关的 LLM 调用

**4-B. Debug 运行 Apply 到主流程**

- 在调试页，"应用此次调试结果"按钮将 `PlannerDebugRun.assistantPackageJson` 应用为正式版本
- 实质是用调试结果的 structuredDoc 创建新的 PlannerRefinementVersion

---

## 6. 本文档与实施清单的关系

本文是设计草稿，实施时按以下文档为准：

- `docs/specs/backend-implementation-checklist-v0.3.md` — 各 Phase 的具体 DoD 和任务拆分
- `docs/specs/video-model-capability-spec-v0.1.md` — 模型能力参数，Phase 4 实施参考
- `apps/api/prisma/schema.prisma` — 所有 schema 变更以此为准

---

## 7. 不纳入当前重构范围的能力

以下能力有价值但当前不作为优先项：

1. **多集策划视图** — 跨集的主体/场景复用，当前每集独立策划已满足 MVP
2. **版本 A/B 对比** — 有价值但前端工作量大，后期专项
3. **脚本导入** — 从文本脚本自动生成 outline，属于独立功能，不在本次范围
4. **角色/场景资产库** — 跨项目复用素材库，属于平台层能力，独立规划
