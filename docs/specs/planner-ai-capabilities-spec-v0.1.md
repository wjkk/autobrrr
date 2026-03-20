# Planner AI 能力与策划工作台规格（v0.1）

版本：v0.1
日期：2026-03-16
状态：现行执行基线（Planner AI 专项）

> 路由口径说明（2026-03-20）：
> 本文若引用旧写法 `/api/projects/:projectId/planner/*`，当前实际外部路由统一以 `/api/planner/projects/:projectId/*` 为准。

## 1. 文档目的

本文用于把策划阶段最关键的产品与 AI 能力收成一份可执行基线，解决三个问题：

1. `plan.html` 中 Seko 策划页的真实工作方式到底是什么。
2. AIV 的 Planner 在产品交互、结构化文档、版本机制、模型感知能力上应当如何落地。
3. 哪些能力属于本轮必须做，哪些能力必须明确延后，避免边做边改口径。

本文聚焦 Planner 阶段，不覆盖以下文档的原始职责：

1. `docs/specs/backend-implementation-checklist-v0.3.md`：Phase 顺序与 DoD
2. `docs/specs/ai-refactor-architecture-spec-v0.1.md`：AI 分层与 gateway / adapters / client 边界
3. `docs/specs/internal-execution-api-spec-v0.3.md`：Run / Worker / callback 协议
4. `docs/specs/video-model-capability-spec-v0.1.md`：视频模型能力字段定义

若本文与代码现状冲突，以代码为准；若本文与上述高可信基线冲突，以对应高可信基线为准。

## 2. 事实来源与裁决规则

本文基于以下事实来源整理：

1. [`plan.html`](/Users/jiankunwu/project/aiv/plan.html) 中复制自 Seko 的真实策划页内容
2. `apps/api/src/routes/planner-*.ts`
3. `apps/api/src/lib/planner-orchestrator.ts`
4. `docs/archive/specs/planner-workflow-and-document-spec-v0.1.md`
5. `docs/reviews/planner-agent-refactor-design-2026-03-16.md`

裁决规则：

1. `plan.html` 用于反推工作台形态、区块划分、字段呈现方式和交互心智，不直接约束 AIV 必须逐像素复刻。
2. AIV 可以明显偏离 Seko，但偏离必须服务于真实视频生成效率，不能只是换文案或换布局。
3. 本轮重构的重点不是“做一个更像聊天框的 Planner”，而是做一个真正能把策划结果稳定交给 Creation 的策划工作台。

## 3. 核心判断

### 3.1 Planner 不是聊天页，而是工作台

`plan.html` 已经明确展示出四个并列区域：

1. 最左侧：剧集轨道（`剧集` + `01/02/03` + 新增剧集按钮）
2. 中左：消息时间线（用户输入、AI 步骤、确认、回执）
3. 中右：当前剧集的结构化策划文档
4. 底部：分镜图模型、画面比例、查看视频等生成配置与后续入口

结论：

1. Planner 的最小作用域不是“整个项目”，而是“项目下的某个 episode”。
2. 左侧不是文档本体，而是驱动文档生成与修改的会话工作区。
3. 右侧不是消息回显，而是正式结构化产物。
4. 底部配置不是装饰，它决定后续分镜图与视频生成的目标约束。

### 3.2 Planner 是两阶段产物，不是一次性大文档

Seko 页面与现有代码都支持以下两阶段：

1. `策划剧本大纲`
2. `细化剧情内容`

这两个阶段的输出对象不同：

1. Outline 阶段产出“故事级/系列级规划”，解决角色、调性、篇幅、单集走向。
2. Refinement 阶段产出“当前剧集可生产文档”，解决主体、场景、分镜、配音、草图、后续 prompt 原料。

结论：

1. Outline 和 Refinement 必须继续保留为两个版本体系。
2. 右侧正式工作文档以 Refinement 为主，不应再把两阶段混进一个模糊 schema。
3. “确认大纲”和“确认策划进入创作”是两个不同动作，不能合并。

### 3.3 AIV 不能只复刻 Seko，必须超出 Seko

从 `plan.html` 能看出 Seko 的强项是：

1. 左侧步骤感强
2. 右侧文档结构清楚
3. 主体/场景/分镜都可视化

它的明显短板也很清楚：

1. 分镜字段偏静态描述，缺少面向目标视频模型的能力感知
2. 分镜到视频生成之间仍需用户手动搬运
3. 不擅长多镜头叙事模型的提示词合成
4. 缺少明确的音效/环境声字段

