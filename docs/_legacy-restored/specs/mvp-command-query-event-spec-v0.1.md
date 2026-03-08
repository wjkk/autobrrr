# MVP 命令 / 查询 / 事件规格

版本：v0.1  
状态：恢复重建稿（原文未完整找回）  
适用范围：MVP
关联文档：
- `docs/specs/mvp-domain-model-spec-v0.1.md`
- `docs/specs/backend-data-api-spec-v0.1.md`
- `docs/specs/state-machine-and-error-code-spec-v0.1.md`
- `docs/openclaw/openclaw-integration-spec-v0.1.md`

## 1. 说明

该文件原文未从会话日志中完整提取。以下条目来自已恢复日志中的可验证片段，供你先继续使用。

## 2. 已恢复的事件名片段

- `planner.session.started`
- `planner.step.running`
- `planner.step.done`
- `planner.reference.updated`
- `planner.storyboard.changed`
- `planner.session.ready`

## 3. 已恢复的行为约束片段

- `GenerateStoryboard` 返回：`nextRoute = /projects/:projectId/creation?episode=:episodeId`

## 4. 建议

- 如果你手里有旧仓库快照，请优先用原文覆盖本文件。
- 在原文找回前，命令与事件以 v0.2 文档为执行基线，v0.1 本文件仅作历史指导参考。
