# 前端领域契约规格（v0.2）

版本：v0.2  
日期：2026-03-09  
状态：历史快照（准确描述过渡态，但不作为重构终态依据）

> ⚠️ 本文档描述的是“当前过渡态”而不是“下一阶段终态”。
>
> 当前 Planner / Creation / Publish 页面仍将真实 API 响应映射回 `StudioFixture`，因此本文对现状仍有参考价值；但若要进入重构实现，请优先阅读：
>
> 1. `docs/index/master-index-v0.4.md`
> 2. `docs/specs/refactor-execution-guardrails-v0.1.md`
> 3. `docs/specs/frontend-workspace-contract-migration-v0.1.md`

## 1. 目标

统一前端页面消费的数据结构，明确：

1. 当前仓库里“已实现”的契约。
2. Explore/Planner 下一步后端化需要新增的契约。

## 2. 当前事实源（代码）

1. `packages/domain/src/studio.ts`
2. `packages/domain/src/project.ts`
3. `packages/domain/src/planner.ts`
4. `packages/domain/src/creation.ts`
5. `packages/domain/src/publish.ts`

## 3. 当前已实现契约

前端页面首屏仍以 `StudioFixture` 作为聚合响应：

```ts
interface StudioFixture {
  brandName: string;
  assistantName: string;
  scenarioId: 'empty' | 'awaiting_review' | 'partial_failed' | 'publish_ready' | 'published';
  scenarioLabel: string;
  project: ProjectSummary;
  episodes: EpisodeSummary[];
  explore: {
    categories: Array<'全部' | '短剧漫剧' | '音乐MV' | '知识分享'>;
    feeds: ExploreFeedItem[];
    continueProjects: ContinueProjectCard[];
    defaults: {
      prompt: string;
      model: string;
      ratio: '9:16' | '16:9' | '1:1';
      mode: '视频模式' | '漫剧模式';
    };
  };
  planner: PlannerWorkspace;
  creation: CreationWorkspace;
  publish: PublishWorkspace;
  historyWorks: HistoryWork[];
}
```

关键子对象（当前已用）：

1. `ProjectSummary`
- `id/title/brief/contentMode/executionMode/aspectRatio/status`
- `aspectRatio` 当前 domain 仍是 `'9:16' | '16:9' | '1:1'`

2. `PlannerWorkspace`
- `input/submittedRequirement/status/docProgressPercent/pointCost`
- `sections/steps/messages/references/storyboards`

3. `CreationWorkspace`
- `selectedShotId/activeTrack/viewMode/points/shots[]`
- `playback/voice/music/lipSync`

4. `PublishWorkspace`
- `draft/successMessage`

## 4. 已知差异（必须在文档中明确）

1. Planner UI 比例与 domain 比例暂不一致。
- domain: `'9:16' | '16:9' | '1:1'`
- planner 页底部配置（前端局部状态）: `'16:9' | '9:16' | '4:3' | '3:4'`

2. Planner 的“细化版本历史/激活版本/局部 patch”当前是页面本地状态。
- 实现位置：`apps/web/src/features/planner/hooks/use-planner-refinement.ts`
- 尚未进入 `@aiv/domain` 的持久化契约。

3. Explore 页面仍有较多静态数据源。
- `explore-page.data.ts` 中的 tab、候选项、预设卡仍是前端常量。

## 5. v0.2 方向（后端化要求）

1. 保留 `StudioFixture` 作为跨页面首屏聚合对象（兼容现有页面）。
2. 为 Planner 新增独立契约：
- `PlannerRefinementVersion`
- `PlannerDocSnapshot`
- `PlannerGenerationConfig`（含 `storyboardModelId` + planner 比例枚举）
3. 逐步把 Explore 的候选项/预设卡迁移为可配置接口数据。

## 6. 兼容策略

1. `ProjectSummary.aspectRatio` 暂保留 `1:1`，用于历史数据与非 Planner 场景兼容。
2. Planner 配置使用独立比例枚举（含 `4:3/3:4`），不复用旧字段。
3. 待后端完成迁移后，再评估统一为单一比例枚举。