AIV 的目标不是“另一个 Seko”，而是：

1. 保留 Seko 工作台心智
2. 在 Planner 阶段就为 `Seedance 2.0` 这类多镜头模型准备好结构化原料
3. 用 `finalize` 真正打通 Planner -> Creation，而不是把用户继续困在手工改 prompt 的链路里

## 4. Seko 工作台反推结论

### 4.1 剧集轨道

`plan.html` 明确展示：

1. 左侧存在 `剧集` 轨道
2. 当前项目至少可切换 `01 / 02 / 03`
3. 存在“新增剧集”按钮

这说明：

1. 剧集是 Planner 的一级维度，不是文档内部字段
2. 每个 episode 应有独立的 PlannerSession / OutlineVersion / RefinementVersion
3. 切换剧集，本质是切换“当前激活的 episode 工作区”

本轮裁决：

1. `episodeId` 必须继续作为 Planner 路由和工作区查询的显式参数
2. 多集项目创建后，每集默认拥有独立策划空间
3. 跨集共享主体/场景复用属于后续增强，不作为本轮前置依赖

### 4.2 左侧消息时间线

`plan.html` 中可明确识别的左侧卡片类型包括：

1. 用户原始主题输入
2. Assistant 身份确认消息
3. `策划剧本大纲` 步骤卡
4. 大纲文档卡（线程内嵌）
5. AI 对大纲的解释与确认引导
6. 用户确认大纲
7. Refinement 阶段步骤卡
8. 文档更新回执

因此 AIV 的消息时间线不应只有“user / assistant 自由文本”，而应至少支持：

```ts
type PlannerTimelineMessage =
  | UserPromptMessage
  | AssistantAckMessage
  | AssistantStepAnalysisMessage
  | AssistantOutlineCardMessage
  | AssistantConfirmationRequestMessage
  | UserConfirmMessage
  | AssistantDocumentReceiptMessage
  | AssistantFinalizeReceiptMessage
  | AssistantErrorMessage;
```

各类卡片的职责边界：

1. `UserPromptMessage`：用户原始需求、追问、修改意见
2. `AssistantAckMessage`：AI 对当前任务的理解确认，不承载正式产物
3. `AssistantStepAnalysisMessage`：结构化展示“正在做什么”
4. `AssistantOutlineCardMessage`：仅在 Outline 阶段出现的线程内摘要卡
5. `AssistantConfirmationRequestMessage`：要求用户确认是否进入下一阶段
6. `AssistantDocumentReceiptMessage`：告诉用户“右侧哪些区块已更新”
7. `AssistantFinalizeReceiptMessage`：告诉用户“哪些结果已正式推送到 Creation”
8. `AssistantErrorMessage`：产出失败、局部失败、可重试建议

### 4.3 右侧结构化策划文档

`plan.html` 中右侧目录明确存在：

1. `故事梗概`
2. `美术风格`
3. `主体列表`
4. `场景列表`
5. `分镜剧本`

这意味着右侧文档不是松散 JSON，而是稳定的信息架构。

`plan.html` 中单个分镜还明确展示了 5 个可见字段：

1. `画面描述`
2. `构图设计`
3. `运镜调度`
4. `配音角色`
5. `台词内容`

同时，主体区和场景区都不是纯文本，而是：

1. 列表描述
2. 对应的生成图片卡
3. 主体区还包含音色试听能力

结论：

1. 右侧是“面向生产的结构化文档”，不是聊天结果的美化版
2. 主体、场景、分镜都必须是可持续复用的数据对象
3. 分镜字段必须同时兼顾“给人看”和“给后续 prompt generator 用”

### 4.4 底部生成配置

`plan.html` 底部清楚展示了：

1. `分镜图模型`
2. `画面比例`
3. `查看视频`

这说明策划页不只是“写剧本”，而是和后续生成紧密耦合。

本轮裁决：

1. 底部配置必须视为 Planner 文档的一部分上下文，而不是 UI 独立状态
2. `imageModelEndpoint`、`aspectRatio`、目标 `videoModelFamily` 等配置必须能稳定传给后续 prompt 生成和 finalize
3. 模型切换带来的影响需要明确定义是否创建新版本，不能含糊

## 5. AIV Planner AI 的目标能力

### 5.1 阶段 1：策划剧本大纲

目标：

1. 把一个主题或一句创意扩成可持续细化的故事规划
2. 明确系列基本设定、角色、篇幅与单集走向
3. 给用户一个值得确认的方向，而不是一次性把所有 shot 生完

输入：

