# 前端领域契约规格（v0.2）

版本：v0.2  
日期：2026-03-08  
状态：实现基线

## 1. 目标

统一前端页面消费的数据结构，避免 Explore / Planner / Creation / Publish 各自定义不兼容 DTO。

## 2. 顶层聚合对象

前端当前以 `StudioFixture` 为唯一聚合对象：

```ts
interface StudioFixture {
  brandName: string;
  assistantName: string;
  scenarioId: 'empty' | 'awaiting_review' | 'partial_failed' | 'publish_ready' | 'published';
  scenarioLabel: string;
  project: ProjectSummary;
  episodes: EpisodeSummary[];
  explore: { ... };
  planner: PlannerWorkspace;
  creation: CreationWorkspace;
  publish: PublishWorkspace;
  historyWorks: HistoryWork[];
}
```

## 3. 子对象清单（当前真实使用）

1. `ProjectSummary`
- `id`
- `title`
- `brief`
- `contentMode: 'single' | 'series'`
- `executionMode: 'auto' | 'review_required'`
- `aspectRatio: '9:16' | '16:9' | '1:1'`
- `status`

2. `PlannerWorkspace`
- `submittedRequirement`
- `status`
- `docProgressPercent`
- `pointCost`
- `sections[]`
- `steps[]`
- `messages[]`
- `references[]`
- `storyboards[]`

3. `CreationWorkspace`
- `selectedShotId`
- `activeTrack`
- `viewMode`
- `points`
- `shots[]`（含版本、素材、画布）
- `playback`
- `voice`
- `music`
- `lipSync`

4. `PublishWorkspace`
- `draft`
- `successMessage`

## 4. 约束与已知差异

1. `EpisodeSummary.status` 当前沿用了 `ProjectStatus` 类型。
- 数据库存在独立 `EpisodeStatus`。
- v0.3 建议改为独立类型，避免语义漂移。

2. 首页组件 `ExplorePage` 当前未完全消费 `studio.explore.*`。
- 角色/画风/模型/预设/瀑布流仍有硬编码。
- 该部分需要逐步 API 化。

## 5. 建议演进

- 保持 `StudioFixture` 作为“页面首屏聚合响应”。
- 同时提供细粒度命令接口（更新 Planner、生成 Shot、提交 Publish）。
- 避免前端直接拼装多份松散 DTO。
