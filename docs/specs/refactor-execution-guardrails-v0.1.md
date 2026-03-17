# 重构执行约束（v0.1）

版本：v0.1
日期：2026-03-16
状态：现行执行约束（适用于即将开始的重构阶段）

## 1. 文档目的

本文不定义业务功能，而是定义本轮重构必须遵守的执行约束，避免在实现过程中再次混入旧口径、旧边界和隐式目标。

本文回答 5 个问题：

1. 当前到底以哪些代码和文档为真相源
2. 本轮重构的明确目标与非目标是什么
3. 每个 Phase 开工前必须满足什么前置条件
4. 哪些目录和模块本轮可以动，哪些暂时不要动
5. 每个 Phase 完成后至少需要做哪些验证

## 2. 真相源与裁决顺序

### 2.1 代码真相源

本轮重构一律以下列代码为事实来源：

1. `apps/api/prisma/schema.prisma`
2. `apps/api/src/routes/*.ts`
3. `apps/api/src/lib/*.ts`
4. `apps/web/src/app/**/*.tsx`
5. `apps/web/src/features/**/*.tsx`

### 2.2 文档裁决顺序

若文档互相冲突，按以下顺序裁决：

1. `docs/index/master-index-v0.4.md`
2. `docs/specs/backend-implementation-checklist-v0.3.md`
3. `docs/specs/database-schema-spec-v0.3.md`
4. `docs/specs/backend-data-api-spec-v0.3.md`
5. 其他被 `master-index-v0.4.md` 标记为“高可信”的文档
6. 专项草案文档
7. 历史快照 / `v0.2` 文档

### 2.3 明确排除项

以下内容不得作为当前重构裁决依据：

1. 已移除的根目录旧 `prisma/` 目录
2. 已移除的旧 `v0.3` 主索引口径
3. `docs/architecture/*.md` 与 `docs/web/*.md` 中已过时的 `v0.2` 路由说明
4. 任何只描述“目标态”、但未与当前代码对齐的旧 review 记录

## 3. 本轮重构目标

### 3.1 必须达成

1. 后端边界清晰：`route -> service/orchestrator -> provider gateway / persistence`
2. AI 调用统一入口：业务代码不再直连 provider client
3. `Run.inputJson` 类型化并有运行时校验
4. 生成资产不再写入假 URL 或 provider 临时 URL
5. Planner 版本链、局部重跑、衍生数据同步的基础正确性提升
6. 前端逐步摆脱 `StudioFixture` 作为运行时长期契约
7. 文档只保留一套可执行基线

### 3.2 明确非目标

本轮重构默认不做以下事情，除非后续单独立项：

1. 不先拆微服务
2. 不先引入 Redis / event bus 作为前置工作
3. 不先做 Recipe 全链路
4. 不先做大规模 UI 改版
5. 不为了“抽象完美”引入新的 packages 分层
6. 不为了兼容旧设计而继续扩展 `StudioFixture`

## 4. Phase 依赖关系

### 4.1 阶段顺序

当前推荐顺序固定为：

1. Phase 1：文档与架构真相收口
2. Phase 2：AI 层收口重构
3. Phase 3：外部调用审计能力
4. Phase 4：模型感知分镜提示词生成
5. Phase 5：Planner 体验升级
6. Phase 6：API 分层重构
7. Phase 7：前端与后端契约清理

### 4.2 前置条件

每个 Phase 开工前至少满足：

1. Phase 2 开工前：Phase 1 文档基线已固定，所有参与者对真相源无争议
2. Phase 3 开工前：Phase 2 的 instrumentation hook 已存在
3. Phase 4 开工前：Phase 2 的 provider gateway、typed run input、Planner 基础修复已完成
4. Phase 5 开工前：Phase 4 的模型能力与 shot prompt 生成已可用
5. Phase 6 开工前：Phase 2-5 的核心行为已稳定，否则 route/service 分层会放大变动面
6. Phase 7 开工前：API DTO 已基本稳定，否则前端迁移会反复返工

当前状态：

1. 该前置条件已满足
2. Phase 7 主工作区真实路径迁移已完成，后续 guardrail 重点转为避免重新把 `StudioFixture` 拉回主路径

## 5. 变更范围约束

### 5.1 本轮优先可动目录

1. `apps/api/src/lib`
2. `apps/api/src/routes`
3. `apps/api/prisma/schema.prisma`
4. `apps/web/src/features/planner`
5. `apps/web/src/features/creation`
6. `apps/web/src/features/publish`
7. `docs/index`
8. `docs/specs`
9. `docs/reviews` 中仍被索引引用的专项文档

