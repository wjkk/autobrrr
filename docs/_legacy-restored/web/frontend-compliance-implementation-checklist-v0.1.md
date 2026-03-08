# 前端合规实现清单

版本：v0.1  
状态：执行清单  
适用范围：前端实现 / Demo / 开源发布
关联文档：
- `docs/product/reference-compliance-boundary-v0.1.md`
- `docs/product/mvp-prd-v0.2.md`
- `docs/web/web-route-and-page-spec-v0.1.md`

## 1. 文档目标

本文档把“参考 Seko 但不直接使用其源码和素材”的原则，转成前端实现阶段可直接执行的清单。

目标不是减少对 Seko 的参考，而是把参考方式严格限制在：

- 参考产品能力
- 参考交互逻辑
- 参考页面结构
- 参考状态机

而不是直接复用其源码、品牌素材和私有资源。

## 2. 当前仓内研究资料与发布边界

### 2.1 研究资料目录

以下目录明确属于研究基线，可以继续保留在仓库中：

- `research/seko`
- `prototype/seko-clone`
- `prototype/seko-mangju-static`

当前已确认：

- `research/seko` 下存在大量真实站点截图与研究资料
- 当前图片 / 视频研究资料数量超过 500 份
- `prototype/seko-clone` 下存在大量逐流程核验截图
- `prototype/seko-mangju-static` 与 `prototype/seko-clone` 均带有 `Seko` 品牌字样

结论：

- 这些目录继续保留，作为参考资料没有问题
- 真正的限制是：不得把其中内容直接作为正式前端的运行时资源、对外演示资源或开源发布资源

### 2.2 当前已发现的品牌文案替换点

以下文件中存在 `Seko` 直接品牌文案，正式前端实现时必须替换：

- `prototype/seko-clone/index.html`
- `prototype/seko-mangju-static/index.html`
- `prototype/seko-clone/src/views/explore.js`
- `prototype/seko-clone/src/views/planner.js`
- `prototype/seko-clone/src/views/creation.js`
- `prototype/seko-clone/src/views/modals.js`
- `prototype/seko-clone/src/data.js`
- `prototype/seko-clone/src/store.js`
- `prototype/seko-clone/src/actions.js`
- `prototype/seko-mangju-static/src/constants.js`

已识别到的高风险词包括：

- `Seko`
- `Seko Image`
- `SekoTalk`
- `Seko Creator`
- `Seko2.0`
- `Seko 正在为您生成分镜`
- `Seko 正在思考`

结论：

- 这些名称保留在研究原型里没有问题
- 但进入正式产品代码时必须统一替换为自有品牌或中性命名

### 2.3 当前已发现的运行时图片替换点

以下资源可以继续留在研究目录中，但不应直接进入正式开源前端：

- `prototype/seko-clone/assets/creation/shot1.png`
- `prototype/seko-clone/assets/creation/shot1_test.png`
- `prototype/seko-clone/assets/creation/shot1_test2.png`
- `prototype/seko-clone/assets/creation/shot2.png`
- `prototype/seko-clone/assets/creation/shot2_test.png`
- `prototype/seko-clone/assets/creation/shot3.png`
- `prototype/seko-clone/assets/creation/shot3_test.png`

原因：

- 当前这些资源的公开分发来源并未在仓内建立合法来源说明
- 它们处在复刻研究目录下，应默认视为研究素材，不作为正式交付资源

### 2.4 当前已发现的截图发布边界

以下内容可以继续作为研究资料保留，但默认不进入正式发布物：

- `prototype/seko-clone/v*_verify_*.png`
- `prototype/seko-clone/v*_flow_*.png`
- `prototype/seko-clone/verify_*.png`
- `research/seko/screenshots/**`

结论：

- 这些截图不得进入未来 `apps/web/public`、演示包、官网素材包或 npm 发布包

## 3. 正式前端的强制边界

### 3.1 代码来源边界

正式前端中的页面、组件、CSS、状态管理和交互逻辑必须独立实现。

强制要求：

- 不从真实 Seko 站点复制源码
- 不从浏览器 DevTools 导出并复用 CSS / HTML / SVG
- 不把研究原型目录直接作为正式产品运行时代码提交物

### 3.2 资源来源边界

正式前端中的运行时资源只能来自：

- 自研资源
- 合法开源资源
- 可商用授权资源
- 可追溯来源的 mock 资源

强制要求：

- 所有 `public` 目录资源都必须可追溯来源
- 来源不明确的资源默认不允许进入正式项目

### 3.3 品牌边界

正式前端中不得保留：

- `Seko` 品牌字样
- `Seko` 模型名称
- `Seko` 作者名、活动名、产品名
- 与真实站点强绑定的品牌文案

## 4. 正式前端开工前必须完成的动作

### 4.1 建立研究目录与正式代码目录隔离

必须做到：

- `prototype/**` 和 `research/**` 明确保留为研究资料
- 正式代码只放在未来的 `apps/web` 或等价正式应用目录
- 正式构建流程不得引用 `prototype/**`、`research/**`

### 4.2 建立独立 mock 资源目录

必须新建一套正式 mock 资源，例如：

- `apps/web/public/mock/covers`
- `apps/web/public/mock/storyboards`
- `apps/web/public/mock/materials`
- `apps/web/public/mock/avatars`

这些资源应满足：

- 来源明确
- 可以公开分发
- 风格可接近 Seko，但不直接复用其截图或图像

### 4.3 建立品牌替换表

正式实现前先确定一套命名映射。

建议至少替换：

- `Seko` -> 我们自己的产品名或中性工作台名称
- `Seko Image` -> 中性模型名
- `SekoTalk` -> 中性对口型模型名
- `Seko Creator` -> 中性作者名
- `Seko2.0` -> 自己的版本命名

### 4.4 建立文案替换表

需要统一重写：

- 空状态文案
- Toast 文案
- 引导语
- 发布提示文案
- 广场 feed 标题
- 活动说明文案

原则：

- 可保留功能含义
- 不直接复制真实页面的整句表达

## 5. 页面级替换清单

### 5.1 Explore

必须替换：

- 顶部品牌名
- 广场作者名
- 广场活动标题
- 顶部发布入口中的品牌露出

### 5.2 Planner

必须替换：

- Assistant 角色名中的 `Seko`
- 文档执行中的品牌提示文案
- 参考图、分镜示例文本中的品牌词

### 5.3 Creation

必须替换：

- 左侧 / 中部出现的 `Seko` 品牌标识
- 对口型模型名 `SekoTalk*`
- 模型列表中的 `Seko Image`
- 所有默认预览图与素材预览图