1. 主题 / 设定 / 一句话创意
2. 可选上传剧本全文
3. 内容模式与剧集数
4. 题材 / 风格 / 主体偏好
5. 可选参考主体、参考画风

输出：

1. `OutlineVersion`
2. 左侧大纲阶段时间线消息
3. 线程内嵌大纲卡

本阶段 AI 要完成的事：

1. 扩写世界观与冲突核心
2. 给出主要角色与关系
3. 给出系列调性与美术方向
4. 给出每集情节概要
5. 给出是否适合进入 Refinement 的判断

本阶段不做的事：

1. 不强行生成主体图、场景图、完整分镜
2. 不在此阶段产出正式视频 prompt
3. 不因为目标视频模型切换而频繁重写整个大纲

### 5.2 阶段 2：细化剧情内容

目标：

1. 把已确认 Outline 细化成当前 episode 的生产文档
2. 生成主体、场景、分镜、草图、配音和提示词原料
3. 为后续 `shot-prompt-generator.ts` 和 `planner/finalize` 准备稳定输入

输入：

1. 已确认的 `OutlineVersion`
2. 当前 `episodeId`
3. 当前创作配置（画风、画幅、目标模型等）
4. SubAgentProfile / 用户补充要求
5. 可选上传剧本全文与追问内容

输出：

1. `RefinementVersion`
2. 右侧完整 `RefinementDoc`
3. 左侧步骤卡与文档回执
4. 主体图 / 场景图 / 分镜草图等衍生资产

本阶段 AI 要完成的事：

1. 生成故事梗概与亮点摘要
2. 定义美术风格
3. 生成主体列表及视觉描述
4. 生成场景列表及视觉描述
5. 拆解幕与分镜
6. 给出配音角色与台词草稿
7. 为后续模型感知 prompt 生成提供高质量 shot 原料

## 6. 右侧文档的目标结构与字段归属

### 6.1 文档顶层结构

当前 AIV 目标文档应收敛到：

```ts
interface RefinementDoc {
  projectTitle: string;
  episodeTitle: string;
  episodeNumber: number;
  episodeCount: number;
  storySummary: {
    synopsis: string[];
    highlights: Array<{ title: string; description: string }>;
  };
  artStyle: {
    baseStyle: string[];
    styleDescription: string;
  };
  subjects: PlannerSubjectDoc[];
  scenes: PlannerSceneDoc[];
  script: {
    summary: {
      sceneCount: number;
      narrationVoice?: string;
    };
    acts: PlannerActDoc[];
  };
  storyboardConfig: {
    imageModelEndpointId?: string;
    aspectRatio: '16:9' | '9:16' | '4:3' | '3:4';
    targetVideoModelFamilySlug?: string;
  };
}
```

`storyboardConfig` 的结构边界：

1. 本轮将其定义为右侧文档视图中的投影对象，而不是要求把整段配置 JSON 持久化到 `RefinementDoc`。
2. 其值仍主要来自项目级 `ProjectCreationConfig` 与当前 Planner 上下文。
3. 只有确实需要做版本级追踪的字段，才以单字段方式落入版本或 shot 记录，例如 `targetModelFamilySlug`。
4. 本轮不因为 `storyboardConfig` 额外引入新的独立 schema blob 或额外 migration。

### 6.2 分镜字段裁决

`plan.html` 的 5 个可见字段必须保留：

1. `visualDescription`
2. `composition`
3. `cameraMotion`
4. `voiceRole`
5. `dialogue`

但 AIV 为了服务 `Seedance 2.0` 等模型，还必须明确增加两个字段：

1. `durationSeconds?`
2. `soundDesign?`

推荐最小 shot 结构：

```ts
interface PlannerShotDoc {
  id: string;
  shotNo: string;
  title?: string;
  durationSeconds?: number;
  visualDescription: string;
  composition: string;
  cameraMotion: string;
  soundDesign?: string;
  voiceRole: string;
  dialogue: string;
  subjectIds: string[];
  sceneId?: string;
}
```

新增字段的必要性：

1. `durationSeconds`：便于多镜头模型做分组与总时长控制
2. `soundDesign`：便于 `audioDescStyle = inline` 的模型把环境声、拟音、音乐自然写入 prompt

### 6.3 字段归属规则

#### AI 起草、用户可编辑

以下字段默认由 AI 起草，但允许用户直接改：

