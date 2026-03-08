# MVP Mock 数据与 Fixtures 规格

版本：v0.1  
状态：实现规格  
适用范围：MVP
关联文档：
- `docs/specs/mvp-domain-model-spec-v0.1.md`
- `docs/specs/mvp-command-query-event-spec-v0.1.md`
- `docs/web/web-route-and-page-spec-v0.1.md`

## 1. 文档目标

本文档用于定义 MVP 前后端联调、UI 开发、OpenClaw 对话演示所需的统一样本数据。

目标：

- 前端可以一次覆盖所有关键状态
- 后端可以稳定返回可预测样本
- OpenClaw 可以有真实可演示的状态查询结果

## 2. Fixtures 目录建议

建议后续建立：

- `fixtures/projects/`
- `fixtures/dashboard/`
- `fixtures/nodes/`
- `fixtures/shots/`
- `fixtures/events/`
- `fixtures/publish/`

## 3. 必需场景

MVP 至少准备以下 8 组场景：

### 3.1 空项目列表

用途：

- 校验空状态页面
- 校验新建项目入口

### 3.2 新建后未启动项目

用途：

- 校验 `pending` 状态
- 校验首个启动动作

### 3.3 脚本待审核项目

用途：

- 校验 `awaiting_review`
- 校验审核通过 / 编辑后继续

### 3.4 分镜待审核项目

用途：

- 校验工作台分镜板
- 校验节点切换和右侧摘要

### 3.5 镜头批量生成中项目

用途：

- 校验镜头板的 `queued / generating / success / failed`
- 校验实时刷新

### 3.6 部分镜头失败项目

用途：

- 校验失败镜头高亮
- 校验单镜头重试
- 校验版本面板

### 3.7 导出完成待发布项目

用途：

- 校验最终视频预览
- 校验发布表单

### 3.8 发布完成项目

用途：

- 校验完成态
- 校验发布记录与回执

## 4. 基础样本约定

建议统一前缀：

- 项目：`proj_`
- 节点：`node_`
- 镜头：`shot_`
- 运行：`run_`
- 版本：`sv_`
- 资产：`asset_`
- 发布：`pub_`

## 5. 推荐样本项目

### 5.1 项目 A：`废墟回响`

用途：主演示项目。

特点：

- 8 个镜头
- 分镜与镜头数据完整
- 有成功、失败、待替换版本

### 5.2 项目 B：`海雾车站`

用途：脚本待审核演示项目。

特点：

- 项目级状态为 `awaiting_review`
- 脚本有 2 个版本

### 5.3 项目 C：`玻璃庭院`

用途：发布完成项目。

特点：

- 最终视频可用
- 发布记录完整

## 6. Dashboard fixture 必备字段

每个 dashboard fixture 必须有：

- `projectSummary`
- `currentNode`
- `primaryActions`
- `shotBoard`
- `activeShot`
- `versionPanel`
- `eventSummary`
- `publishSummary`

## 7. Shot fixture 必备状态

镜头 fixture 至少覆盖：

- `pending`
- `queued`
- `generating`
- `success`
- `failed`

版本 fixture 至少覆盖：

- `active`
- `pending_apply`
- `archived`

## 8. Event fixture 必备事件

必须覆盖：

- `review.required`
- `run.started`
- `run.progressed`
- `run.failed`
- `shot.version_created`
- `shot.version_activated`
- `publish.completed`

## 9. OpenClaw 演示样本

为了支持聊天演示，建议准备一组固定问句和期望响应：

- “这个项目现在卡在哪一步？”
- “有哪些镜头失败了？”
- “帮我重试第 3 个镜头。”
- “现在可以发布了吗？”
- “给我打开待审核节点。”

每个问句都应映射到：

- 调用的查询或命令
- 返回的结构化结果
- 对应 Web 深链

## 10. 实现建议

后续可在仓库中真正创建：

- `fixtures/dashboard-awaiting-review.json`
- `fixtures/dashboard-shot-generating.json`
- `fixtures/dashboard-shot-partial-failed.json`
- `fixtures/node-script-detail.json`
- `fixtures/shot-versions-shot-012.json`
- `fixtures/publish-ready.json`
- `fixtures/publish-completed.json`

## 11. 一句话结论

如果没有提前准备好覆盖关键状态的 fixtures，前端很难一次做出稳定工作台，OpenClaw 的演示与联调也会缺乏真实上下文；这份文档就是为了让 MVP 从第一天起就拥有可演示、可联调、可回归的数据底座。
