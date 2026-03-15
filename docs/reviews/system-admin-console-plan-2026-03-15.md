# 系统管理后台规划（2026-03-15）

状态：规划稿
目标：把系统级功能从用户侧页面中抽离，形成独立的系统管理后台入口。

## 1. 规划背景

当前系统中已经存在多类能力，但它们混杂在不同层级页面中：

1. 用户级页面
   - `/explore`
   - `/my-space`
   - `/projects/:projectId/*`
   - `/settings/providers`
2. 系统/内部页面
   - `/internal/planner-agents`
   - `/internal/planner-debug/*`
3. 混合页
   - `/settings/catalogs`

问题在于：

1. 系统级配置和用户级配置没有彻底分层。
2. `planner agent` 调试、发布、回放是系统能力，不应长期挂在用户路径心智下。
3. `catalogs` 当前同时承担“公共目录管理”和“个人添加”两类职责，边界模糊。
4. 用户级 API Key 配置与系统级模型目录/调试治理属于两套完全不同的权限域。

## 2. 基本原则

### 2.1 系统级功能

系统级功能满足以下任一特征：

1. 会影响全体用户或全局运行时行为。
2. 影响默认策略、默认目录、默认 agent、模型可见性或发布版本。
3. 需要更高权限或运营/算法/平台角色管理。
4. 更适合做审计、回放、发布和治理，而不是个人偏好配置。

### 2.2 用户级功能

用户级功能满足以下特征：

1. 只影响当前登录用户自己的体验或调用。
2. 不改变全局真相源，只改自己账户下的配置与私有内容。
3. 不直接影响其他用户的默认配置。

## 3. 明确边界结论

### 3.1 必须保留在用户侧的

#### `API Key / Provider Config`

路径：`/settings/providers`

原因：

1. 这是典型的用户级凭证配置。
2. 当前代码就是 `user_provider_configs` 模型，语义上属于个人账户。
3. 不应迁入系统后台，否则会把个人密钥和系统配置混在一起。

结论：`不迁移`。

---

### 3.2 应迁入系统管理后台的

#### A. Planner Agent 管理与调试

当前路径：

1. `/internal/planner-agents`
2. `/internal/planner-debug`
3. `/internal/planner-debug/[subAgentSlug]`
4. `/internal/planner-debug/compare`
5. `/internal/planner-debug/runs`
6. `/internal/planner-debug/runs/[runId]`

原因：

1. `AgentProfile / SubAgentProfile` 是全局运行时真相源。
2. 保存、发布、回放、A/B、release snapshot 都是系统治理能力。
3. 这些操作不属于单个用户的个人偏好，而是平台级策略调整。

结论：`必须迁入系统后台`。

---

#### B. 公共主体库 / 公共画风库管理

当前路径：`/settings/catalogs`

原因：

1. 当前页面同时管理 `public` 与 `personal` 目录项。
2. 其中 `public` 目录项会影响首页和全局项目入口，是系统级资产。
3. 个人添加的主体/画风不应该和公共目录治理混在同一个后台里。

结论：

1. `public` 主体/画风管理 -> `迁入系统后台`
2. `personal` 主体/画风 -> `保留用户侧`，后续可迁到独立“我的主体/我的画风”页面

---

#### C. 模型目录 / 端点治理

当前代码能力：

1. `/api/model-endpoints`
2. 后端存在 `model_families / model_providers / model_endpoints`
3. 用户页可配置 provider，但没有真正的系统级模型目录后台

原因：

1. 模型目录属于全局基础设施。
2. 哪些 family / endpoint 可见、启用、默认，影响的是整个平台。
3. 这和用户自己的 API Key 是不同层级。

结论：`应纳入系统后台`。

---

#### D. Explore 公共目录运营能力

当前代码能力：

1. `/api/explore/subjects`
2. `/api/explore/styles`
3. 首页 `/explore` 直接消费这些目录

原因：

