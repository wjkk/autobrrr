# Planner Agent 剩余事项最终决策稿（2026-03-14）

状态：已定稿
适用范围：策划 Agent、主流程 Planner、内部调试页、文档口径统一

## 1. 文档目的

本文件用于收敛在 `docs/reviews/planner-agent-doc-code-gap-review-2026-03-14.md` 中仍标记为“待设计决策”的事项，给出当前阶段的正式执行口径。

原则：

1. 优先保持当前代码主干稳定，不为抽象完备性而重构。
2. 优先服务当前 3 个一级内容类型、9 个二级子类型的固定配置体系。
3. 所有决策以“更贴近当前真实产品边界”为准。

## 2. 决策结论

### 决策 A：是否保留 `assistant_error` 作为正式消息类型

结论：`当前阶段不新增正式的 assistant_error 消息类型`。

执行口径：

1. Planner 运行失败时，错误主状态仍以 `run.status / refinementVersion.status / errorMessage` 表达。
2. 主流程页面继续用现有错误提示、失败状态和回放信息承接异常。
3. `planner_messages` 继续保留当前枚举：
   - `USER_INPUT`
   - `ASSISTANT_TEXT`
   - `ASSISTANT_OUTLINE_CARD`
   - `ASSISTANT_STEPS`
   - `ASSISTANT_DOCUMENT_RECEIPT`
   - `SYSTEM_TRANSITION`
4. 只有当产品明确要求“失败也必须像正常消息一样沉淀进左侧时间线”时，再新增 `ASSISTANT_ERROR`。

理由：

1. 当前主流程的核心目标是保证文档生成、版本切换和回放闭环，而不是把所有异常都消息化。
2. 如果现在引入 `assistant_error`，会同时牵动消息渲染、失败语义、回放口径和历史数据兼容。
3. 现阶段收益不足以覆盖复杂度。

后续约束：

1. 所有文档若描述消息类型，应以当前代码枚举为准。
2. 不再把 `assistant_error` 写成“当前已存在能力”，最多写成“保留未来扩展可能”。

---

### 决策 B：是否支持在页面内新建 Agent / Sub-Agent

结论：`当前阶段不支持页面内新建 Agent / Sub-Agent`。

执行口径：

1. 当前配置管理模型保持为：
   - seed 初始化
   - 数据库编辑
   - 发布快照
   - 调试 / 回放 / A/B
2. `planner-agents` 页面只负责现有 Agent / Sub-Agent 的选择、编辑、发布、对照和跳转调试。
3. 不增加以下能力：
   - `POST /api/planner/sub-agent-profiles`
   - 页面内“新建子类型”按钮
   - 页面内动态创建一级内容类型 / 二级子类型

理由：

1. 当前业务分类是稳定、有限、明确的：3 个一级类型 + 9 个二级子类型。
2. 当前最重要的是把已有配置体系调顺，而不是把管理系统做成开放式 CMS。
3. 新建能力会引入新的校验、slug 生成、唯一性治理、seed 同步和文档同步问题。

替代方案：

1. 若后续确实新增固定子类型，继续走 `seed + 发布` 流程。
2. 若未来出现高频新增子类型需求，再单独立项设计“创建型配置后台”。

后续约束：

1. 文档中不再把“创建 Agent/Sub-Agent”写为当前默认能力。
2. 当前对外口径统一为“编辑既有 profile，不负责在线创建 taxonomy”。

---

### 决策 C：Planner 阶段是否包含图像草稿生成能力

结论：`包含，但边界限定为规划期视觉草稿与素材绑定，不等同于最终创作生成`。

执行口径：

1. Planner 阶段允许：
   - 主体图生成
   - 场景图生成
   - 分镜草图生成
   - 参考素材绑定
   - 规划期素材回写到 refinement 结构
2. Planner 阶段不负责：
   - 最终成片级图片生产编排
   - 最终视频生成编排
   - 导出口与发布口
   - creation 阶段的正式镜头版本管理
3. 产品语言统一使用：
   - “规划期图片草稿”
   - “策划素材”
   - “视觉参考/视觉预演”
   而不是直接笼统写“图片生成”。

理由：

1. 当前代码已经存在 planner 阶段的主体/场景/分镜图生成与素材绑定接口。
2. 这些能力的真实用途是辅助 refinement 文档收敛，而不是替代 creation。
3. 用“规划期视觉草稿”来定义边界，最符合现状，也最不容易和 creation 混淆。

后续约束：

1. 所有文档描述 planner 边界时，必须显式区分：
   - `规划期视觉草稿`
   - `创作期正式生成`
2. 不再使用“Planner 完全不负责图片生成”这种过于绝对的表述。

## 3. 对文档体系的统一要求

从本决策稿生效起，后续相关文档统一按以下口径编写：

1. `planner_messages` 的正式消息类型不包含 `assistant_error`。
2. `planner-agents` 是编辑/发布后台，不是 taxonomy 创建后台。
3. Planner 允许管理规划期图像草稿与素材绑定，但不承担 creation 的正式生成职责。

## 4. 后续动作

### 需要立即落实到文档口径的

1. `planner-agent-orchestration-spec-v0.1.md`
2. `planner-workflow-and-document-spec-v0.1.md`
3. 任何后续新增的 planner 调试 / 运行说明文档

### 当前不要求立即改代码的

1. 不新增 `ASSISTANT_ERROR`
2. 不新增 profile 创建接口
3. 不改 planner 与 creation 的现有接口划分

## 5. 最终结论

当前阶段的正式口径是：

1. `assistant_error` 不进入正式消息类型。
2. Agent / Sub-Agent 不支持页面内新建，只支持既有配置编辑与发布。
3. Planner 包含规划期视觉草稿与素材绑定能力，但不承担最终创作生成职责。

本文件可作为后续继续对齐文档与代码的裁决依据。
