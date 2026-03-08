# 参考与合规边界

版本：v0.1  
状态：约束基线  
适用范围：全局
关联文档：
- `docs/product/mvp-prd-v0.2.md`
- `docs/specs/seko-baseline-gap-analysis-v0.1.md`
- `docs/web/web-route-and-page-spec-v0.1.md`
- `docs/web/frontend-compliance-implementation-checklist-v0.1.md`

## 1. 文档目标

本文档用于明确本项目在参考 Seko 过程中必须遵守的实现与素材边界，避免后续在编码、设计、素材整理和演示阶段出现版权、商标或其他合规风险。

本文档是工程实现约束，不构成正式法律意见。

## 2. 总原则

- Seko 是产品基线和体验参考，不是可直接搬运的源码和素材来源。
- 我们复刻的是产品能力、流程、状态机、信息架构和交互逻辑。
- 我们不直接复制、分发或提交 Seko 的前端源码、私有资源和可识别品牌素材。
- 最终交付物中的代码、组件、样式、图标、图片、文案和数据都应由我们自行实现、替换或使用合法来源。

## 3. 明确允许的参考方式

以下行为允许作为研发与设计参考：

- 观察真实页面的布局、信息层级和交互逻辑
- 记录功能链路、状态变化、按钮行为、弹窗结构和页面节奏
- 使用内部截图进行分析、比对和验收
- 根据观察结果自行编写新的前端实现、状态机、接口契约和样式系统
- 使用本地原型目录 `prototype/seko-mangju-static`、`prototype/seko-clone` 作为结构化研究基线

## 4. 明确禁止的内容

以下内容不得直接进入本项目正式代码库、演示包或产品交付物：

- Seko 的前端源码、构建产物、反编译代码、私有脚本
- Seko 的图标、插画、图片、视频、音频、字体文件
- Seko 的 Logo、品牌名称在正式对外产品中的直接复用
- Seko 的原始文案、帮助说明、营销语、页面说明文字的大段照搬
- 抓取或复用 Seko 的私有接口定义、接口返回样本、鉴权逻辑、埋点方案
- 从真实站点直接导出的 CSS、SVG、组件模板、设计资源

## 5. 工程实现要求

### 5.1 代码要求

- 前端页面、组件、样式和交互必须独立实现。
- 可以按观察到的行为复刻，但不能拷贝其源码实现。
- 即使最终视觉高度接近，也必须保证代码来源是自研。

### 5.2 视觉与素材要求

- 设计可以参考其布局和信息密度，但正式图标、插画、封面图、视频缩略图必须替换为自有或合法可用素材。
- 截图只用于内部研究，不直接作为产品发布素材。
- 对外演示时，如需展示占位内容，应使用自制 mock 资源。

### 5.3 文案要求

- 功能命名可沿用通用行业表述。
- 说明文案、提示语、营销语、空状态文案应重新撰写。
- 不直接复制 Seko 页面的成段中文文案。

### 5.4 接口与数据要求

- 接口契约按我们的领域模型和产品流程自行定义。
- 不将真实 Seko 的接口结构直接作为正式 API 合同。
- 示例数据、fixture、截图映射数据应使用自建 mock 数据。

## 6. 浏览器核验边界

必要时允许使用已授权登录态对真实 Seko 做逐页核验，但需遵守以下边界：

- 仅用于观察功能、交互和状态变化
- 可以使用已有积分进行真实链路验证
- 不触发真实付费购买行为
- 不尝试抓取、导出或复用其前端源码和私有资源
- 不将站点内部资源直接纳入本项目交付物

## 7. 研发执行清单

后续编码、设计和演示时统一遵守：

1. 先看行为与结构，再自行实现代码。
2. 参考截图只作内部比对，不直接进入正式前端资源目录。
3. 所有 mock 图、图标、封面、占位图都使用自制或合法来源素材。
4. 对外描述使用“以 Seko 为体验基线”或“参考 Seko 主流程”，不使用容易引发误解的品牌复刻表述。
5. 如果某个素材或实现来源不明确，默认不使用，先替换。

配套执行清单见：`docs/web/frontend-compliance-implementation-checklist-v0.1.md`

正式前端启动前的目录与资源计划见：`docs/web/frontend-bootstrap-and-resource-plan-v0.1.md`



===== OUTPUT SPLIT =====