1. 首页内容入口直接依赖公共主体与画风。
2. 公共目录的启用、停用、排序、标签治理属于系统运营层。

结论：`应纳入系统后台`。

---

### 3.3 暂不迁移，但未来可评估的

#### A. 个人主体/画风管理

原因：

1. 这是用户个人资产。
2. 不适合放进系统后台，否则权限边界会混乱。

建议：

- 未来放入用户侧“我的资产 / 我的主体 / 我的画风”路径下。

#### B. 项目级 Planner / Creation / Publish 工作区

原因：

1. 这是用户创作工作区，不是系统治理台。
2. 即使系统后台能查看审计，也不应该承载用户实际创作入口。

结论：`不迁移`。

## 4. 系统后台建议信息架构

建议新建独立入口：`/admin`

### 4.1 一级导航

1. `Agent 管理`
2. `目录管理`
3. `模型目录`
4. `运行审计`

### 4.2 二级结构

#### `Agent 管理`

建议路由：

1. `/admin/planner-agents`
2. `/admin/planner-agents/[subAgentSlug]`
3. `/admin/planner-debug`
4. `/admin/planner-debug/[subAgentSlug]`
5. `/admin/planner-debug/compare`
6. `/admin/planner-debug/runs`
7. `/admin/planner-debug/runs/[runId]`

职责：

1. Agent 配置编辑
2. 发布快照
3. release 对比
4. debug run
5. replay
6. A/B 对比
7. 运行历史审计

---

#### `目录管理`

建议路由：

1. `/admin/catalogs/subjects`
2. `/admin/catalogs/styles`

职责：

1. 管理 `public` 主体库
2. 管理 `public` 画风库
3. 排序、启用/停用、标签、推荐策略
4. 审查与发布公共目录项

注意：

- 个人目录项不要进这里。

---

#### `模型目录`

建议路由：

1. `/admin/models`
2. `/admin/models/providers`
3. `/admin/models/endpoints`

职责：

1. 查看系统模型 family / provider / endpoint
2. 控制 endpoint 启用状态
3. 配置默认 endpoint
4. 目录同步与治理

说明：

- 这里管理的是系统模型目录，不是用户 API Key。

---

#### `运行审计`

建议路由：

1. `/admin/runs/planner`
2. `/admin/runs/generation`

职责：

1. 查看全局 run 历史
2. 按 runType / status / provider / project 过滤
3. 排查失败、耗时、provider 状态异常

说明：

- 第一阶段可以先只做 planner debug runs 的增强版审计。

## 5. 独立入口方案

建议独立入口使用：

- `/admin`

首页入口建议：

1. 不放在普通用户主导航中。
2. 可以只对高权限账号显示一个 `系统管理` 入口。
3. 第一阶段即使没有角色系统，也至少不要把它藏在 `/settings/providers` 这种用户设置路径下。

建议过渡方案：

1. 先新增 `/admin`
2. 先把 `planner agent/debug` 和 `public catalogs` 迁进去
3. 等模型目录页准备好后再补 `models`

## 6. 迁移优先级

### P0：立即迁移

1. `Planner Agent 管理 / 调试`
2. `公共主体库 / 公共画风库`

### P1：尽快补后台页

1. `模型目录 / endpoint 治理`
2. `planner debug runs 审计页` 的 admin 视角

### P2：后续拆分用户侧能力

1. 把 `/settings/catalogs` 中的 `personal` 目录项迁到用户自己的资产页
2. 用户侧保留“我的主体 / 我的画风”能力

## 7. 最终结论

当前最合理的系统后台边界是：

### 放入系统后台

1. Planner Agent 管理与调试
2. 公共主体库
3. 公共画风库
4. 模型目录治理
5. 运行审计（至少 planner 相关）

### 不放入系统后台

1. 用户 API Key / Provider Config
2. 用户项目工作区
3. 用户个人主体 / 个人画风（未来独立拆分）

### 独立入口

- `建议统一使用 /admin`

