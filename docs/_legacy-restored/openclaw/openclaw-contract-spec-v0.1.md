# OpenClaw 契约规格

版本：v0.1  
状态：实现规格  
适用范围：MVP
关联文档：
- `docs/architecture/system-architecture-role-spec-v0.1.md`
- `docs/specs/mvp-command-query-event-spec-v0.1.md`
- `docs/architecture/n8n-adoption-decision-v0.1.md`

## 1. 文档目标

本文档用于定义：

- OpenClaw 在 MVP 中暴露哪些能力
- OpenClaw 允许调用哪些工具
- 哪些工具只读，哪些可写
- 哪些写操作需要审批
- OpenClaw 应该返回什么结构化结果
- OpenClaw 消息如何深链回 Web

## 2. OpenClaw 定位

MVP 中，OpenClaw 是：

- 自然语言入口
- 通知入口
- 轻量审批入口
- 轻量批处理入口

OpenClaw 不是：

- 业务真相层
- 版本生效真相层
- 主调度器
- Web 的替代品

## 3. 用户可见角色

建议只暴露 1 个主入口，最多 3 个角色：

- `总控助手`：默认入口，负责意图理解和工具路由
- `制作助手`：镜头、模型、素材、重试、替换
- `发布助手`：导出、发布、回执说明

MVP 编码建议：

- 前台先只落 `总控助手`
- 其余角色作为内部路由标签实现，不先做多 persona UI

## 4. 工具分级

### 4.1 只读工具

- `get_project_status`
- `get_project_dashboard`
- `get_node_detail`
- `get_shot_versions`
- `get_publish_status`
- `list_pending_reviews`

特点：

- 不改变正式状态
- 默认不需要审批

### 4.2 可写工具

- `create_project`
- `approve_node`
- `retry_node`
- `rollback_node`
- `retry_shot`
- `batch_generate_shots`
- `prepare_publish`

特点：

- 会触发正式命令
- 必须进入后端审计链路

### 4.3 高风险工具

- `activate_shot_version`
- `submit_publish`
- `bulk_retry_failed_shots`
- `rollback_project_stage`

特点：

- 影响正式版本或发布结果
- 默认需要审批或强确认

## 5. 工具契约

### 5.1 `get_project_status`

用途：返回项目摘要、当前节点、推荐动作。

请求：

```json
{
  "projectId": "proj_001"
}
```

响应：

```json
{
  "projectId": "proj_001",
  "title": "废墟回响",
  "status": "awaiting_review",
  "currentNode": {
    "nodeId": "node_03",
    "name": "分镜生成",
    "status": "awaiting_review"
  },
  "recommendedActions": ["open_web", "approve_node", "get_node_detail"],
  "deepLink": "/projects/proj_001"
}
```

### 5.2 `approve_node`

用途：审核通过当前节点。

请求：

```json
{
  "nodeId": "node_03",
  "comment": "结构可以，继续"
}
```

响应：

```json
{
  "accepted": true,
  "commandType": "ApproveNode",
  "projectId": "proj_001",
  "nodeId": "node_03",
  "deepLink": "/projects/proj_001"
}
```

### 5.3 `retry_shot`

用途：重试单镜头。

请求：

```json
{
  "shotId": "shot_012",
  "comment": "保持人物一致，重试一次"
}
```

### 5.4 `activate_shot_version`

用途：将某个镜头版本设为正式版本。

请求：

```json
{
  "shotId": "shot_012",
  "versionId": "sv_012_03"
}
```

审批要求：

- 默认启用确认
- 若由消息卡片直接触发，需明确展示即将替换的镜头编号和版本号

### 5.5 `open_web_context`

用途：生成深链，帮助用户回到正确的 Web 上下文。

请求：

```json
{
  "projectId": "proj_001",
  "nodeId": "node_05",
  "shotId": "shot_012",
  "panel": "versions"
}
```

响应：

```json
{
  "deepLink": "/projects/proj_001?node=node_05&shot=shot_012&panel=versions"
}
```

## 6. 审批规则

建议规则：

- 只读工具：无需审批
- 普通可写工具：OpenClaw 内部确认即可
- 高风险工具：显式审批

高风险审批至少显示：

- 项目名
- 动作名
- 影响对象
- 影响范围
- 深链入口

## 7. 消息卡片规范
