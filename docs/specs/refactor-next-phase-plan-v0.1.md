# 重构续推计划（v0.1 完成版）

版本：v0.1 完成版
日期：2026-03-19
状态：本轮计划内代码重构已完成

---

## 1. 完成状态总结

截至 2026-03-19，本轮计划内重构工作已完成：

| 已完成 | 说明 |
|--------|------|
| Phase A：清理 re-export 桩文件 | `apps/api/src/lib/` 根目录 37 个 `planner-*` re-export 桩文件已删除 |
| Phase B：继续瘦身厚入口 | `planner-refinement-versions`、`planner-stream`、`planner-finalize`、`planner-media-generation`、`planner-debug` 相关职责已进一步下沉和收口 |
| Phase C：Provider 执行边界收口 | 已建立统一 execution registry，并为 catalog 同步补统一入口 |
| Phase D：Asset 存储回归补测 | 已补 `run-lifecycle.ts` 成功路径与失败路径回归测试 |
| Phase E：前端 Planner 热点拆分 | 已将 `use-planner-page-state.ts` 中的本地状态 ownership 抽到独立 base-state hook |

**本轮已解决的问题：**

1. `apps/api/src/lib/` 根目录 37 个 re-export 桩文件已清理
2. Planner 仍偏厚的入口已进一步收口，重逻辑更多下沉到 service 层
3. Provider 边界已从“多处分散声明”收口到统一 execution registry + 统一 catalog 入口
4. Asset 本地存储链路已补代码级回归测试，不再只覆盖失败路径
5. 前端 Planner 的状态管理已开始按状态 ownership 拆分，而不是继续堆在单个 hook 中

**仍未实际执行的人工/真实环境验收项：**

1. 未手动跑一次真实生成任务验证 `Asset.sourceUrl` 在线可访问
2. 未做浏览器中的 Planner 页面手动 smoke

上面两项不影响本轮代码重构完成状态，但仍属于人工验收范围，而非“已实际走通”的真实环境证明。

---

## 2. 各 Phase 完成记录

### Phase A：清理 re-export 桩文件

**状态：** 已完成

**完成结果：**
- 删除了 `apps/api/src/lib/` 根目录下 37 个 `planner-*` re-export 桩文件
- 校验后确认源码已不再依赖这批兼容入口
- 通过类型检查和 API 单测验证，未引入 import 漏改

**结果说明：**
- 该目录层噪音已清除
- 后续 Planner import 路径以真实模块位置为准

---

### Phase B：继续瘦身剩余厚入口与重逻辑 service

**状态：** 已完成

**完成结果：**

1. `planner-refinement-versions.ts`
   - 新增 `lib/planner/orchestration/refinement-version-service.ts`
   - 将 activate / create-draft 的查询、事务和同步更新逻辑下沉

2. `planner-stream.ts`
   - 新增 `lib/planner/stream/snapshot-service.ts`
   - 将 stepDefinitions 读取、synthetic step 推导、snapshot 组装下沉

3. `planner-debug`
   - 新增 `lib/planner/debug/selection-service.ts`
   - 将 debug selection / selection snapshot 相关职责从 execution service 中拆出

4. `planner-media-generation.ts`
   - 收口为统一 route 注册器
   - 消除了 subject / scene / shot 三套重复包装逻辑

5. `planner-finalize.ts`
   - 新增 `lib/planner/orchestration/finalize-service.ts`
   - 将 active refinement 查询、模型解析、事务准备逻辑下沉

**结果说明：**
- 这轮并没有机械追求所有 route 压到某个固定行数
- 收口目标是“入口只做认证、校验、调 service、返回”，这点已经达到

---

### Phase C：Provider 层统一执行边界

**状态：** 已完成

**完成结果：**
- 新增 `lib/provider/registry.ts`
  - 统一 provider capability 声明
  - 统一 provider dispatch handlers
- 新增 `lib/provider/catalog/model-catalog.ts`
  - 统一 provider catalog 拉取、模型提取和同步入口