### 5.2 本轮谨慎变更目录

以下目录可改，但应放在后期或尽量减少：

1. `packages/domain`
2. `packages/mock-data`
3. `apps/web/src/features/explore`
4. `apps/web/src/features/settings`
5. `apps/web/src/features/admin`

原因：

1. 它们当前承载较多兼容层或非主链路能力
2. 过早改动会扩大联动面
3. 当前重构收益主要不在这些模块

## 6. 数据迁移约束

### 6.1 Schema 变更原则

涉及 schema 变更时，默认遵守：

1. 新增字段优先允许 `nullable`
2. 先写 schema + 代码兼容，再做回填
3. 回填前不得让接口强依赖新字段非空
4. 每次 schema 改动都要补“无旧数据 / 有旧数据 / 半旧半新数据”三种场景说明

### 6.2 本轮重点迁移对象

当前已知需要重点考虑回填策略的字段：

1. `PlannerRefinementVersion.sourceOutlineVersionId`
2. `PlannerShotScript.targetModelFamilySlug`
3. 任何用于 Planner -> Creation 交接的新元数据字段

## 7. 验证矩阵

### 7.1 每个 Phase 至少完成

1. 类型检查
2. 受影响纯逻辑的单元测试
3. 受影响路径的 smoke 验证
4. 文档同步更新
5. 至少一条“主路径成功”验证
6. 至少一条“失败路径不污染数据”验证

### 7.2 分层验证重点

后端：

1. route 输入校验
2. service/orchestrator 行为
3. schema 迁移与回填
4. run / worker / callback 正常闭环

前端：

1. 页面首屏可正常引导进入 workspace
2. 关键 CTA 调用的 API 路径与 payload 未漂移
3. 错误态不依赖旧 fixture 默认值“补出来”

文档：

1. 新增或调整的口径在 `master-index-v0.4.md` 中可定位
2. 被降级的旧文档头部有明确警告
3. 不再存在“当前基线引用不存在文件”的情况

### 7.3 AI 模块专项要求

所有 AI 相关重构默认必须同时满足 3 条：

1. 可观测：外部调用必须经过 transport hook，并可进入 `external_api_call_logs`
2. 可重现：prompt 组装、能力摘要、typed input、rerun scope 等纯逻辑必须有确定性单元测试覆盖
3. 可回归：仓库内必须存在可直接执行的回归入口，而不是只依赖人工点页面

当前执行入口：

1. `pnpm test:unit:api`
2. `pnpm test:ai:regression`
3. `pnpm test:web:regression`

当前辅助机制：

1. Planner prompt artifact 会随版本快照持久化到 `inputSnapshotJson.promptArtifact`
2. provider client 支持 file-based capture / replay：
   `AIV_PROVIDER_CAPTURE_DIR=/abs/path`
   `AIV_PROVIDER_REPLAY_DIR=/abs/path`
