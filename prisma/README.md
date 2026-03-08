# Prisma Schema Notes

这份 `schema.prisma` 已按当前 Seko 基线重做，重点从旧版的“单项目 / 单剧集 + 泛化节点”收敛到更贴近产品真实流程的对象：

- `Project`
- `Episode`
- `StyleTemplate`
- `PlannerSession`
- `PlannerStep`
- `PlannerMessage`
- `PlannerReference`
- `StoryboardDraft`
- `PipelineNode`
- `Run`
- `Shot`
- `ShotVersion`
- `ShotMaterialBinding`
- `Asset`
- `ReviewRecord`
- `PublishDraft`
- `PublishRecord`
- `EventLog`

## 当前明确解决的问题

1. 引入 `Episode`
说明：Seko 基线已经明确支持 `single | series`，单片模式只是单剧集特例。

2. 拆分内容模式与执行模式
说明：`contentMode = single | series`，`executionMode = auto | review_required` 不再混用。

3. 正式引入 Planner 工作区对象
说明：参考图、分镜草稿、多 Agent 步骤与消息都已进入正式领域模型。

4. 补齐 Creation 页核心对象
说明：`Shot` 现在覆盖版本、生图参数、失败信息、画布参数；`ShotMaterialBinding` 用来表达素材栈。

5. 引入 `PublishDraft`
说明：发布不再建模成“直接提交”，而是先 Draft，再形成提交记录。

## 当前仍然保留的实现取舍

1. `audioWorkspaceSnapshot` 与 `lipsyncWorkspaceSnapshot` 先用 JSON
原因：Creation 的音频 / 对口型子工作区还在 MVP 范围内，但第一阶段不值得过早拆成更多表。
后续：如果音频工作区变成高频协作对象，再单独引入 `MusicDraft`、`LipSyncDraft` 等模型。

2. `PipelineNode` 继续保留，但已降级为编排层账本
原因：Seko 主流程真正驱动页面的是 `PlannerSession / Shot / PublishDraft` 等产品对象。
后续：如果后续编排复杂度上升，再继续扩展 Node / Run 之间的聚合能力。

3. “每个 Shot 只有一个 active version / active material” 仍需数据库级增强
原因：Prisma schema 本身不直接表达 PostgreSQL 的 partial unique index。
后续：进入真实迁移时补 SQL migration，例如：
- `shot_versions (shot_id) where status = 'ACTIVE'`
- `shot_material_bindings (shot_id) where is_active = true`

4. `PlannerSession` 每个 Episode 只允许一个 active session 目前也只在应用层控制
原因：同样涉及 partial unique 约束。
后续：真实迁移时补 `where is_active = true` 的唯一索引。

## 校验说明

当前已执行：

```bash
DATABASE_URL='postgresql://user:pass@localhost:5432/app' npx --yes prisma@6.11.1 validate --schema prisma/schema.prisma
```

结果：`The schema at prisma/schema.prisma is valid`

补充说明：

- 当前 `npx prisma` 默认会拉取 7.x。
- Prisma 7 对 `schema.prisma` 中 datasource `url` 的处理方式已经调整，需要额外 `prisma.config.ts` 才能直接运行新 CLI。
- 因此本次结构校验使用了 Prisma 6.11.1。
