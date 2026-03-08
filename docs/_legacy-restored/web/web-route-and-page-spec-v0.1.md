# Web 路由与页面规格

版本：v0.1  
状态：实现规格  
适用范围：MVP
关联文档：
- `docs/specs/seko-baseline-gap-analysis-v0.1.md`
- `docs/specs/mvp-domain-model-spec-v0.1.md`
- `docs/specs/backend-data-api-spec-v0.1.md`
- `docs/specs/mvp-command-query-event-spec-v0.1.md`
- `docs/web/web-design-token-and-component-spec-v0.1.md`

## 1. 文档目标

本文档用于把 Web Studio 页面定义到可直接编码的粒度，并明确：

- 主流程路由怎么划分
- 每个页面应该承载什么内容
- 哪些交互是 Seko 水准下必须还原的

## 2. 页面总原则

### 2.1 路由按产品工作区组织

主流程统一按以下工作区展开：

- Explore
- Planner
- Creation
- Publish

不要再把主入口设计成后台式 `/projects/new` 或节点详情页。

### 2.2 多剧集通过上下文切换，不通过大量深层路由切换

同一项目下的多个 Episode 建议通过 query 参数或页面内切换完成。

推荐统一使用：

- `?episodeId=...`

### 2.3 主页面优先，诊断页次之

用户主路径是工作区页面。

诊断 / 历史 / run 详情页面可以保留，但不作为默认工作入口。

## 3. 推荐路由

推荐 MVP 采用以下路由：

- `/explore`
- `/projects/:projectId`
- `/projects/:projectId/planner`
- `/projects/:projectId/creation`
- `/projects/:projectId/publish`
- `/projects/:projectId/runs`

推荐 query：

- `episodeId`：当前剧集上下文
- `shotId`：Creation 页默认选中的分镜
- `view`：Creation 中的 `storyboard | default | lipsync`

说明：

- `/projects/:projectId` 作为智能入口，按项目当前状态重定向到 Planner / Creation / Publish。
- `lipsync` 不建议单独拆独立大页面，可作为 `creation?view=lipsync` 的副工作区。

## 4. 页面规格

### 4.1 灵感广场 `GET /explore`

目标：

- 作为默认创作入口，承接“输入灵感 -> 进入策划”主链路
- 提供全局导航与常用用户入口（会员、消息、反馈、发布）
- 展示灵感广场瀑布流内容，支持从首页直接进入分片生成

必须模块：

- 左侧全局侧边栏（首页 / 作品 / 资产 / 社区）
- 顶部发布入口（`+ 发布作品`）
- Hero 折叠输入态（胶囊输入）
- Hero 展开创作态（输入区 + 工具栏 + 模式 tabs + 预设卡）
- 全局浮层（主体图模型 / 主体角色 / 画风列表）
- 灵感广场瀑布流（含公告卡与点赞卡片）
- 全局 Toast 反馈

必须交互：

- 初始为折叠输入态，点击输入区后展开创作态；点击外部区域自动收起
- 创作模式切换为 `短剧漫剧 | 音乐MV | 知识分享`，并驱动占位文案与工具栏差异
- `音乐MV` 模式显示音乐上传槽位，并隐藏剧本附件按钮
- 工具浮层同一时刻仅允许一个打开，选择后自动关闭
- 输入为空时禁用发送按钮；输入非空后激活发送
- 点击发送进入 `/projects/:projectId/planner?prompt=...`
- 顶部与广场区两个 `+ 发布作品` 均进入 `/projects/:projectId/creation`
- 上传附件后展示全局 toast，并在约 `2.5s` 后自动消失
- 侧边栏主导航当前为前端态高亮切换（MVP 阶段可不触发路由跳转）

### 4.2 项目智能入口 `GET /projects/:projectId`

目标：

- 让深链进入项目时总能落到正确工作区

重定向规则建议：