Chunk ID: bb3ba8
Wall time: 0.0507 seconds
Process exited with code 0
Original token count: 4087
Output:
docs/index/master-index-v0.1.md:7:- `docs/product/mvp-prd-v0.2.md`
docs/index/master-index-v0.1.md:8:- `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/index/master-index-v0.1.md:9:- `docs/product/mvp-roadmap-v0.1.md`
docs/index/master-index-v0.1.md:10:- `docs/product/reference-compliance-boundary-v0.1.md`
docs/index/master-index-v0.1.md:55:#### `docs/product/reference-compliance-boundary-v0.1.md`
docs/index/master-index-v0.1.md:74:#### `docs/product/mvp-prd-v0.2.md`
docs/index/master-index-v0.1.md:103:#### `docs/web/frontend-compliance-implementation-checklist-v0.1.md`
docs/index/master-index-v0.1.md:121:#### `docs/web/frontend-bootstrap-and-resource-plan-v0.1.md`
docs/index/master-index-v0.1.md:140:#### `docs/web/brand-replacement-table-v0.1.md`
docs/index/master-index-v0.1.md:156:#### `docs/web/copy-replacement-table-v0.1.md`
docs/index/master-index-v0.1.md:172:#### `docs/web/console-spec-v0.1.md`
docs/index/master-index-v0.1.md:195:- 编码阶段应结合 `web-route-and-page-spec-v0.1.md` 与 `web-design-token-and-component-spec-v0.1.md` 一起使用
docs/index/master-index-v0.1.md:199:#### `docs/architecture/feasibility-and-tech-selection-v0.1.md`
docs/index/master-index-v0.1.md:222:#### `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/index/master-index-v0.1.md:244:#### `docs/architecture/n8n-adoption-decision-v0.1.md`
docs/index/master-index-v0.1.md:264:#### `docs/specs/seko-baseline-gap-analysis-v0.1.md`
docs/index/master-index-v0.1.md:285:#### `docs/specs/mvp-domain-model-spec-v0.1.md`
docs/index/master-index-v0.1.md:303:#### `docs/specs/mvp-command-query-event-spec-v0.1.md`
docs/index/master-index-v0.1.md:320:#### `docs/openclaw/openclaw-contract-spec-v0.1.md`
docs/index/master-index-v0.1.md:337:#### `docs/web/web-route-and-page-spec-v0.1.md`
docs/index/master-index-v0.1.md:355:#### `docs/web/web-design-token-and-component-spec-v0.1.md`
docs/index/master-index-v0.1.md:371:#### `docs/specs/mvp-mock-data-and-fixtures-spec-v0.1.md`
docs/index/master-index-v0.1.md:390:#### `docs/openclaw/openclaw-integration-spec-v0.1.md`
docs/index/master-index-v0.1.md:411:#### `docs/specs/backend-data-api-spec-v0.1.md`
docs/index/master-index-v0.1.md:434:#### `docs/product/mvp-roadmap-v0.1.md`
docs/index/master-index-v0.1.md:456:#### `docs/specs/state-machine-and-error-code-spec-v0.1.md`
docs/index/master-index-v0.1.md:477:#### `docs/openclaw/openclaw-protocol-schema-v0.1.md`
docs/index/master-index-v0.1.md:502:1. `docs/index/master-index-v0.1.md`
docs/index/master-index-v0.1.md:503:2. `docs/product/mvp-prd-v0.2.md`
docs/index/master-index-v0.1.md:504:3. `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/index/master-index-v0.1.md:505:4. `docs/architecture/feasibility-and-tech-selection-v0.1.md`
docs/index/master-index-v0.1.md:506:5. `docs/architecture/n8n-adoption-decision-v0.1.md`
docs/index/master-index-v0.1.md:507:6. `docs/web/web-route-and-page-spec-v0.1.md`
docs/index/master-index-v0.1.md:508:7. `docs/product/mvp-roadmap-v0.1.md`
docs/index/master-index-v0.1.md:514:1. `docs/index/master-index-v0.1.md`
docs/index/master-index-v0.1.md:515:2. `docs/product/mvp-prd-v0.2.md`
docs/index/master-index-v0.1.md:516:3. `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/index/master-index-v0.1.md:517:4. `docs/web/web-route-and-page-spec-v0.1.md`
docs/index/master-index-v0.1.md:518:5. `docs/web/web-design-token-and-component-spec-v0.1.md`
docs/index/master-index-v0.1.md:519:6. `docs/specs/mvp-mock-data-and-fixtures-spec-v0.1.md`
docs/index/master-index-v0.1.md:520:7. `docs/specs/mvp-domain-model-spec-v0.1.md`
docs/index/master-index-v0.1.md:521:8. `docs/specs/mvp-command-query-event-spec-v0.1.md`
docs/index/master-index-v0.1.md:522:9. `docs/specs/backend-data-api-spec-v0.1.md`
docs/index/master-index-v0.1.md:528:1. `docs/index/master-index-v0.1.md`
docs/index/master-index-v0.1.md:529:2. `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/index/master-index-v0.1.md:530:3. `docs/specs/mvp-domain-model-spec-v0.1.md`
docs/index/master-index-v0.1.md:531:4. `docs/specs/mvp-command-query-event-spec-v0.1.md`
docs/index/master-index-v0.1.md:532:5. `docs/openclaw/openclaw-contract-spec-v0.1.md`
docs/index/master-index-v0.1.md:533:6. `docs/specs/backend-data-api-spec-v0.1.md`
docs/index/master-index-v0.1.md:534:7. `docs/openclaw/openclaw-integration-spec-v0.1.md`
docs/index/master-index-v0.1.md:535:8. `docs/openclaw/openclaw-protocol-schema-v0.1.md`
docs/index/master-index-v0.1.md:536:9. `docs/specs/state-machine-and-error-code-spec-v0.1.md`
docs/index/master-index-v0.1.md:537:10. `docs/architecture/n8n-adoption-decision-v0.1.md`
docs/index/master-index-v0.1.md:538:11. `docs/product/mvp-roadmap-v0.1.md`
docs/index/master-index-v0.1.md:568:当前已建立待归档目录：`docs/archive-pending-delete/`
docs/web/console-spec-v0.1.md:7:- `docs/product/mvp-prd-v0.2.md`
docs/web/console-spec-v0.1.md:8:- `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/architecture/feasibility-and-tech-selection-v0.1.md:7:- `docs/product/mvp-prd-v0.2.md`
docs/architecture/feasibility-and-tech-selection-v0.1.md:8:- `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/architecture/feasibility-and-tech-selection-v0.1.md:9:- `docs/architecture/n8n-adoption-decision-v0.1.md`
docs/architecture/feasibility-and-tech-selection-v0.1.md:10:- `docs/specs/mvp-domain-model-spec-v0.1.md`
docs/architecture/feasibility-and-tech-selection-v0.1.md:11:- `docs/specs/mvp-command-query-event-spec-v0.1.md`
docs/architecture/feasibility-and-tech-selection-v0.1.md:19:- `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/architecture/feasibility-and-tech-selection-v0.1.md:20:- `docs/specs/mvp-domain-model-spec-v0.1.md`
docs/architecture/feasibility-and-tech-selection-v0.1.md:21:- `docs/specs/mvp-command-query-event-spec-v0.1.md`
docs/architecture/feasibility-and-tech-selection-v0.1.md:22:- `docs/openclaw/openclaw-contract-spec-v0.1.md`
docs/web/frontend-compliance-implementation-checklist-v0.1.md:7:- `docs/product/reference-compliance-boundary-v0.1.md`
docs/web/frontend-compliance-implementation-checklist-v0.1.md:8:- `docs/product/mvp-prd-v0.2.md`
docs/web/frontend-compliance-implementation-checklist-v0.1.md:9:- `docs/web/web-route-and-page-spec-v0.1.md`
docs/architecture/n8n-adoption-decision-v0.1.md:7:- `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/architecture/n8n-adoption-decision-v0.1.md:8:- `docs/architecture/feasibility-and-tech-selection-v0.1.md`
docs/architecture/n8n-adoption-decision-v0.1.md:9:- `docs/openclaw/openclaw-integration-spec-v0.1.md`
docs/architecture/n8n-adoption-decision-v0.1.md:10:- `docs/specs/backend-data-api-spec-v0.1.md`
docs/web/web-design-token-and-component-spec-v0.1.md:7:- `docs/web/web-route-and-page-spec-v0.1.md`
docs/web/web-design-token-and-component-spec-v0.1.md:8:- `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/architecture/system-architecture-role-spec-v0.1.md:7:- `docs/product/mvp-prd-v0.2.md`
docs/architecture/system-architecture-role-spec-v0.1.md:8:- `docs/web/console-spec-v0.1.md`
docs/architecture/system-architecture-role-spec-v0.1.md:9:- `docs/architecture/feasibility-and-tech-selection-v0.1.md`
docs/architecture/system-architecture-role-spec-v0.1.md:10:- `docs/openclaw/openclaw-integration-spec-v0.1.md`
docs/architecture/system-architecture-role-spec-v0.1.md:11:- `docs/specs/backend-data-api-spec-v0.1.md`
docs/architecture/system-architecture-role-spec-v0.1.md:12:- `docs/specs/state-machine-and-error-code-spec-v0.1.md`
docs/architecture/system-architecture-role-spec-v0.1.md:13:- `docs/architecture/n8n-adoption-decision-v0.1.md`
docs/architecture/system-architecture-role-spec-v0.1.md:206:详细决策见：`docs/architecture/n8n-adoption-decision-v0.1.md`
docs/web/brand-replacement-table-v0.1.md:7:- `docs/product/reference-compliance-boundary-v0.1.md`
docs/web/brand-replacement-table-v0.1.md:8:- `docs/web/frontend-compliance-implementation-checklist-v0.1.md`
docs/web/brand-replacement-table-v0.1.md:9:- `docs/web/frontend-bootstrap-and-resource-plan-v0.1.md`
docs/web/frontend-bootstrap-and-resource-plan-v0.1.md:7:- `docs/web/frontend-compliance-implementation-checklist-v0.1.md`
docs/web/frontend-bootstrap-and-resource-plan-v0.1.md:8:- `docs/product/reference-compliance-boundary-v0.1.md`
docs/web/frontend-bootstrap-and-resource-plan-v0.1.md:9:- `docs/web/web-route-and-page-spec-v0.1.md`
docs/web/frontend-bootstrap-and-resource-plan-v0.1.md:10:- `docs/web/web-design-token-and-component-spec-v0.1.md`
docs/web/frontend-bootstrap-and-resource-plan-v0.1.md:11:- `docs/specs/backend-data-api-spec-v0.1.md`
docs/web/frontend-bootstrap-and-resource-plan-v0.1.md:91:docs/
docs/product/mvp-prd-v0.2.md:7:- `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/product/mvp-prd-v0.2.md:8:- `docs/web/web-route-and-page-spec-v0.1.md`
docs/product/mvp-prd-v0.2.md:9:- `docs/product/mvp-roadmap-v0.1.md`
docs/product/mvp-prd-v0.2.md:10:- `docs/product/reference-compliance-boundary-v0.1.md`
docs/product/mvp-prd-v0.2.md:100:- 详细约束见 `docs/product/reference-compliance-boundary-v0.1.md`
docs/web/web-route-and-page-spec-v0.1.md:7:- `docs/specs/seko-baseline-gap-analysis-v0.1.md`
docs/web/web-route-and-page-spec-v0.1.md:8:- `docs/specs/mvp-domain-model-spec-v0.1.md`
docs/web/web-route-and-page-spec-v0.1.md:9:- `docs/specs/backend-data-api-spec-v0.1.md`
docs/web/web-route-and-page-spec-v0.1.md:10:- `docs/specs/mvp-command-query-event-spec-v0.1.md`
docs/web/web-route-and-page-spec-v0.1.md:11:- `docs/web/web-design-token-and-component-spec-v0.1.md`
docs/product/mvp-roadmap-v0.1.md:7:- `docs/product/mvp-prd-v0.2.md`
docs/product/mvp-roadmap-v0.1.md:8:- `docs/web/console-spec-v0.1.md`
docs/product/mvp-roadmap-v0.1.md:9:- `docs/architecture/feasibility-and-tech-selection-v0.1.md`
docs/product/mvp-roadmap-v0.1.md:10:- `docs/openclaw/openclaw-integration-spec-v0.1.md`
docs/product/mvp-roadmap-v0.1.md:11:- `docs/specs/backend-data-api-spec-v0.1.md`
docs/product/mvp-roadmap-v0.1.md:12:- `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/web/copy-replacement-table-v0.1.md:7:- `docs/product/reference-compliance-boundary-v0.1.md`
docs/web/copy-replacement-table-v0.1.md:8:- `docs/web/brand-replacement-table-v0.1.md`
docs/web/copy-replacement-table-v0.1.md:9:- `docs/web/frontend-bootstrap-and-resource-plan-v0.1.md`
docs/product/reference-compliance-boundary-v0.1.md:7:- `docs/product/mvp-prd-v0.2.md`
docs/product/reference-compliance-boundary-v0.1.md:8:- `docs/specs/seko-baseline-gap-analysis-v0.1.md`
docs/product/reference-compliance-boundary-v0.1.md:9:- `docs/web/web-route-and-page-spec-v0.1.md`
docs/product/reference-compliance-boundary-v0.1.md:10:- `docs/web/frontend-compliance-implementation-checklist-v0.1.md`
docs/product/reference-compliance-boundary-v0.1.md:92:配套执行清单见：`docs/web/frontend-compliance-implementation-checklist-v0.1.md`
docs/product/reference-compliance-boundary-v0.1.md:94:正式前端启动前的目录与资源计划见：`docs/web/frontend-bootstrap-and-resource-plan-v0.1.md`
apps/web/next-env.d.ts:6:// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
docs/specs/state-machine-and-error-code-spec-v0.1.md:7:- `docs/specs/seko-baseline-gap-analysis-v0.1.md`
docs/specs/state-machine-and-error-code-spec-v0.1.md:8:- `docs/specs/mvp-domain-model-spec-v0.1.md`
docs/specs/state-machine-and-error-code-spec-v0.1.md:9:- `docs/specs/backend-data-api-spec-v0.1.md`
docs/specs/state-machine-and-error-code-spec-v0.1.md:10:- `docs/specs/mvp-command-query-event-spec-v0.1.md`
docs/specs/state-machine-and-error-code-spec-v0.1.md:11:- `docs/openclaw/openclaw-integration-spec-v0.1.md`
docs/specs/backend-data-api-spec-v0.1.md:7:- `docs/specs/seko-baseline-gap-analysis-v0.1.md`
docs/specs/backend-data-api-spec-v0.1.md:8:- `docs/specs/mvp-domain-model-spec-v0.1.md`
docs/specs/backend-data-api-spec-v0.1.md:9:- `docs/specs/mvp-command-query-event-spec-v0.1.md`
docs/specs/backend-data-api-spec-v0.1.md:10:- `docs/specs/state-machine-and-error-code-spec-v0.1.md`
docs/specs/backend-data-api-spec-v0.1.md:11:- `docs/web/web-route-and-page-spec-v0.1.md`
docs/specs/mvp-command-query-event-spec-v0.1.md:7:- `docs/specs/seko-baseline-gap-analysis-v0.1.md`
docs/specs/mvp-command-query-event-spec-v0.1.md:8:- `docs/specs/mvp-domain-model-spec-v0.1.md`
docs/specs/mvp-command-query-event-spec-v0.1.md:9:- `docs/specs/backend-data-api-spec-v0.1.md`
docs/specs/mvp-command-query-event-spec-v0.1.md:10:- `docs/specs/state-machine-and-error-code-spec-v0.1.md`
docs/specs/mvp-command-query-event-spec-v0.1.md:11:- `docs/openclaw/openclaw-integration-spec-v0.1.md`
docs/specs/seko-baseline-gap-analysis-v0.1.md:7:- `prototype/seko-mangju-static/docs/漫剧模式_产品原型_UI交互全集.md`
docs/specs/seko-baseline-gap-analysis-v0.1.md:8:- `prototype/seko-clone/docs/01_产品设计文档_PRD.md`
docs/specs/seko-baseline-gap-analysis-v0.1.md:9:- `prototype/seko-clone/docs/02_原型规格文档_Prototype.md`
docs/specs/seko-baseline-gap-analysis-v0.1.md:10:- `prototype/seko-clone/docs/03_UI与交互精确规范.md`
docs/specs/seko-baseline-gap-analysis-v0.1.md:11:- `prototype/seko-clone/docs/04_Action状态变更矩阵.md`
docs/specs/seko-baseline-gap-analysis-v0.1.md:12:- `docs/specs/mvp-domain-model-spec-v0.1.md`
docs/specs/seko-baseline-gap-analysis-v0.1.md:13:- `docs/specs/backend-data-api-spec-v0.1.md`
docs/specs/seko-baseline-gap-analysis-v0.1.md:14:- `docs/specs/mvp-command-query-event-spec-v0.1.md`
docs/specs/seko-baseline-gap-analysis-v0.1.md:15:- `docs/web/web-route-and-page-spec-v0.1.md`
docs/specs/seko-baseline-gap-analysis-v0.1.md:342:- `docs/specs/mvp-domain-model-spec-v0.1.md`
docs/specs/seko-baseline-gap-analysis-v0.1.md:343:- `docs/specs/backend-data-api-spec-v0.1.md`
docs/specs/seko-baseline-gap-analysis-v0.1.md:344:- `docs/specs/mvp-command-query-event-spec-v0.1.md`
docs/specs/seko-baseline-gap-analysis-v0.1.md:345:- `docs/specs/state-machine-and-error-code-spec-v0.1.md`
docs/specs/seko-baseline-gap-analysis-v0.1.md:346:- `docs/web/web-route-and-page-spec-v0.1.md`
docs/specs/seko-baseline-gap-analysis-v0.1.md:349:- `docs/index/master-index-v0.1.md`
docs/specs/mvp-domain-model-spec-v0.1.md:7:- `docs/specs/seko-baseline-gap-analysis-v0.1.md`
docs/specs/mvp-domain-model-spec-v0.1.md:8:- `docs/specs/backend-data-api-spec-v0.1.md`
docs/specs/mvp-domain-model-spec-v0.1.md:9:- `docs/specs/mvp-command-query-event-spec-v0.1.md`
docs/specs/mvp-domain-model-spec-v0.1.md:10:- `docs/specs/state-machine-and-error-code-spec-v0.1.md`
docs/specs/mvp-domain-model-spec-v0.1.md:11:- `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/specs/mvp-mock-data-and-fixtures-spec-v0.1.md:7:- `docs/specs/mvp-domain-model-spec-v0.1.md`
docs/specs/mvp-mock-data-and-fixtures-spec-v0.1.md:8:- `docs/specs/mvp-command-query-event-spec-v0.1.md`
docs/specs/mvp-mock-data-and-fixtures-spec-v0.1.md:9:- `docs/web/web-route-and-page-spec-v0.1.md`
docs/openclaw/openclaw-protocol-schema-v0.1.md:7:- `docs/specs/mvp-domain-model-spec-v0.1.md`
docs/openclaw/openclaw-protocol-schema-v0.1.md:8:- `docs/specs/mvp-command-query-event-spec-v0.1.md`
docs/openclaw/openclaw-protocol-schema-v0.1.md:9:- `docs/openclaw/openclaw-integration-spec-v0.1.md`
docs/openclaw/openclaw-protocol-schema-v0.1.md:10:- `docs/specs/state-machine-and-error-code-spec-v0.1.md`
docs/openclaw/openclaw-protocol-schema-v0.1.md:11:- `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/openclaw/openclaw-integration-spec-v0.1.md:7:- `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/openclaw/openclaw-integration-spec-v0.1.md:8:- `docs/specs/mvp-domain-model-spec-v0.1.md`
docs/openclaw/openclaw-integration-spec-v0.1.md:9:- `docs/specs/mvp-command-query-event-spec-v0.1.md`
docs/openclaw/openclaw-integration-spec-v0.1.md:10:- `docs/openclaw/openclaw-contract-spec-v0.1.md`
docs/openclaw/openclaw-integration-spec-v0.1.md:11:- `docs/openclaw/openclaw-protocol-schema-v0.1.md`
docs/openclaw/openclaw-contract-spec-v0.1.md:7:- `docs/architecture/system-architecture-role-spec-v0.1.md`
docs/openclaw/openclaw-contract-spec-v0.1.md:8:- `docs/specs/mvp-command-query-event-spec-v0.1.md`
docs/openclaw/openclaw-contract-spec-v0.1.md:9:- `docs/architecture/n8n-adoption-decision-v0.1.md`


===== OUTPUT SPLIT =====

Chunk ID: 48551f
Wall time: 0.0512 seconds
Process exited with code 0
Original token count: 96
Output:
import type { ProjectStatus } from '@aiv/domain';

export type ProjectStage = 'planner' | 'creation' | 'publish';

export function resolveProjectStage(status: ProjectStatus): ProjectStage {
  if (status === 'published') {
    return 'publish';
  }

  if (status === 'creating' || status === 'export_ready' || status === 'exported') {
    return 'creation';
  }

  return 'planner';
}


===== OUTPUT SPLIT =====

Chunk ID: cdcaf8
Wall time: 0.0516 seconds
Process exited with code 0
Original token count: 2082
Output:
apps/web/src/features/publish/components/publish-page.tsx:21:  return studio.historyWorks.find((item) => item.title === studio.publish.draft.title)?.id ?? studio.historyWorks[0]?.id ?? null;
apps/web/src/features/publish/components/publish-page.tsx:27:  const [draft, setDraft] = useState<PublishDraft>(studio.publish.draft);
apps/web/src/features/publish/components/publish-page.tsx:37:      return studio.historyWorks;
apps/web/src/features/publish/components/publish-page.tsx:40:    return studio.historyWorks.filter((item) => item.category === activeCategory);
apps/web/src/features/publish/components/publish-page.tsx:41:  }, [activeCategory, studio.historyWorks]);
apps/web/src/features/publish/components/publish-page.tsx:43:  const selectedHistory = studio.historyWorks.find((item) => item.id === selectedHistoryId) ?? null;
apps/web/src/features/publish/components/publish-page.tsx:44:  const pickerSelection = studio.historyWorks.find((item) => item.id === pickerSelectionId) ?? null;
apps/web/src/features/publish/components/publish-page.tsx:48:      { label: '当前项目', value: studio.project.title, meta: `${studio.project.aspectRatio} · 待发布` },
apps/web/src/features/publish/components/publish-page.tsx:49:      { label: '历史作品', value: String(studio.historyWorks.length), meta: selectedHistory?.category ?? '未绑定' },
apps/web/src/features/publish/components/publish-page.tsx:53:    [draft.status, selectedHistory, studio.historyWorks.length, studio.project.aspectRatio, studio.project.title],
apps/web/src/features/publish/components/publish-page.tsx:57:    const target = studio.historyWorks.find((item) => item.id === historyId);
apps/web/src/features/publish/components/publish-page.tsx:101:    setDraft(studio.publish.draft);
apps/web/src/features/publish/components/publish-page.tsx:115:          brandName={studio.brandName}
apps/web/src/features/publish/components/publish-page.tsx:117:          pageTitle={studio.project.title}
apps/web/src/features/publish/components/publish-page.tsx:122:              <StageLinks projectId={studio.project.id} activeStage="publish" />
apps/web/src/features/publish/components/publish-page.tsx:156:                        <strong>{draft.title || studio.project.title}</strong>
apps/web/src/features/publish/components/publish-page.tsx:362:          <p>{studio.publish.successMessage}</p>
apps/web/src/features/creation/components/creation-page.tsx:29:            <Link href={`/projects/${studio.project.id}/planner`} className={styles.backButton}>
apps/web/src/features/creation/components/creation-page.tsx:33:              <small>{studio.brandName}</small>
apps/web/src/features/creation/components/creation-page.tsx:34:              <h1>{studio.project.title}</h1>
apps/web/src/features/creation/components/creation-page.tsx:38:            <Badge>{studio.scenarioLabel}</Badge>
apps/web/src/features/creation/components/creation-page.tsx:50:            <Badge>{studio.episodes[0]?.title ?? '单集项目'}</Badge>
apps/web/src/features/creation/components/creation-page.tsx:58:              { id: 'planner', label: '策划', href: `/projects/${studio.project.id}/planner` },
apps/web/src/features/creation/components/creation-page.tsx:59:              { id: 'creation', label: '分片生成', href: `/projects/${studio.project.id}/creation` },
apps/web/src/features/creation/components/creation-page.tsx:60:              { id: 'publish', label: '发布', href: `/projects/${studio.project.id}/publish` },
apps/web/src/features/explore/components/explore-page.tsx:114:    router.push(`/projects/${studio.project.id}/planner?prompt=${encodeURIComponent(promptText)}`);
apps/web/src/features/explore/components/explore-page.tsx:172:            <button className={styles.publishBtn} onClick={() => router.push(`/projects/${studio.project.id}/creation`)}>
apps/web/src/features/planner/components/planner-page.tsx:138:  const [displayTitle, setDisplayTitle] = useState(studio.project.title);
apps/web/src/features/planner/components/planner-page.tsx:139:  const [plannerMode, setPlannerMode] = useState<PlannerMode>(studio.project.contentMode === 'series' ? 'series' : 'single');
apps/web/src/features/planner/components/planner-page.tsx:140:  const [plannerEpisodes, setPlannerEpisodes] = useState<PlannerEpisodeDraft[]>(() => buildPlannerEpisodes(studio.project.title, studio.project.contentMode === 'series' ? 'series' : 'single', studio.project.brief));
apps/web/src/features/planner/components/planner-page.tsx:142:  const [aspectRatio, setAspectRatio] = useState(studio.project.aspectRatio);
apps/web/src/features/planner/components/planner-page.tsx:144:  const [requirement, setRequirement] = useState(studio.planner.submittedRequirement);
apps/web/src/features/planner/components/planner-page.tsx:145:  const [messages, setMessages] = useState(studio.planner.messages);
apps/web/src/features/planner/components/planner-page.tsx:146:  const [steps, setSteps] = useState(studio.planner.steps);
apps/web/src/features/planner/components/planner-page.tsx:147:  const [references, setReferences] = useState(studio.planner.references);
apps/web/src/features/planner/components/planner-page.tsx:148:  const [storyboards, setStoryboards] = useState(studio.planner.storyboards);
apps/web/src/features/planner/components/planner-page.tsx:149:  const [sections, setSections] = useState(studio.planner.sections);
apps/web/src/features/planner/components/planner-page.tsx:150:  const [status, setStatus] = useState(studio.planner.status);
apps/web/src/features/planner/components/planner-page.tsx:151:  const [docProgressPercent, setDocProgressPercent] = useState(studio.planner.docProgressPercent);
apps/web/src/features/planner/components/planner-page.tsx:152:  const [remainingPoints, setRemainingPoints] = useState(studio.creation.points);
apps/web/src/features/planner/components/planner-page.tsx:159:  const [activeSectionId, setActiveSectionId] = useState(studio.planner.sections.find((item) => item.open)?.id ?? studio.planner.sections[0]?.id ?? 'summary');
apps/web/src/features/planner/components/planner-page.tsx:232:      setPlannerEpisodes(buildPlannerEpisodes(incomingTitle ?? displayTitle, incomingMode, studio.project.brief));
apps/web/src/features/planner/components/planner-page.tsx:235:  }, [displayTitle, searchParams, studio.project.brief]);
apps/web/src/features/planner/components/planner-page.tsx:262:      const focusedEpisode = activeEpisode ?? plannerEpisodes[0] ?? buildPlannerEpisodes(displayTitle, 'single', studio.project.brief)[0];
apps/web/src/features/planner/components/planner-page.tsx:282:      : buildPlannerEpisodes(displayTitle, 'series', studio.project.brief);
apps/web/src/features/planner/components/planner-page.tsx:418:    studio.planner.steps.forEach((_step, index) => {
apps/web/src/features/planner/components/planner-page.tsx:461:    }, studio.planner.steps.length * 480 + 320);
apps/web/src/features/planner/components/planner-page.tsx:477:    if (remainingPoints < studio.planner.pointCost) {
apps/web/src/features/planner/components/planner-page.tsx:484:    setRemainingPoints((current) => current - studio.planner.pointCost);
apps/web/src/features/planner/components/planner-page.tsx:494:      router.push(`/projects/${studio.project.id}/creation`);
apps/web/src/features/planner/components/planner-page.tsx:679:              <span className={styles.brandPill}>{studio.brandName}</span>
apps/web/src/features/planner/components/planner-page.tsx:684:            <p className={styles.headerDescription}>{studio.project.brief}</p>
apps/web/src/features/planner/components/planner-page.tsx:691:            <StageLinks projectId={studio.project.id} activeStage="planner" />
apps/web/src/features/planner/components/planner-page.tsx:718:                <span>{`预计消耗 ${studio.planner.pointCost} 积分`}</span>
apps/web/src/features/planner/components/planner-page.tsx:928:                      <header>{item.role === 'assistant' ? studio.assistantName : '你'}</header>
apps/web/src/features/planner/components/planner-page.tsx:1080:              <strong>{studio.planner.pointCost} 积分</strong>
apps/web/src/features/planner/components/planner-page.tsx:1084:            <Badge tone={remainingPoints >= studio.planner.pointCost ? 'success' : 'warning'}>{`剩余 ${remainingPoints} 积分`}</Badge>


===== OUTPUT SPLIT =====

Chunk ID: ed4db2
Wall time: 0.0515 seconds
Process exited with code 0
Original token count: 2242
Output:
apps/web/src/features/explore/components/explore-page.tsx:114:    router.push(`/projects/${studio.project.id}/planner?prompt=${encodeURIComponent(promptText)}`);
apps/web/src/features/explore/components/explore-page.tsx:127:            <div className={styles.brandMark} onClick={() => router.push('/explore')}>
apps/web/src/features/explore/components/explore-page.tsx:130:            <button className={cx(styles.navBtn, activeSidebarNav === 'home' && styles.navBtnActive)} aria-label="首页" title="首页" onClick={() => setActiveSidebarNav('home')}>
apps/web/src/features/explore/components/explore-page.tsx:133:            <button className={cx(styles.navBtn, activeSidebarNav === 'projects' && styles.navBtnActive)} aria-label="作品" title="我的资产" onClick={() => setActiveSidebarNav('projects')}>
apps/web/src/features/explore/components/explore-page.tsx:136:            <button className={cx(styles.navBtn, activeSidebarNav === 'avatar' && styles.navBtnActive)} aria-label="资产" title="数字分身" onClick={() => setActiveSidebarNav('avatar')}>
apps/web/src/features/explore/components/explore-page.tsx:139:            <button className={cx(styles.navBtn, activeSidebarNav === 'voice' && styles.navBtnActive)} aria-label="社区" title="声音克隆" onClick={() => setActiveSidebarNav('voice')}>
apps/web/src/features/explore/components/explore-page.tsx:146:            <button className={styles.vipBadge} onClick={() => router.push('/vip')}>
apps/web/src/features/explore/components/explore-page.tsx:150:            <button className={styles.utilBtn} aria-label="Profile" onClick={() => router.push('/profile')}>
apps/web/src/features/explore/components/explore-page.tsx:155:            <button className={styles.utilBtn} aria-label="Notifications" onClick={() => router.push('/notifications')}>
apps/web/src/features/explore/components/explore-page.tsx:158:            <button className={styles.utilBtn} aria-label="Feedback" onClick={() => router.push('/feedback')}>
apps/web/src/features/explore/components/explore-page.tsx:172:            <button className={styles.publishBtn} onClick={() => router.push(`/projects/${studio.project.id}/creation`)}>
apps/web/src/features/explore/components/explore-page.tsx:380:                        <span onClick={() => router.push('/projects/new-character')} className={styles.textLink}>+ 添加新主体</span>
apps/web/src/features/planner/components/planner-page.tsx:30:  title: string;
apps/web/src/features/planner/components/planner-page.tsx:77:function buildPlannerEpisodes(title: string, mode: PlannerMode, brief: string): PlannerEpisodeDraft[] {
apps/web/src/features/planner/components/planner-page.tsx:78:  const baseTitle = title.slice(0, 18) || '雨夜街头的橘色微光';
apps/web/src/features/planner/components/planner-page.tsx:85:        title: baseTitle,
apps/web/src/features/planner/components/planner-page.tsx:97:      title: `${baseTitle}·起`,
apps/web/src/features/planner/components/planner-page.tsx:105:      title: `${baseTitle}·承`,
apps/web/src/features/planner/components/planner-page.tsx:113:      title: `${baseTitle}·合`,
apps/web/src/features/planner/components/planner-page.tsx:134:  const searchParams = useSearchParams();
apps/web/src/features/planner/components/planner-page.tsx:138:  const [displayTitle, setDisplayTitle] = useState(studio.project.title);
apps/web/src/features/planner/components/planner-page.tsx:140:  const [plannerEpisodes, setPlannerEpisodes] = useState<PlannerEpisodeDraft[]>(() => buildPlannerEpisodes(studio.project.title, studio.project.contentMode === 'series' ? 'series' : 'single', studio.project.brief));
apps/web/src/features/planner/components/planner-page.tsx:203:    const incomingPrompt = searchParams.get('prompt')?.trim();
apps/web/src/features/planner/components/planner-page.tsx:204:    const incomingTitle = searchParams.get('title')?.trim();
apps/web/src/features/planner/components/planner-page.tsx:205:    const incomingMode = searchParams.get('storyMode');
apps/web/src/features/planner/components/planner-page.tsx:235:  }, [displayTitle, searchParams, studio.project.brief]);
apps/web/src/features/planner/components/planner-page.tsx:303:          title: `第 ${nextSequence} 集：新篇章`,
apps/web/src/features/planner/components/planner-page.tsx:358:        title: `${target.title} 副本`,
apps/web/src/features/planner/components/planner-page.tsx:494:      router.push(`/projects/${studio.project.id}/creation`);
apps/web/src/features/planner/components/planner-page.tsx:533:    if (!referenceDraft.title.trim() || !referenceDraft.prompt.trim()) {
apps/web/src/features/planner/components/planner-page.tsx:548:    if (!storyboardDraft.title.trim() || !storyboardDraft.visualPrompt.trim() || !storyboardDraft.compositionPrompt.trim() || !storyboardDraft.motionPrompt.trim()) {
apps/web/src/features/planner/components/planner-page.tsx:570:        title: `${target.title} 副本`,
apps/web/src/features/planner/components/planner-page.tsx:588:      title: `分镜 ${String(sequence).padStart(2, '0')}`,
apps/web/src/features/planner/components/planner-page.tsx:658:            <li key={reference.id}>{`${reference.title} · ${reference.modelId} · ${reference.variantLabel}`}</li>
apps/web/src/features/planner/components/planner-page.tsx:667:          <li key={storyboard.id}>{`${storyboard.title}：${storyboard.visualPrompt}`}</li>
apps/web/src/features/planner/components/planner-page.tsx:688:            <Button variant="secondary" className={styles.backButton} onClick={() => router.push('/explore')}>
apps/web/src/features/planner/components/planner-page.tsx:742:                          setNotice(`已切换到 ${item.title} 的策划视图。`);
apps/web/src/features/planner/components/planner-page.tsx:749:                        <strong>{item.title}</strong>
apps/web/src/features/planner/components/planner-page.tsx:780:            <Panel className={styles.configPanel} eyebrow="项目设置" title="当前剧集策划">
apps/web/src/features/planner/components/planner-page.tsx:831:                    value={activeEpisode?.title ?? ''}
apps/web/src/features/planner/components/planner-page.tsx:837:                      updateEpisode(activeEpisode.id, { title: event.target.value });
apps/web/src/features/planner/components/planner-page.tsx:858:            <Panel className={styles.documentPanel} eyebrow="策划文档" title="文档分区与章节折叠" actions={<small>{activeSectionLabel}</small>}>
apps/web/src/features/planner/components/planner-page.tsx:869:                <strong>{activeEpisode?.title ?? 'EP 01'}</strong>
apps/web/src/features/planner/components/planner-page.tsx:892:              <Panel className={styles.agentPanel} eyebrow="Agent 协作" title="需求提交与生成节奏" actions={<small>{ready ? '全部完成' : status === 'updating' ? '进行中' : '待启动'}</small>}>
apps/web/src/features/planner/components/planner-page.tsx:908:                        <strong>{item.title}</strong>
apps/web/src/features/planner/components/planner-page.tsx:936:                <Panel className={styles.referencePanel} eyebrow="主体参考图" title="Hover 后显示编辑 / 重生成 / 删除" actions={<small>{references.length} 张参考</small>}>
apps/web/src/features/planner/components/planner-page.tsx:987:                        <strong>{item.title}</strong>
apps/web/src/features/planner/components/planner-page.tsx:995:                <Panel className={styles.storyboardPanel} eyebrow="分镜草稿" title="Hover 后显示编辑 / 复制 / 删除" actions={<Button variant="secondary" onClick={addStoryboard}>新增分镜</Button>}>
apps/web/src/features/planner/components/planner-page.tsx:1014:                            <strong>{item.title}</strong>
apps/web/src/features/planner/components/planner-page.tsx:1072:              <strong>{activeEpisode?.title ?? 'EP 01'}</strong>
apps/web/src/features/planner/components/planner-page.tsx:1092:        title="编辑主体参考"
apps/web/src/features/planner/components/planner-page.tsx:1115:              <input className="field-input" value={referenceDraft.title} onChange={(event) => setReferenceDraft({ ...referenceDraft, title: event.target.value })} />
apps/web/src/features/planner/components/planner-page.tsx:1137:        title="编辑分镜草稿"
apps/web/src/features/planner/components/planner-page.tsx:1154:              <input className="field-input" value={storyboardDraft.title} onChange={(event) => setStoryboardDraft({ ...storyboardDraft, title: event.target.value })} />
apps/web/src/features/planner/components/planner-page.tsx:1174:        title="删除分镜草稿"
apps/web/src/features/planner/components/planner-page.tsx:1193:        title="删除主体参考"
apps/web/src/features/planner/components/planner-page.tsx:1208:      <Dialog open={booting} title="正在进入分片生成" description="按照 Seko 式 boot 节奏推进工作区切换。" onClose={() => undefined}>


===== OUTPUT SPLIT =====

Chunk ID: 9aa15a
Wall time: 0.0515 seconds
Process exited with code 0
Original token count: 396
Output:
apps/web/src/lib/mock-studio-service.ts:8:export async function fetchExploreStudio(): Promise<StudioFixture> {
apps/web/src/lib/mock-studio-service.ts:13:export async function fetchStudioProject(projectId: string): Promise<StudioFixture | null> {
apps/web/src/lib/mock-studio-service.ts:18:export async function fetchStudioScenario(scenarioId: MockStudioScenarioId): Promise<StudioFixture> {
apps/web/src/lib/mock-studio-service.ts:23:export async function fetchContinueProjects() {
apps/web/src/app/explore/page.tsx:2:import { fetchExploreStudio } from '@/lib/mock-studio-service';
apps/web/src/app/explore/page.tsx:5:  const studio = await fetchExploreStudio();
apps/web/src/app/projects/[projectId]/page.tsx:4:import { fetchStudioProject } from '@/lib/mock-studio-service';
apps/web/src/app/projects/[projectId]/page.tsx:12:  const studio = await fetchStudioProject(projectId);
apps/web/src/app/projects/[projectId]/planner/page.tsx:4:import { fetchStudioProject } from '@/lib/mock-studio-service';
apps/web/src/app/projects/[projectId]/planner/page.tsx:12:  const studio = await fetchStudioProject(projectId);
apps/web/src/app/projects/[projectId]/publish/page.tsx:4:import { fetchStudioProject } from '@/lib/mock-studio-service';
apps/web/src/app/projects/[projectId]/publish/page.tsx:12:  const studio = await fetchStudioProject(projectId);
apps/web/src/app/projects/[projectId]/creation/page.tsx:4:import { fetchStudioProject } from '@/lib/mock-studio-service';
apps/web/src/app/projects/[projectId]/creation/page.tsx:16:  const studio = await fetchStudioProject(projectId);


===== OUTPUT SPLIT =====

Chunk ID: d140b7
Wall time: 0.0520 seconds
Process exited with code 0
Original token count: 4394
Output:
     647 docs/specs/mvp-domain-model-spec-v0.1.md
     949 docs/specs/backend-data-api-spec-v0.1.md
     490 docs/specs/state-machine-and-error-code-spec-v0.1.md
     372 docs/web/web-route-and-page-spec-v0.1.md
     593 docs/index/master-index-v0.1.md
    3051 total
# MVP 领域模型规格

版本：v0.1  
状态：实现规格  
适用范围：MVP
关联文档：
- `docs/specs/seko-baseline-gap-analysis-v0.1.md`
- `docs/specs/backend-data-api-spec-v0.1.md`
- `docs/specs/mvp-command-query-event-spec-v0.1.md`
- `docs/specs/state-machine-and-error-code-spec-v0.1.md`
- `docs/architecture/system-architecture-role-spec-v0.1.md`

## 1. 文档目标

本文档用于把 MVP 的正式业务对象定义到可直接编码的粒度，统一：

- 数据库 schema
- 后端 service / DTO
- Web Studio 状态查询结构
- OpenClaw 调用边界

本次版本已经按本地 Seko 原型完成基线校准，不再沿用“单项目 / 单剧集优先”的旧假设。

## 2. 建模原则

### 2.1 产品对象优先于抽象对象

编码时优先围绕以下产品原生对象建模：

- `Project`
- `Episode`
- `PlannerSession`
- `PlannerReference`
- `StoryboardDraft`
- `Shot`
- `ShotVersion`
- `ShotMaterialBinding`
- `PublishDraft`
- `PublishRecord`

`PipelineNode` 与 `Run` 继续保留，但它们属于编排与执行层对象，不取代产品工作区对象。

### 2.2 多剧集是正式能力，不是未来增强

- `single` 只是 `Episode` 数量为 1 的特例。
- `series` 代表 `Project` 下存在多个可排序、可复制、可删除的 `Episode`。

### 2.3 内容模式和执行模式必须拆分

正式模型中必须同时存在：

- `contentMode = single | series`
- `executionMode = auto | review_required`

### 2.4 Planner 和 Creation 的可编辑结果都要持久化

以下对象不能视为临时 UI 状态：

- Planner step
- Planner message
- Planner reference
- Storyboard draft
- Shot 当前参数
- Shot 版本
- Shot 素材栈
- Publish draft

### 2.5 二进制文件与业务关系分离

- 文件本体统一为 `Asset`
- 谁在使用该文件，由上层业务对象关系表达
- 不把业务状态直接塞进 `Asset`

## 3. 规范化对象清单

MVP 正式业务对象如下：

- `Project`
- `Episode`
- `StyleTemplate`
- `PlannerSession`
- `PlannerStep`
- `PlannerMessage`
- `PlannerReference`
- `StoryboardDraft`
- `PipelineNode`
- `Run`
- `Shot`
- `ShotVersion`
- `ShotMaterialBinding`
- `Asset`
- `ReviewRecord`
- `PublishDraft`
- `PublishRecord`
- `EventLog`

## 4. 领域对象定义

### 4.1 Project

用途：项目主对象，代表一条完整的漫剧 / 视频生产链路。

建议字段：

- `id`
- `title`
- `brief`
- `contentMode`
- `executionMode`
- `aspectRatio`
- `globalStyleTemplateId`
- `status`
- `currentEpisodeId`
- `currentNodeId`
- `coverAssetId`
- `audioWorkspaceSnapshot`
- `lipsyncWorkspaceSnapshot`
- `createdById`
- `createdAt`
- `updatedAt`
- `archivedAt`

关键说明：

- `brief` 保存项目级需求摘要，不等于聊天原文全量日志。
- `audioWorkspaceSnapshot` 用于第一阶段承载配音 / 音乐工作区的持久草稿。
- `lipsyncWorkspaceSnapshot` 用于第一阶段承载对口型工作区的持久草稿。
- `currentEpisodeId` 用于页面默认落点。
- `currentNodeId` 用于编排层状态汇总，不作为产品主主键使用。

### 4.2 Episode

用途：项目中的剧集单元；单片模式下仍然保留一条 Episode。

建议字段：

- `id`
- `projectId`
- `sequence`
- `title`
- `summary`
- `styleTemplateId`
- `status`
- `exportedAt`
- `publishedAt`
- `createdAt`
- `updatedAt`
- `archivedAt`

关键说明：

- `sequence` 用于支持剧集排序。
- `status` 代表当前集的生产状态，不取代 Shot 状态。
- 删除 Episode 时必须遵守“单片 / 至少保留一集”的产品规则，由应用层控制。

### 4.3 StyleTemplate

用途：风格中心中的正式模板对象。

建议字段：

- `id`
- `name`
- `category`
- `tone`
- `provider`
- `isSystemPreset`
- `createdAt`
- `updatedAt`

关键说明：

- 生效优先级固定为：`Shot.styleTemplateId > Episode.styleTemplateId > Project.globalStyleTemplateId`。
- 第一阶段支持系统模板即可，不要求完整的用户自建模板系统。

### 4.4 PlannerSession

用途：Planner 页面的一次正式策划会话。

建议字段：

- `id`
- `projectId`
- `episodeId`
- `submittedRequirement`
- `status`
- `docProgressPercent`
- `storyboardProgressPercent`
- `allowGenerate`
- `pointCost`
- `isActive`
- `startedAt`
- `finishedAt`
- `createdAt`
- `updatedAt`

关键说明：

- 每个 Episode 至少存在一个 active PlannerSession。
- “重置并更新文档”可以生成新的 PlannerSession，旧会话保留为历史。
- `allowGenerate` 是进入 Creation 前的正式门禁条件。

### 4.5 PlannerStep

用途：Planner 左侧多 Agent 时间线中的单步执行项。

建议字段：

- `id`
- `plannerSessionId`
- `sortOrder`
- `title`
- `status`
- `startedAt`
- `finishedAt`
- `createdAt`
- `updatedAt`

关键说明：

- 状态固定为 `waiting | running | done`。
- 该对象用于 Planner 的可视化进度，不应被简化成纯日志文本。

### 4.6 PlannerMessage

用途：Planner 左侧消息区中的正式消息。

建议字段：

- `id`
- `plannerSessionId`
- `role`
- `content`
- `createdAt`
- `updatedAt`

关键说明：

- `role` 至少支持 `user | assistant | system`。
- 这些消息是“策划过程”的一部分，不建议只放在 EventLog 中。

### 4.7 PlannerReference

用途：Planner 中主体参考图卡片。

建议字段：

- `id`
- `plannerSessionId`
- `sortOrder`
- `title`
- `prompt`
- `modelId`
- `variantIndex`
- `previewAssetId`
- `createdAt`
- `updatedAt`
- `deletedAt`

关键说明：
---
# 后端数据与 API 规格

版本：v0.1  
状态：实现规格  
适用范围：MVP
关联文档：
- `docs/specs/seko-baseline-gap-analysis-v0.1.md`
- `docs/specs/mvp-domain-model-spec-v0.1.md`
- `docs/specs/mvp-command-query-event-spec-v0.1.md`
- `docs/specs/state-machine-and-error-code-spec-v0.1.md`
- `docs/web/web-route-and-page-spec-v0.1.md`

## 1. 文档目标

本文档定义 MVP 阶段推荐采用的：

- 数据落表边界
- Web Studio 需要的查询接口
- Web / OpenClaw 共用的写操作入口
- 实时事件回推结构

本版已经按 Seko Explore -> Planner -> Creation -> Publish 主流程对齐。

## 2. API 设计原则

### 2.1 产品工作区优先

接口按真实工作区组织，而不是先暴露纯后台式节点接口：

- Project / Episode
- Planner
- Creation / Shot
- Publish
- Workspace 查询

### 2.2 命令与查询分离

- 写操作一律按 command 设计。
- 读操作按工作区聚合查询设计。
- Realtime 事件只做增量推送，不替代首屏查询。

### 2.3 页面首屏必须一次取够

进入 Explore / Planner / Creation / Publish 时，必须通过聚合接口拿到首屏所需核心数据，避免前端自行拼装过多接口。

## 3. 推荐数据分层

### 3.1 正式表

推荐正式持久化表：

- `projects`
- `episodes`
- `style_templates`
- `planner_sessions`
- `planner_steps`
- `planner_messages`
- `planner_references`
- `storyboard_drafts`
- `pipeline_nodes`
- `runs`
- `shots`
- `shot_versions`
- `shot_material_bindings`
- `assets`
- `review_records`
- `publish_drafts`
- `publish_records`
- `event_logs`

### 3.2 可先放 JSON 的扩展状态

为了先落 MVP，可暂以 JSON 方式存放：

- `Project.audioWorkspaceSnapshot`
- `Project.lipsyncWorkspaceSnapshot`
- `Run.inputPayload`
- `Run.outputPayload`
- `Asset.metadata`
- `PublishRecord.receiptPayload`

## 4. 核心查询接口

### 4.1 Explore 首页首屏

#### `GET /api/explore/home`

用途：渲染 `/explore` 首页（侧边栏、Hero 输入、工具浮层、灵感广场瀑布流）。

查询参数建议：

- `tab`：`短剧漫剧 | 音乐MV | 知识分享`
- `cursor`：灵感流分页游标（可选）
- `limit`：灵感流每页数量（可选）

必须返回：

- `viewer`：会员信息、头像、消息红点、可用积分
- `activeProject`：当前默认承接项目（用于“发布作品”与“发送灵感”跳转）
- `composer`：模式、占位文案、工具配置、默认选项
- `modelOptions`：主体图模型列表、画风列表、角色列表
- `presetTemplates`：各模式预设模板卡
- `inspirationFeed`：瀑布流卡片（含广告卡、作品卡、点赞计数）

说明：

- `/explore` 首屏要求单接口可渲染，避免前端多接口拼装。
- `activeProject` 不存在时，后续提交流程由命令接口自动创建项目。

### 4.2 项目列表

#### `GET /api/projects`

用途：Explore 中“继续创作”与项目列表检索。

查询参数建议：

- `keyword`
- `status`
- `contentMode`
- `updatedAfter`
- `cursor`
- `limit`

返回字段建议：

- `id`
- `title`
- `contentMode`
- `aspectRatio`
- `status`
- `coverUrl`
- `episodeCount`
- `currentEpisodeId`
- `updatedAt`

### 4.3 项目工作区总览

#### `GET /api/projects/:projectId/workspace`

用途：统一拉取当前项目在 Web Studio 的主要工作区摘要。

查询参数建议：

- `episodeId` 可选

必须返回：

- `project`
- `episodes`
- `currentEpisode`
- `plannerSummary`
- `creationSummary`
- `publishSummary`
- `historyWorks`
- `workspaceQuota`

说明：

- 这是 Web 首屏与 OpenClaw 状态解释的主查询。
- `historyWorks` 由已导出 / 已发布项目聚合而来。

### 4.4 Planner 页面首屏

#### `GET /api/projects/:projectId/planner`

查询参数建议：

- `episodeId`

必须返回：

- `project`
- `episodes`
- `currentEpisode`
- `plannerSession`
- `steps`
- `messages`
- `references`
- `storyboards`
- `styleContext`
- `pointCost`
- `workspaceQuota`

### 4.5 Creation 页面首屏

#### `GET /api/projects/:projectId/creation`

查询参数建议：

- `episodeId`

必须返回：

- `project`
- `episodes`
- `currentEpisode`
- `shots`
- `selectedShotId`
- `versionRail`
- `audioWorkspace`
- `lipsyncWorkspace`
- `batchSummary`
- `workspaceQuota`

### 4.6 Publish 页面首屏

#### `GET /api/projects/:projectId/publish`

查询参数建议：

- `episodeId`

必须返回：

- `project`
- `currentEpisode`
- `publishDraft`
- `publishRecords`
- `historyWorks`
- `finalVideo`

### 4.7 Shot 详情

#### `GET /api/projects/:projectId/shots/:shotId`

必须返回：

- `shot`
- `versions`
- `materials`
- `lastRun`
- `eventLogs`

### 4.8 运行历史

#### `GET /api/projects/:projectId/runs`

查询参数建议：

- `episodeId`
- `shotId`
- `runType`
- `status`
- `cursor`
- `limit`

### 4.9 Explore 资源字典（可缓存）

#### `GET /api/explore/dictionaries`

用途：提供低频变化字典，降低 `GET /api/explore/home` 体积与刷新压力。

建议返回：

- `composerTabs`
- `imageModels`
- `styleModels`
- `characterLibrary`
- `presetTemplateLibrary`

## 5. Project / Episode 命令接口

### 5.0 Explore 首页命令补充

### 5.0.1 提交灵感并进入策划

#### `POST /api/explore/compose/submit`

建议载荷：

```ts
interface ExploreComposeSubmitPayload {
  prompt: string
  tab: '短剧漫剧' | '音乐MV' | '知识分享'
  modelOptionId?: string
  imageModelId?: string
  characterIds?: string[]
  multiEpisode?: boolean
  attachmentAssetId?: string
}
```

返回：

- `projectId`
- `episodeId`
- `plannerSessionId`
- `redirectUrl`（`/projects/:projectId/planner?prompt=...`）

业务规则：

- `prompt` 为空直接返回 `400`。
- 如果调用方无 `activeProject`，由后端创建新 project + default episode。
- 将 Explore 输入参数写入 Planner 初始上下文，用于后续策划提示增强。

### 5.0.2 Explore 附件上传（可选）

#### `POST /api/explore/assets`

建议载荷：

- `multipart/form-data`
- `file`
- `kind`：`script | music`

返回：

- `assetId`
- `filename`
- `size`

说明：

- 对于大文件，也可改为“先拿签名 URL，再直传对象存储”。
- 上传完成后由前端触发 toast（`已准备上传: xxx`）。

### 5.1 创建项目

#### `POST /api/projects`
---
# 状态机与错误码规范

版本：v0.1  
状态：实现规格  
适用范围：MVP
关联文档：
- `docs/specs/seko-baseline-gap-analysis-v0.1.md`
- `docs/specs/mvp-domain-model-spec-v0.1.md`
- `docs/specs/backend-data-api-spec-v0.1.md`
- `docs/specs/mvp-command-query-event-spec-v0.1.md`
- `docs/openclaw/openclaw-integration-spec-v0.1.md`

## 1. 文档目标

本文档用于统一 MVP 阶段的：

- 项目、剧集、Planner、Shot、Version、Run、Publish 状态枚举
- 核心状态流转规则
- 高优先级错误码与前端 / OpenClaw 展示语义

本版已按 Seko Explore -> Planner -> Creation -> Publish 主流程校准。

## 2. 枚举清单

### 2.1 内容模式

```ts
export enum ProjectContentMode {
  SINGLE = 'single',
  SERIES = 'series'
}
```

### 2.2 执行模式

```ts
export enum ExecutionMode {
  AUTO = 'auto',
  REVIEW_REQUIRED = 'review_required'
}
```

### 2.3 项目状态

```ts
export enum ProjectStatus {
  DRAFT = 'draft',
  PLANNING = 'planning',
  READY_FOR_STORYBOARD = 'ready_for_storyboard',
  CREATING = 'creating',
  EXPORT_READY = 'export_ready',
  EXPORTED = 'exported',
  PUBLISHED = 'published',
  FAILED = 'failed',
  ARCHIVED = 'archived'
}
```

### 2.4 剧集状态

```ts
export enum EpisodeStatus {
  DRAFT = 'draft',
  PLANNING = 'planning',
  READY_FOR_STORYBOARD = 'ready_for_storyboard',
  CREATING = 'creating',
  EXPORT_READY = 'export_ready',
  EXPORTED = 'exported',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}