1. `storySummary`
2. `artStyle`
3. `subjects[].appearance / personality / prompt`
4. `scenes[].description / prompt`
5. `shots[].visualDescription`
6. `shots[].composition`
7. `shots[].cameraMotion`
8. `shots[].soundDesign`
9. `shots[].voiceRole`
10. `shots[].dialogue`

#### 系统维护、用户不可直接编辑

以下字段属于系统导出或追踪字段：

1. `versionId`
2. `sourceOutlineVersionId`
3. `generatedAssetIds`
4. `referenceAssetIds`
5. `targetVideoModelFamilySlug`
6. `promptPreviewJson`
7. `promptSnapshotJson`
8. `finalizedAt`

#### 派生字段，不应让用户手填

以下字段应由服务层派生而非让用户手工维护：

1. shot prompt preview
2. 多镜头分组结果
3. `Shot.promptJson`
4. `Shot.targetVideoModelFamilySlug`

## 7. 版本、副本、确认、重跑

### 7.1 版本类型

Planner 至少存在两套版本：

1. `OutlineVersion`
2. `RefinementVersion`

它们各自都有：

1. `isActive`
2. `isConfirmed`
3. `versionNumber`

### 7.2 必须创建新副本的场景

以下动作必须创建新版本，不能原地覆盖：

1. 重新生成大纲
2. 基于已确认大纲继续改故事方向
3. 首次进入 Refinement
4. 用户要求 AI 重写主体 / 场景 / 某幕 / 某几个 shot
5. debug replay 结果被采纳为正式策划结果
6. 已确认策划后再发起新的 AI 修改

原因：

1. Planner 的核心不是“始终只保留一个最新版文档”，而是“保留可回溯、可确认、可派生的版本链”

### 7.3 允许原地 patch 的场景

以下动作可以 patch 当前激活版本，不强制建新版本：

1. 用户直接编辑文档字段
2. 用户改标题、台词、个别文案
3. 用户调整底部配置但尚未请求 AI 重写

补充裁决：

1. 若当前版本已 `isConfirmed = true`，则不允许再原地 patch；应先“基于当前版本创建草稿副本”再修改
2. 手工 patch 与 AI 重跑必须在审计上可区分

### 7.4 确认动作

需要保留两个确认动作：

1. `确认大纲，进入细化`
2. `确认策划，进入创作`

前者只意味着：

1. 某个 `OutlineVersion` 被确认
2. Refinement 可以开始

后者意味着：

1. 当前 `RefinementVersion` 被确认
2. 触发 `POST /api/projects/:projectId/planner/finalize`
3. Planner -> Creation 正式交接

### 7.5 局部重跑

局部重跑是 Planner 成功率的关键，必须继续存在。

建议统一为判别联合：

```ts
type PlannerRerunScope =
  | { type: 'full' }
  | { type: 'subjects_only' }
  | { type: 'scenes_only' }
  | { type: 'shots_only' }
  | { type: 'subject'; subjectId: string }
  | { type: 'scene'; sceneId: string }
  | { type: 'act'; actId: string }
  | { type: 'shot'; shotIds: string[] };
```

补充裁决：

1. `subjects_only / scenes_only / shots_only` 保留为当前兼容变体，主要用于承接现有 route 与迁移中的旧调用方式。
2. `subject / scene / act / shot` 是后续重构后的主推荐变体，用于表达更清晰的实体级重跑语义。
3. 新实现优先使用实体级变体；兼容变体在完成迁移前不删除。

局部重跑的规则：

1. 本质上仍然生成新的 `RefinementVersion`
2. 未命中的区块尽可能复用上一个版本
3. 左侧消息要明确告诉用户“本次只重跑了哪些部分”

## 8. 左右联动规则

### 8.1 基本规则

左侧负责解释“为什么变”，右侧负责展示“现在是什么”。

不允许：

1. 右侧发生大面积变化，左侧没有任何回执
2. 左侧说“已更新”，但用户不知道右侧具体哪个区块变了

### 8.2 推荐回执内容

`AssistantDocumentReceiptMessage` 至少应包含：

1. 本次更新阶段：outline / refinement
2. 本次变更范围：全量 / 主体 / 场景 / 分镜 / 某一幕
3. 右侧受影响区块
4. 是否生成了新副本
5. 是否需要用户确认

### 8.3 模型切换的特殊规则

切换目标视频模型时：

1. 仅查看 `shot-prompt` 预览：不创建新的 `RefinementVersion`
2. 请求 AI 按该模型重写分镜原料：创建新的 `RefinementVersion`

这是本轮必须固定的口径，否则后续会出现“切个模型就污染主策划版本”的问题。

