# 前端启动目录与资源计划

版本：v0.1  
状态：执行清单  
适用范围：正式前端启动前
关联文档：
- `docs/web/frontend-compliance-implementation-checklist-v0.1.md`
- `docs/product/reference-compliance-boundary-v0.1.md`
- `docs/web/web-route-and-page-spec-v0.1.md`
- `docs/web/web-design-token-and-component-spec-v0.1.md`
- `docs/specs/backend-data-api-spec-v0.1.md`

## 1. 文档目标

本文档用于把“正式前端启动前必须准备好的目录结构、资源目录、命名边界和发布闸门”一次性定清。

目标是避免后续出现以下问题：

- 研究目录与正式代码混用
- mock 资源到处散落
- 页面、组件、数据契约没有统一落点
- 后面临近开源发布时才发现品牌词、截图、素材来源混入

## 2. 当前结论

正式前端启动时，仓库应明确拆成两类区域：

1. 研究基线区
- `prototype/**`
- `research/**`

2. 正式实现区
- `apps/**`
- `packages/**`

研究基线区继续保留，没有问题。

真正必须保证的是：

- 正式构建流程不依赖研究目录
- 正式运行时资源不引用研究目录
- 正式开源发布物不混入研究截图、品牌词和来源不明素材

## 3. 启动前必须建立的目录结构

建议采用以下最小目录结构：

```text
apps/
  web/
    public/
      mock/
        covers/
        storyboards/
        materials/
        avatars/
        audio/
        video/
      brand/
      icons/
    src/
      app/
        explore/
        projects/
          [projectId]/
            planner/
            creation/
            publish/
      features/
        explore/
        planner/
        creation/
        publish/
        shared/
      components/
        ui/
        layout/
      lib/
        api/
        routes/
        guards/
        formatters/
      styles/
      types/

packages/
  domain/
  mock-data/
  ui/

docs/
prototype/
research/
```

## 4. 各目录职责

### 4.1 `apps/web`

用途：正式前端应用。

要求：

- 这是未来真正运行和发布的前端目录
- 不允许直接引用 `prototype/**` 和 `research/**` 下的资源
- 页面、样式、组件和静态资源都以这里为准

### 4.2 `apps/web/public/mock`

用途：正式前端演示和本地开发所需的 mock 资源。

必须提前建好的子目录：

- `covers`：项目封面、发布封面、历史作品封面
- `storyboards`：分镜默认预览图、版本轨缩略图
- `materials`：素材弹窗中的本地 / 历史示例图
- `avatars`：用户头像、作者头像、角色占位头像
- `audio`：演示用音频占位资源
- `video`：演示用视频占位资源

规则：

- 这些资源必须可公开分发
- 来源不明确的图片不要放进来
- 这里的文件是未来 Demo 与开源运行时可直接访问的资源

### 4.3 `apps/web/public/brand`

用途：正式产品自己的品牌资源。

要求：

- 放自己的 logo、favicon、社交分享图
- 不放 `Seko` 相关品牌内容

### 4.4 `apps/web/public/icons`

用途：项目自己的静态图标资源。

建议：

- 能用组件图标库的优先不用静态文件
- 只有在必须使用自定义图标时再落到这里

### 4.5 `apps/web/src/app`

用途：路由入口层。

建议页面目录：

- `explore`
- `projects/[projectId]/planner`
- `projects/[projectId]/creation`
- `projects/[projectId]/publish`

要求：

- 页面文件只负责路由装配和页面级数据入口
- 不把大量业务逻辑堆在 page 文件里

### 4.6 `apps/web/src/features`

用途：按业务工作区拆分功能模块。

建议子目录：

- `explore`
- `planner`
- `creation`
- `publish`
- `shared`

每个 feature 内建议再拆：

- `components`
- `hooks`
- `store` 或 `state`
- `services`
- `mappers`
- `constants`

要求：

- 页面级业务逻辑优先放在 feature 内
- 避免把 Planner、Creation 全塞进一个超大文件

### 4.7 `apps/web/src/components`

用途：跨 feature 复用的 UI 与布局组件。

建议子目录：

- `ui`：按钮、弹窗、标签、分段控件、表单控件
- `layout`：页面壳体、顶部栏、左右栏框架、底部时间轴容器

### 4.8 `apps/web/src/lib`

用途：非页面业务、但项目级通用能力。

建议子目录：

- `api`：query / command 请求封装
- `routes`：路由常量与跳转 helper
- `guards`：权限、状态、页面门禁判断
- `formatters`：时间、时长、状态文案格式化

### 4.9 `apps/web/src/styles`

用途：全局样式、token、动画和层级变量。

要求：

- 设计 token 集中放这里
- 不把颜色、阴影、z-index 到处写死在组件中

### 4.10 `apps/web/src/types`

用途：前端本地补充类型。

要求：
