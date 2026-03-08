# 品牌替换表

版本：v0.1  
状态：执行清单  
适用范围：正式前端 / Demo / Mock 数据
关联文档：
- `docs/product/reference-compliance-boundary-v0.1.md`
- `docs/web/frontend-compliance-implementation-checklist-v0.1.md`
- `docs/web/frontend-bootstrap-and-resource-plan-v0.1.md`

## 1. 文档目标

本文档用于把研究原型中出现的品牌词、模型名、角色名和活动名，统一替换成正式前端启动阶段可使用的中性占位命名。

当前原则：

- 先统一成内部临时命名
- 等最终品牌确定后再整体替换一次
- 在正式代码和 mock 数据中不再出现 `Seko` 相关品牌词

## 2. 当前临时品牌方案

当前建议正式前端先使用以下临时命名：

- 产品名：`AIV Studio`
- Assistant 名：`Studio Assistant`
- 文生图模型主名：`Vision Auto`
- 文生图模型次名：`Vision Detail`
- 对口型模型主名：`Sync Voice`
- 对口型模型增强版：`Sync Voice Pro`
- 创作者示例作者名：`AIV Creator`

说明：

- 这些名称只是工程占位名，不代表最终对外品牌决策。
- 后续如果有正式品牌，只改这张表和 mock 数据映射即可。

## 3. 替换映射

| 研究原型词 | 正式前端占位词 | 使用范围 | 备注 |
| --- | --- | --- | --- |
| `Seko` | `AIV Studio` | 页面品牌、标题、顶部标识 | 正式前端统一替换 |
| `Seko Image` | `Vision Auto` | 模型列表、分镜设置 | 文生图默认模型 |
| `SekoTalk` | `Sync Voice` | 对口型模型 | 单人模式默认模型 |
| `SekoTalk Pro` | `Sync Voice Pro` | 对口型模型增强版 | 可留给高级选项 |
| `SekoTalk Max` | `Sync Voice Max` | 对口型模型增强版 | 可留给高级选项 |
| `Seko Creator` | `AIV Creator` | 广场作者名、历史作者名 | mock 数据替换 |
| `Seko2.0` | `AIV Studio Beta` | 活动标题、公告卡 | 不直接沿用版本号语义 |
| `Seko 正在思考` | `Studio Assistant 正在整理策划` | Planner 执行提示 | 只保留功能语义 |
| `Seko 正在为您生成分镜` | `Studio Assistant 正在生成分镜` | storyboard boot 提示 | 只保留功能语义 |

## 4. 执行规则

正式前端和 mock 数据中：

- 顶部品牌区统一使用 `AIV Studio`
- Assistant 统一使用 `Studio Assistant`
- 模型名统一使用 `Vision*` 与 `Sync Voice*`
- 作者名、活动名、公告名全部替换为中性名称

## 5. 后续替换入口

真正开始编码后，建议把这张表映射成以下常量：

- `packages/mock-data/src/brand.ts`
- `apps/web/src/lib/brand.ts`

这样未来换品牌时只需要改一层映射，不需要全局搜文本。