- `provider-gateway.ts` 已改为基于 execution registry 工作
- `provider-config-catalog-service.ts` 已改为基于统一 catalog 入口工作

**结果说明：**
- 本轮没有再叠第四套抽象壳
- Planner 的 `VideoModelCapability` 仍保留在产品/模型能力层，没有混进 transport/execution registry
- 这次是“边界收口”，不是“推倒重写 provider-adapters”

---

### Phase D：Asset 存储回归验收与补测

**状态：** 代码级完成，人工验收未执行

**完成结果：**
- `asset-storage.ts` 既有 helper 测试保留
- `run-lifecycle.ts` 新增成功路径回归测试，覆盖：
  - planner entity 图片落盘后 `Asset.sourceUrl` 写回
  - shot 视频落盘后 `Asset` / `ShotVersion` 关系写回
  - refinement projection 同步触发

**结果说明：**
- 代码层已具备较完整回归护栏
- 但“真实 run 后 `Asset.sourceUrl` 可直接访问”这一项尚未实际人工验证

---

### Phase E：前端 Planner 模块评估与按状态边界拆分

**状态：** 第一轮完成

**完成结果：**
- 新增 `apps/web/src/features/planner/hooks/use-planner-page-base-state.ts`
- 将 `use-planner-page-state.ts` 中的本地状态 ownership 抽出
- 主 hook 继续保留 orchestration 角色，降低了“本地状态 + orchestration + side effect”混杂程度

**结果说明：**
- 本轮完成的是“按状态 ownership 拆第一刀”
- 没有继续做目录级大迁移，也没有为了拆分而拆分
- 如果后续还要继续拆，优先方向仍应是 runtime / editor / generation 等状态边界，而不是单纯按文件大小拆

---

## 3. 执行顺序回顾

实际执行顺序如下：

```text
Phase A
  ↓
Phase B
  ↓
Phase D
  ↓
Phase C
  ↓
Phase E
```

说明：
- 实施中优先完成了主链路后端收口，再补 Asset 成功路径回归
- Provider 边界收口放在主链路稳定之后执行
- 前端拆分作为最后一步，仅做第一轮低风险状态拆分

---

## 4. 验证结果

本轮已完成的验证：

| 范围 | 结果 |
|------|------|
| `pnpm typecheck:api` | 通过 |
| `pnpm --filter @aiv/api test:unit` | 通过 |
| `pnpm typecheck` | 通过 |
| `pnpm build` | 通过 |

**备注：**
- `pnpm build` 过程中出现 `baseline-browser-mapping` 版本过期提示，但不影响构建成功
- 未实际执行浏览器端手动 smoke
- 未实际执行真实 provider 生成任务回归

---

## 5. 不在本轮范围内的事项

以下事项仍不在本轮完成范围内：

| 事项 | 原因 |
|------|------|
| ARK AUDIO 接入（R-05D） | 仍等待官方确认可用接口，不作为本轮阻塞项 |
| subShot / shotSegments 新数据模型 | 需求未稳定，不提前设计 |
| Admin 后台迁移 | 属于功能性扩展，不在本轮结构收口范围内 |
| 大范围前端视觉重做 | 本轮聚焦结构、边界和维护性 |
| 浏览器手动 smoke | 未在本轮实际执行 |
| 真实 provider run 验收 | 未在本轮实际执行 |

---

## 6. 参考文档

- `docs/specs/refactor-todo-flat-table-v0.1.md`：历史任务总表
- `docs/specs/planner-structural-refactor-rescue-plan-v0.1.md`：Planner 结构救援计划
- `docs/specs/refactor-execution-sequence-v0.1.md`：历史执行序列
- `docs/specs/phase-2-ai-refactor-task-breakdown-v0.1.md`：Phase 2 AI 层拆解
- `docs/specs/planner-phase-4-5-task-breakdown-v0.1.md`：Planner Phase 4/5 拆解
- `docs/specs/backend-implementation-checklist-v0.3.md`：当前后端实现基线与回归清单
