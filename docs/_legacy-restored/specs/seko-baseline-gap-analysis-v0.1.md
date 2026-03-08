# Seko 基线差异分析

版本：v0.1  
状态：基线校准  
适用范围：MVP 规格收敛
关联文档：
- `prototype/seko-mangju-static/docs/漫剧模式_产品原型_UI交互全集.md`
- `prototype/seko-clone/docs/01_产品设计文档_PRD.md`
- `prototype/seko-clone/docs/02_原型规格文档_Prototype.md`
- `prototype/seko-clone/docs/03_UI与交互精确规范.md`
- `prototype/seko-clone/docs/04_Action状态变更矩阵.md`
- `docs/specs/mvp-domain-model-spec-v0.1.md`
- `docs/specs/backend-data-api-spec-v0.1.md`
- `docs/specs/mvp-command-query-event-spec-v0.1.md`
- `docs/web/web-route-and-page-spec-v0.1.md`

## 1. 文档目标

本文档用于把当前正式规格与本地 Seko 原型基线做一次显式对比，解决两个问题：

- 哪些旧假设已经不成立
- 后续编码阶段应该以什么对象和页面为真实基线

本次校准以两个本地原型目录为准：

- `prototype/seko-mangju-static`
  作用：提供漫剧模式、多剧集、风格继承、发布中心的产品基线。
- `prototype/seko-clone`
  作用：提供全站尤其是视频生成主流程的页面、状态、交互和弹窗基线。

## 2. 本次确认的 Seko 基线

### 2.1 页面基线

Seko 的主链路不是“泛化控制台”优先，而是明显的产品工作流页面：

1. `Explore / 灵感广场`
- 输入需求
- 选择模型 / 比例 / 模式
- 进入策划页

2. `Planner / 策划页`
- 左侧多 Agent 时间线与消息
- 右侧策划文档
- 主体参考图可编辑 / 删除 / 重试生成
- 分镜草稿可新增 / 复制 / 编辑 / 删除
- 文档 ready 后再进入“生成分镜”

3. `Creation / 分片生成页`
- 左侧工具区
- 中间舞台与时间轴
- 右侧版本轨
- 一键转视频 / 单分镜转视频 / 失败重试 / 版本替换 / 模型切换 / 素材提交 / 重置
- Voice / Music / LipSync 属于 Creation 里的副工作区，不是完全独立产品

4. `Publish / 发布页`
- 历史作品绑定
- 标题 / 简介 / 剧本信息
- 提交发布
- 发布成功态

### 2.2 领域基线

Seko 原型已经明确暴露出一批产品原生对象：

- `Project`
- `Episode`
- `PlannerSession`
- `PlannerReference`
- `StoryboardDraft`
- `Shot`
- `ShotVersion`
- `ShotMaterial`
- `StyleTemplate`
- `PublishDraft`
- `PublishRecord`

这意味着我们不能只用抽象的 `Project / PipelineNode / Run` 覆盖全部业务事实。

### 2.3 状态基线

当前原型明确存在如下状态：

1. Planner 侧
- `idle`
- `updating`
- `ready`

2. Planner step 侧
- `waiting`
- `running`
- `done`

3. Shot 侧
- `pending`
- `queued`
- `generating`
- `success`
- `failed`

4. ShotVersion 侧
- `active`
- `pending_apply`
- `archived`

5. Publish 侧
- `draft`
- `submitted`
- `published / success`
- 以及发布后的审核队列语义

## 3. 当前正式规格的主要偏差

### 3.1 单项目单剧集假设已经失效

当前旧规格的问题：

- 旧文档把 MVP 建立在“单项目 / 单剧集优先”上。
- 旧 Prisma schema 没有 `Episode`。

Seko 基线：

- 漫剧模式明确支持 `single | series`。
- Project 下存在 `episodes[]`。
- 风格、发布、分镜工作区都需要考虑剧集维度。

调整结论：

- `Episode` 必须进入正式领域模型和数据库基线。
- 单片模式只是 `Episode` 数量为 1 的特例，不再是不同系统。

### 3.2 `mode` 含义被混用了，必须拆开

当前旧规格的问题：

- `Project.mode` 被定义成 `auto | review_required`。
- 这实际上是执行策略，不是内容形态。

Seko 基线：

- 漫剧模式的 `mode` 表达的是 `single | series`。
- 系统仍然需要 `auto | review_required` 这类执行策略。

调整结论：

- 正式模型必须拆分为：
- `contentMode = single | series`
- `executionMode = auto | review_required`

### 3.3 策划页不是简单“脚本节点”，而是正式工作区

当前旧规格的问题：

- 旧规格把前期策划过度抽象成 `script_generation` / `storyboard_generation` 节点。
- 没有正式建模多 Agent 步骤、参考图、分镜草稿、可编辑文档。

Seko 基线：

- Planner 页面有独立生命周期。
- Planner 中的数据是可编辑、可删除、可重复进入的正式业务数据。
- 参考图和分镜草稿不是临时 UI 状态，而是生成前的正式输入。

调整结论：

- 增加 `PlannerSession`。
- 增加 `PlannerStep`。
- 增加 `PlannerMessage`。
- 增加 `PlannerReference`。
- 增加 `StoryboardDraft`。

### 3.4 Shot 当前建模深度不足

当前旧规格的问题：

- Shot 只覆盖了基础提示词和状态。
- 没有完整覆盖创建页真实交互所需字段。

Seko 基线：

Creation 页的 Shot 需要正式承载：

- 图像提示词
- 构图 / 运镜 / 旁白 / 字幕
- 模型、分辨率、时长模式
- 裁剪至配音时长开关
- 失败次数与错误信息
- 画布编辑参数
- 当前生效版本
- 当前素材栈

调整结论：

- Shot 必须扩展为“生成对象 + 编辑对象 + 展示对象”三合一的正式实体。

### 3.5 版本与替换不只是历史记录，而是核心业务语义

当前旧规格的问题：

- 旧规格承认 `ShotVersion`，但仍偏“结果附属表”。
- 没有突出 pending replace 的业务含义。

Seko 基线：

- 新版本生成后不会立刻覆盖正式版本。
- 用户需要先选中版本，再执行替换。
- `pending_apply` 与 `active` 的差异是 Creation 页的核心交互。

调整结论：

- `ShotVersion.status` 继续保留，并以 `active / pending_apply / archived` 为正式语义。
- `Shot.activeVersionId` 仍然保留。

### 3.6 素材提交不是单次附件，而是素材栈

当前旧规格的问题：

- 旧规格只把素材理解成普通 `Asset`。
- 没有明确“上传 / 历史创作 / 已应用素材栈”的关系。

Seko 基线：