## 9. 多集项目的 Planner 口径

### 9.1 本轮必须做

1. 项目创建时若开启多集，必须要求输入 `episodeCount`
2. 为每个 episode 初始化独立 Planner 工作空间
3. `GET /workspaces`、`generate-doc`、`finalize` 等都按 `episodeId` 取当前上下文

### 9.2 本轮不做

以下能力明确延后：

1. 跨集统一角色圣经自动维护
2. 跨集统一场景资产自动复用
3. 跨集剧情弧自动约束

原因：

1. 当前 MVP 的关键是把“单集策划 -> 创作生成”打通
2. 过早做跨集一致性，只会扩大 Planner 复杂度和迁移面

## 10. 与 Seedance 2.0 等多镜头模型的映射

### 10.1 明确支持的两种模式

对 `Seedance 2.0` 这类 `supportsMultiShot = true` 的模型，本轮 Planner 必须支持两种使用方式：

1. 多个相邻 shot 合并为单次生成
2. 单个 shot 内部通过 prompt 表达多次镜头切换

### 10.2 Planner 阶段必须为多镜头模型准备什么

Planner 在 Refinement 阶段必须产出足够明确的原料：

1. `visualDescription` 中有清晰动作推进
2. `composition` 中有明确景别信息
3. `cameraMotion` 中有明确运镜信息
4. `soundDesign` 中有关键环境声或音效信息
5. `act -> shot` 顺序稳定，便于后续按幕合并

### 10.3 本轮明确不做什么

本轮不引入以下新结构：

1. `subShot`
2. `shotSegments`
3. `cameraBeats`

原因：

1. 这会显著扩大数据模型和前端编辑器复杂度
2. 当前先通过 `shot-prompt-generator.ts` 在 prompt 层表达镜头切换，已经能覆盖最关键的多镜头价值

### 10.4 AIV 相对 Seko 的关键差异

Seko 的策划结果更像“可阅读分镜脚本”。

AIV 的目标是“可阅读分镜脚本 + 可直接转成模型专属 prompt 的原料”。

这意味着：

1. Planner 不是在写最终 prompt
2. Planner 也不能只写人类能看的文案
3. Planner 必须产出足够结构化、足够明确的 shot 原料，才能让 `shot-prompt-generator.ts` 真正发挥价值

## 11. Planner -> Creation 的交接要求

`POST /api/projects/:projectId/planner/finalize` 至少必须完成：

1. 当前 `activeRefinement` 标记确认
2. 按目标模型生成 `shot prompt` 结果
3. 将结果写入 Creation 侧可读取字段
4. 把 `PlannerSubject.generatedAssetIds` 绑定到对应 Shot 材料
5. 保留“来自哪个 RefinementVersion / 哪个模型”的追踪信息

用户体验目标：

1. 点击“确认策划，进入创作”后，Creation 立刻出现按幕/分镜排好的 Shot 列表
2. 对多镜头模型，Creation 可以看到合并后的生成任务视图或预览
3. 用户不需要手工复制角色图、场景图、台词和 prompt

## 12. Phase 对应关系

本专题与现有重构 Phase 的对应关系：

1. Phase 2：修 Planner 基础边界，保证版本链、scope、gateway、资产落盘
2. Phase 4：实现 `model-capability.ts`、`shot-prompt-generator.ts`，让 Planner 具备模型感知能力
3. Phase 5：实现 SSE、shot 级重跑、`planner/finalize` 和 Planner -> Creation 正式交接

## 13. 本文明确反对的错误表述

以下口径在后续讨论中视为错误：

1. “Planner 本质就是一个聊天页。”  
   错。Planner 是以 episode 为单位的策划工作台，聊天只是驱动层。

2. “右侧文档只是左侧消息的排版结果。”  
   错。右侧是正式结构化产物，必须可版本化、可编辑、可交接。

3. “切换目标视频模型一定要新建策划版本。”  
   错。仅做 prompt 预览时不需要；请求 AI 按该模型重写原料时才需要。

4. “Seedance 2.0 的多镜头能力要靠先建 subShot 模型。”  
   错。本轮先通过 prompt 层表达，不先扩表。

5. “确认大纲”和“确认策划进入创作”是同一个动作。  
   错。两者分别对应 Outline -> Refinement 和 Planner -> Creation 两个不同边界。

6. “AIV 只要把 Seko 的 5 个分镜字段照搬过来就够了。”  
   错。至少还需要 `durationSeconds` 与 `soundDesign` 两个字段，才能更好服务多镜头模型。
