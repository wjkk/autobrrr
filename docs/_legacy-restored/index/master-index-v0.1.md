# 主索引

版本：v0.2  
状态：索引基线  
适用范围：全局
关联文档：
- `docs/product/mvp-prd-v0.2.md`
- `docs/architecture/system-architecture-role-spec-v0.1.md`
- `docs/product/mvp-roadmap-v0.1.md`
- `docs/product/reference-compliance-boundary-v0.1.md`

## 1. 文档说明

本文档用于汇总当前已经形成的产品、设计、技术和集成方案文档，作为团队内部统一查阅入口。

适用对象包括：

- 产品
- 设计
- 前端
- 后端
- OpenClaw / Agent 集成开发
- 项目负责人

建议使用方式：

- 先阅读本文档了解整体结构
- 再按角色进入对应专题文档
- 进入编码阶段时，优先以“实现规格层”文档为准
- 若综述类文档与实现规格层冲突，以实现规格层为准

## 2. 当前项目一句话定义

本项目是一套以 Seko 为体验基线的开源创作系统，目标复刻其约 90% 的核心功能与体验，并支持由 OpenClaw 进行自然语言操作。系统形态上由 Seko 风格 Web Studio、业务编排后端、执行层和 OpenClaw 智能协作层组成。

## 3. 当前阶段的核心判断

当前方案已经明确以下几个关键方向：

- 项目目标已经明确：做一个以 Seko 为基线、可由 OpenClaw 操作的开源系统
- 项目方向可行
- 目标还原度以 Seko 约 90% 的核心功能与体验为准
- MVP 应优先验证“托管闭环”，而不是单点生成质量上限
- Web 是正式生产前台，不能被聊天入口替代
- OpenClaw 最适合承担自然语言入口、通知入口、轻操作入口和可插拔执行器角色，而不是业务真相层
- `n8n` 可作为外围自动化层，但不应进入核心状态机
- 技术方案应围绕 Explore -> Planner -> Creation -> Publish 主流程、状态机、镜头版本、素材栈、发布草稿和可观测性展开
- 基线验证优先使用本地原型，必要时再用真实 Seko 登录态做逐页核验，但不发生真实付费行为
- Seko 仅作为产品基线，不直接使用其前端源码、私有资源和品牌素材

## 4. 文档总览

### 4.1 产品层

#### `docs/product/reference-compliance-boundary-v0.1.md`

定位：Seko 参考边界、实现约束与合规风险控制说明。

主要内容：

- 哪些内容可以作为 Seko 参考基线
- 哪些源码、素材、品牌资源不得直接使用
- 浏览器核验与截图留存的使用边界
- 前端、设计、mock 数据和演示资源的实现约束

适合阅读角色：

- 产品
- 设计
- 前端
- 后端
- 项目负责人

#### `docs/product/mvp-prd-v0.2.md`

定位：MVP 产品需求文档。

主要内容：

- 项目背景
- 产品定位
- 产品目标
- 非目标
- 目标用户
- 核心痛点
- 核心价值主张
- 产品范围
- 功能模块
- 节点定义
- 审核与接管机制
- 版本与回滚原则
- 成功指标与上线标准

适合阅读角色：

- 产品
- 项目负责人
- 前后端负责人
- 方案设计者

### 4.2 设计 / 前端层

#### `docs/web/frontend-compliance-implementation-checklist-v0.1.md`

定位：前端实现阶段的 Seko 参考边界落地清单。

主要内容：

- 当前仓内研究素材与运行时风险盘点
- 正式前端必须替换的品牌文案、图片与 mock 数据
- Demo 与开源发布前的文本、资源与依赖扫描闸门
- 从研究目录过渡到正式前端目录的执行顺序

适合阅读角色：

- 前端
- 设计
- 产品
- 项目负责人

#### `docs/web/frontend-bootstrap-and-resource-plan-v0.1.md`

定位：正式前端启动前的目录结构、资源目录与发布闸门规划。

主要内容：

- `apps/web`、`packages/*` 与研究目录的边界
- 正式 mock 资源目录与最小资源清单
- 品牌替换表、文案替换表与共享类型目录要求
- 前端真正开工前必须通过的目录、文本、资源、依赖检查

适合阅读角色：

- 前端
- 设计
- 后端
- 产品
- 项目负责人

#### `docs/web/brand-replacement-table-v0.1.md`

定位：正式前端的品牌名、模型名与角色名替换映射。

主要内容：

- 研究原型词到正式前端占位词的映射
- 临时品牌方案
- 模型名、Assistant 名、作者名统一替换规则

适合阅读角色：

- 前端
- 设计
- 产品

#### `docs/web/copy-replacement-table-v0.1.md`

定位：正式前端的文案重写与占位文案映射表。

主要内容：

- Explore / Planner / Creation / Publish 的占位文案
- Toast 文案建议
- 后续编码时的 copy 常量落点

适合阅读角色：

- 前端
- 设计
- 产品

#### `docs/web/console-spec-v0.1.md`

定位：早期控制台页面原型说明。

主要内容：

- 控制台页面结构
- 信息优先级
- 模块说明
- 字段清单
- 主操作流
- 不同状态下的页面表现
- MVP 必做 / 可延后范围

适合阅读角色：

- 设计
- 前端
- 产品

补充说明：

- 该文档更偏“早期页面说明”
- 编码阶段应结合 `web-route-and-page-spec-v0.1.md` 与 `web-design-token-and-component-spec-v0.1.md` 一起使用

### 4.3 可行性与技术选型层

#### `docs/architecture/feasibility-and-tech-selection-v0.1.md`

定位：可行性分析与技术选型说明。

主要内容：

- 产品与技术可行性判断
- MVP 最值得验证的内容
- 推荐技术栈
- 推荐系统架构
- OpenClaw 的职责边界
- 平台与 OpenClaw 的推荐交互方式
- 分阶段实施建议

适合阅读角色：

- 技术负责人
- 架构师
- 项目负责人
- OpenClaw 集成开发

### 4.4 系统架构与角色边界层

#### `docs/architecture/system-architecture-role-spec-v0.1.md`

定位：目标系统架构、模块边界与 OpenClaw 角色定位说明。

主要内容：

- 推荐总体架构
- Web / 后端 / 执行层 / OpenClaw 的边界
- 正式状态流与命令事件流
- OpenClaw 接入点设计
- 系统与 agent 的任务归属建议

适合阅读角色：

- 产品
- 技术负责人
- 前端
- 后端
- OpenClaw / Agent 集成开发

### 4.5 架构取舍与外围自动化层

#### `docs/architecture/n8n-adoption-decision-v0.1.md`

定位：是否引入 `n8n` 的架构决策说明。

主要内容：

- `n8n` 适不适合进入核心链路
- `n8n` 最合适的系统定位
- 适合和不适合的使用场景
- 与 OpenClaw、后端、Web 的边界

适合阅读角色：

- 技术负责人
- 架构师
- 后端
- OpenClaw / Agent 集成开发