3. 浏览器主链路回归脚本已入仓：`scripts/smoke-browser-main-flow.py`
4. 失败分支测试应优先覆盖“不支持能力直接失败”和“为保护已有生成历史而拒绝 destructive finalize”两类高风险行为
5. 当前失败分支覆盖已扩展到 `run-lifecycle` 与 provider replay 错误响应，不再只验证成功路径
6. provider client 与 planner prompt 组装也必须有稳定单测，避免错误解析、404 fallback 与 refinement 模型注入裁决在后续演进中静默漂移
7. provider config test 这类“路由外但仍影响线上判定”的服务，也必须补决策单测，避免 endpoint 选择与错误码映射在重构中被悄悄改坏
8. `planner-debug` 这类调试能力也必须补 replay 断言，避免“可重现”链路本身在重构后失真
9. compare / replay 这类调试辅助路径也要有稳定断言，不能只测试“能打开页面”和“能跑一次”
10. 浏览器回归不能只看按钮存在；至少要校验主链路页面消费到的 runtime workspace 数据确实完整
11. debug 查询接口也需要锁住输出形状，避免 UI 依赖字段在重构中被静默删改
12. SSE / stream 路径也必须有事件形状与状态机断言，不能只靠手工观察页面动画
13. web 页面 bootstrap / presenter 若承载真实 DTO 到页面模型的转换，必须拆成纯函数并具备可执行单测
14. 纯函数 presenter 的单测必须有正式脚本入口，避免“测试文件存在但没人执行”
15. Planner 页面 helper / presenter 这类不直接发请求、但决定 UI/runtime 映射的纯函数，也必须进入 web unit 覆盖，避免消息流、版本视图、资源缩略图排序等展示逻辑静默漂移
16. 页面 bootstrap 若消费 runtime message，必须在进入页面模型前做最小清洗（例如 trim 与过滤纯空白文本），不能把脏消息直接带入首屏状态
17. structured doc 转换与 outline preview 这类“页面拿到什么文档结构”的纯函数，也必须进入 web unit 覆盖，避免 entityKey 继承、目标模型继承、资源优先级选择在重构中静默漂移
18. 浏览器主链路回归应优先通过真实页面 CTA 和阶段导航完成，不应长期依赖脚本直接 `goto` 下游页面来绕过集成缺口
19. Planner -> Creation 这类高风险 CTA 的业务判定，应优先抽成纯函数并进入 web unit，不能只在 hook 里靠人工点页面验证
20. API workspace 合并到页面运行时状态的映射层，也必须有纯函数单测，避免模型、素材、时长、播放状态等关键字段在 presenter 层静默漂移
21. Creation / Publish / Planner 页面内部用于生成局部编辑草稿和默认 UI 状态的纯函数，也应纳入 web unit，避免“页面能打开但编辑器默认行为已漂移”的隐性回归
22. Publish 这类以“历史来源绑定 + 页面草稿回填”为核心的页面，也必须把绑定逻辑和指标摘要抽成纯函数并进入 web unit，不能只靠组件内 `useMemo/useState` 隐式维持规则
23. 表单提交前的校验与 payload 组装也应优先抽成纯函数并进入 web unit，避免“前端按钮状态正确，但真正发出的请求字段已悄悄漂移”
24. 浏览器主链路回归除了页面主体，还应断言阶段导航的可见性与 `aria-current`，避免页面内容正常但阶段壳层已悄悄失真
25. Planner 这类存在模型感知预览的页面，浏览器回归还应断言预览区块真实渲染，不能只验证底层 API 成功
26. Publish 这类依赖弹窗完成历史来源绑定的页面，浏览器回归还应覆盖弹窗打开与基础交互，不能只验证页面静态文案存在
27. provider catalog / model discovery 这类“配置页能不能正确列出模型”的分类逻辑，也必须有 API 单测，不能只靠真人点 `/settings/providers` 临时验证
28. provider config options 这类“页面保存什么配置、默认值如何合并”的纯函数，也必须有 API 单测，避免用户配置被 merge 逻辑静默抹掉
29. provider settings presenter 这类“后端返回给配置页的展示态映射”也必须有 API 单测，避免 API key 脱敏、audio/default 状态和空态返回在 presenter 层静默漂移
30. user default model selection 这类“运行时真正选中哪个 endpoint”的决策逻辑，也必须有 API 单测，避免配置页显示正确但生成链路落到错误模型
31. 合并前默认执行 `pnpm test:quality`，除非明确知道本次变更只影响某个局部并已有更小验证集合
32. service seam 引入后，provider settings 这类 route 下沉出来的 query/catalog 决策层也必须有 API 单测，避免只是把厚 route 平移到新 service 而没有锁住行为
33. settings/provider 这类带草稿态、自动 sync 和多模型选择的页面，也必须把页面 helper 拆出来进 web 单测，不能只靠浏览器 smoke 覆盖
34. settings/provider 这类直接调用 fetch 的页面，还必须把请求 payload 和错误解析 helper 拆出来进 web 单测，避免 UI 层每次改交互都顺手打穿错误处理
35. 浏览器主链路回归除 Planner / Creation / Publish 外，还应覆盖 `/settings/providers` 这类 AI 配置入口，至少锁住 provider 卡片和多模型区块真实渲染
36. provider runtime config 这类“运行时到底读取哪个 provider 凭据和 baseUrl”的决策层，也必须有 API 单测，避免页面配置正确但执行链路落到错误 owner 或 fallback

## 8. 回滚与停手条件

出现以下情况时，应先停手收口，不继续横向扩写：

1. 一个 Phase 内同时改动 schema、provider、前端契约三层以上
2. 主路径 smoke 失败但仍继续引入新抽象
3. 文档与代码再次出现明显双轨
4. 新增抽象层无法明显减少耦合，反而增加调用跳转

## 9. 与其他文档的关系

本文与以下文档配套使用：

1. `docs/index/master-index-v0.4.md`
2. `docs/specs/backend-implementation-checklist-v0.3.md`
3. `docs/specs/frontend-workspace-contract-migration-v0.1.md`

其中：

1. `master-index-v0.4.md` 负责定义“信什么”
2. `backend-implementation-checklist-v0.3.md` 负责定义“按什么顺序做”
3. `frontend-workspace-contract-migration-v0.1.md` 负责定义“前端契约怎么迁”