- `draft | planning | ready_for_storyboard` -> `/planner`
- `creating | export_ready | exported` -> `/creation`
- `published` -> `/publish`

### 4.3 策划页 `GET /projects/:projectId/planner`

目标：

- 完成从需求到分镜草稿的正式策划工作
- 支持多 Agent 时间线、参考图、分镜草稿的编辑与重提交流程

推荐布局：

- 左侧：时间线 + 消息 + 需求输入
- 右侧：策划文档
- 底部：生成分镜主按钮

必须模块：

- Episode 切换区
- 多 Agent 时间线
- 消息区
- 需求输入区
- 文档章节区
- 主体参考图区
- 分镜草稿区
- 生成分镜按钮

必须交互：

- 提交需求后 step 逐步从 `waiting -> running -> done`
- 文档未 ready 前禁止生成分镜
- 参考图 hover 才显示编辑入口
- 参考图点击卡片或按钮都能进入编辑弹窗
- 分镜 hover 才显示编辑 / 复制 / 删除
- 删除前必须二次确认
- 只剩 1 条分镜时禁止删除
- 点击“生成分镜”后出现 boot 浮层并自动进入 Creation

### 4.4 Creation 主工作区 `GET /projects/:projectId/creation`

目标：

- 承载分镜视频生成、失败恢复、版本替换、素材管理与导出前检查

推荐布局：

- 顶部：返回策划、积分、批量操作、导出、发布入口
- 左侧：当前分镜编辑区 / track 工作区
- 中间：舞台与时间轴
- 右侧：版本轨

必须模块：

- Storyboard 视图 / Default 视图切换
- Shot 时间轴
- 当前分镜详情
- 批量转视频入口
- 单分镜转视频入口
- 模型切换入口
- 素材提交入口
- 画布编辑入口
- 版本轨
- 导出入口

必须交互：

- Shot card hover 才显示局部动作
- 未选中卡与选中卡的 hover 行为要分开设计
- 单分镜转视频通过参数弹窗触发
- 批量生成支持 `all` 与 `missing`
- 失败分镜支持重试
- 新版本生成后进入 `pending_apply`
- 只有用户点击替换才覆盖正式版本
- 模型切换在已有版本时必须确认重置
- 素材弹窗支持本地上传 / 历史创作两 tab
- 重置后 Shot 回到 `pending`

### 4.5 Creation 对口型副工作区 `GET /projects/:projectId/creation?view=lipsync`

目标：

- 在不离开 Creation 的前提下处理对口型流程

必须模块：

- 单人 / 多人模式切换
- 文本输入 / 音频上传切换
- 推荐底图列表
- 底图上传入口
- 音色 / 情绪 / 音量 / 语速
- 生成按钮

必须交互：

- 未选底图不得生成
- 文本模式下无文案不得生成
- 上传模式下无音频不得生成
- 多人模式至少保留 1 条对白

### 4.6 发布页 `GET /projects/:projectId/publish`

目标：

- 完成发布草稿编辑、历史作品绑定和正式发布

推荐布局：

- 左侧：封面 / 成片预览
- 右侧：发布表单
- 底部：取消 / 发布

必须模块：

- 历史作品选择入口
- 标题
- 作品简介
- 剧本提示词
- 标签
- 发布按钮
- 发布成功态

必须交互：

- 可从历史作品回填表单
- 标题和简介未完成时禁止提交
- 提交成功后出现 success modal

### 4.7 Run 诊断页 `GET /projects/:projectId/runs`

目标：

- 给研发、运营、排障使用
- 不作为普通创作者主路径

建议模块：

- Run 列表
- 过滤器
- 输入 / 输出 payload
- 错误码与日志
- 相关 shot / episode / publish draft 跳转

## 5. 必做弹窗清单

MVP 必做弹窗：

- Planner 参考图编辑弹窗
- Planner 分镜编辑弹窗
- Planner 删除确认弹窗
- Storyboard boot 浮层