```

### 2.5 Planner 状态

```ts
export enum PlannerStatus {
  IDLE = 'idle',
  UPDATING = 'updating',
  READY = 'ready'
}
```

### 2.6 Planner Step 状态

```ts
export enum PlannerStepStatus {
  WAITING = 'waiting',
  RUNNING = 'running',
  DONE = 'done'
}
```

### 2.7 编排节点类型

```ts
export enum NodeType {
  PLANNER_DOC = 'planner_doc',
  STORYBOARD_GENERATION = 'storyboard_generation',
  SHOT_RENDER = 'shot_render',
  AUDIO_WORKSPACE = 'audio_workspace',
  EXPORT = 'export',
  PUBLISH = 'publish'
}
```

### 2.8 编排节点状态

```ts
export enum NodeStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  READY = 'ready',
  FAILED = 'failed',
  WAITING_INPUT = 'waiting_input'
}
```

### 2.9 Run 类型

```ts
export enum RunType {
  PLANNER_DOC_UPDATE = 'planner_doc_update',
  STORYBOARD_GENERATION = 'storyboard_generation',
  SHOT_RENDER = 'shot_render',
  MUSIC_GENERATION = 'music_generation',
  LIPSYNC_GENERATION = 'lipsync_generation',
  EXPORT = 'export',
  PUBLISH = 'publish'
}
```

### 2.10 Run 状态

```ts
export enum RunStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  TIMED_OUT = 'timed_out'
}
```

### 2.11 Shot 状态

```ts
export enum ShotStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  GENERATING = 'generating',
  SUCCESS = 'success',
  FAILED = 'failed'
}
```

### 2.12 ShotVersion 状态

```ts
export enum ShotVersionStatus {
  PENDING_APPLY = 'pending_apply',
  ACTIVE = 'active',
  ARCHIVED = 'archived'
}
```

### 2.13 素材来源

```ts
export enum ShotMaterialSource {
  UPLOAD = 'upload',
  HISTORY = 'history',
  LEGACY = 'legacy'
}
```

### 2.14 PublishDraft 状态

```ts
export enum PublishDraftStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FAILED = 'failed'
}
```

### 2.15 PublishRecord 状态

```ts
export enum PublishStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled'
}
```

### 2.16 Review 动作

```ts
export enum ReviewAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  EDIT_AND_CONTINUE = 'edit_and_continue',
  RETRY = 'retry',
  RESET = 'reset',
  APPLY_VERSION = 'apply_version'
}
```

## 3. 状态语义

### 3.1 PlannerStatus

- `idle`：尚未提交需求，或当前会话还未启动更新。
- `updating`：多 Agent 步骤执行中。
- `ready`：文档已收敛，允许生成分镜。

### 3.2 ShotStatus

- `pending`：镜头待生成，尚未提交任务。
- `queued`：已进入队列。
- `generating`：执行中。
- `success`：当前至少有一个可用版本。
- `failed`：最近一次生成失败，需要重试或重置。

### 3.3 ShotVersionStatus

- `pending_apply`：已生成，但尚未替换正式版本。
- `active`：当前正式生效版本。
- `archived`：历史版本。

### 3.4 PublishDraftStatus

- `draft`：正在编辑，尚未提交。
- `submitted`：已提交，等待平台回执 / 审核结果。
- `approved`：发布链路通过。
- `rejected`：审核拒绝。
- `failed`：提交或后续链路失败。

## 4. 核心状态机

### 4.1 项目主状态流

```text
DRAFT -> PLANNING
PLANNING -> READY_FOR_STORYBOARD
READY_FOR_STORYBOARD -> CREATING
CREATING -> EXPORT_READY
EXPORT_READY -> EXPORTED
EXPORTED -> PUBLISHED
PLANNING -> FAILED
CREATING -> FAILED
EXPORTED -> ARCHIVED
PUBLISHED -> ARCHIVED
```

说明：

- `DRAFT -> PLANNING`：创建项目并提交 Planner 需求。
- `PLANNING -> READY_FOR_STORYBOARD`：Planner ready。
- `READY_FOR_STORYBOARD -> CREATING`：生成分镜并进入 Creation。
- `CREATING -> EXPORT_READY`：当前 Episode 所有 Shot 达到可导出条件。
- `EXPORT_READY -> EXPORTED`：导出成功。
- `EXPORTED -> PUBLISHED`：发布成功。

### 4.2 Planner 状态流

```text
IDLE -> UPDATING
UPDATING -> READY
READY -> UPDATING
```

说明：



===== OUTPUT SPLIT =====

Plan updated

===== OUTPUT SPLIT =====

Chunk ID: c56e6e
Wall time: 0.0517 seconds
Process exited with code 0
Original token count: 266
Output:
docs/.DS_Store
docs/architecture/feasibility-and-tech-selection-v0.1.md
docs/architecture/n8n-adoption-decision-v0.1.md
docs/architecture/system-architecture-role-spec-v0.1.md
docs/index/master-index-v0.1.md
docs/openclaw/openclaw-contract-spec-v0.1.md
docs/openclaw/openclaw-integration-spec-v0.1.md
docs/openclaw/openclaw-protocol-schema-v0.1.md
docs/product/mvp-prd-v0.2.md
docs/product/mvp-roadmap-v0.1.md
docs/product/reference-compliance-boundary-v0.1.md
docs/specs/backend-data-api-spec-v0.1.md
docs/specs/mvp-command-query-event-spec-v0.1.md
docs/specs/mvp-domain-model-spec-v0.1.md
docs/specs/mvp-mock-data-and-fixtures-spec-v0.1.md
docs/specs/seko-baseline-gap-analysis-v0.1.md
docs/specs/state-machine-and-error-code-spec-v0.1.md
docs/web/brand-replacement-table-v0.1.md
docs/web/console-spec-v0.1.md
docs/web/copy-replacement-table-v0.1.md
docs/web/frontend-bootstrap-and-resource-plan-v0.1.md
docs/web/frontend-compliance-implementation-checklist-v0.1.md
docs/web/web-design-token-and-component-spec-v0.1.md
docs/web/web-route-and-page-spec-v0.1.md


===== OUTPUT SPLIT =====

Chunk ID: ce361c
Wall time: 0.0525 seconds
Process exited with code 0
Original token count: 0
Output:


===== OUTPUT SPLIT =====

Chunk ID: 40bc63
Wall time: 0.0535 seconds
Process exited with code 0
Original token count: 4092
Output:
docs/index/master-index-v0.2.md
docs/specs/backend-data-api-spec-v0.2.md
docs/specs/database-schema-spec-v0.2.md
docs/specs/frontend-domain-contract-spec-v0.2.md
docs/specs/internal-execution-api-spec-v0.2.md
docs/specs/state-machine-and-error-code-spec-v0.2.md
docs/web/web-route-and-page-spec-v0.2.md
---
