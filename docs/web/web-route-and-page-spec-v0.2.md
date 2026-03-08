# Web 路由与页面规格（v0.2）

版本：v0.2  
日期：2026-03-08  
状态：实现基线

## 1. 路由总览（与代码一致）

| 路由 | 当前行为 | 备注 |
| --- | --- | --- |
| `/` | 301/302 应用内重定向到 `/explore` | `apps/web/src/app/page.tsx` |
| `/explore` | 首页（灵感创作台） | 当前默认加载 `partial_failed` 场景 |
| `/projects/:projectId` | 根据项目状态重定向 | 见“阶段映射” |
| `/projects/:projectId/planner` | 策划页 | 支持 query 注入 prompt/title/storyMode |
| `/projects/:projectId/creation` | 分片生成页 | 支持 `shotId`、`view` |
| `/projects/:projectId/publish` | 发布页 | 草稿编辑 + 历史作品绑定 |

## 2. 项目阶段映射（必须一致）

`/projects/:projectId` 的跳转规则：

- `published` -> `publish`
- `creating | export_ready | exported` -> `creation`
- 其他状态 -> `planner`

该规则来自 `apps/web/src/features/shared/lib/project-stage.ts`。

## 3. 首页（/explore）产品行为

### 3.1 结构

首页由三块组成：

1. 左侧全局侧边栏
2. 顶部工作区栏
3. Hero 创作输入区 + 灵感瀑布流

### 3.2 Hero 输入交互

- 默认折叠态，点击后展开。
- 展开态支持三个模式：`短剧漫剧`、`音乐MV`、`知识分享`。
- `音乐MV` 模式显示“音乐上传槽位”，并隐藏“上传剧本”按钮。
- 工具浮层有且仅有一个可同时打开（主体图模型 / 主体角色 / 画风列表）。
- 输入为空时发送按钮禁用。
- 输入非空后发送：跳转到  
  `/projects/:projectId/planner?prompt=...`

### 3.3 页面内已触发但未实现的路由

当前首页有按钮会跳到以下占位路由：

- `/vip`
- `/profile`
- `/notifications`
- `/feedback`
- `/projects/new-character`

这些路由当前不属于主流程，若上线需补路由页或改为禁用态。

## 4. 页面查询参数规范

### 4.1 Planner

- `prompt`: 来自首页输入框
- `title`: 可选，预填项目标题
- `storyMode`: `single | series`

### 4.2 Creation

- `shotId`: 默认选中的镜头 ID
- `view`: `storyboard | default | lipsync`

## 5. 首页对后端数据的要求

当前实现大部分首页选项仍为前端硬编码；后端版本至少要支持：

1. 当前承接项目（`project.id`）
2. 模式与占位文案配置
3. 主体图模型列表
4. 角色列表
5. 画风列表
6. 预设卡模板列表
7. 灵感瀑布流卡片

最小可用版本可先只返回 `project.id`（保证跳转），再逐步把硬编码项替换为接口返回。
