# 视频生成模型能力规格（v0.1）

版本：v0.1
日期：2026-03-16
状态：当前已知信息汇总，持续更新

## 1. 文档目的

本文档记录各主流 AI 视频生成模型的关键能力参数，供以下场景使用：

1. **Planner Agent 提示词生成**：按目标模型动态适配分镜提示词格式（多镜头叙事 vs 单镜头拆分）
2. **前端模型选择 UI**：展示各模型支持的能力以指导用户选型
3. **Creation 层 Run 创建**：校验当前选中模型是否支持所需生成类型
4. **`seed-model-registry.ts` 数据填充**：`capabilityJson` 字段的结构参考

---

## 2. 核心能力维度说明

### 2.1 多镜头叙事（supportsMultiShot）

指模型是否能在**单次生成**中，自动完成包含镜头切换（全景→中景→近景→特写等）的连贯叙事视频。

- 支持的模型：在提示词中使用景别词即可触发镜头切换，无需分次提交
- 不支持的模型：单次只能生成一个连续镜头，多镜头需后期剪辑拼接

### 2.2 时间码语义（timestampMeaning）

- `narrative-hint`：时间码是叙事节奏提示，模型会智能压缩/延展，不是硬约束（Seedance 2.0）
- `hard-constraint`：时间码为严格时间分段，超出即截断
- `ignored`：模型忽略时间码，仅理解文字描述

### 2.3 音效描述方式（audioDescStyle）

- `inline`：音效描述应融入叙事文本，如"脚步声轻快，伴随风吹草叶的沙沙声"
- `none`：模型不支持原生音频生成，音效描述无效，应从提示词中移除

### 2.4 参考图输入（referenceImageSupport）

- `none`：不支持参考图
- `style`：仅支持风格参考
- `character`：支持角色参考（锁定外貌/服装/五官），可跨镜头保持一致性
- `full`：支持角色 + 场景 + 风格全维度参考

### 2.5 运镜词汇风格（cameraVocab）

- `chinese`：模型对中文运镜词汇（推镜/拉镜/摇镜/移镜/环绕）理解较好
- `english-cinematic`：模型对英文电影术语（dolly/crane/depth-of-field/rack focus）理解较好
- `both`：中英文均可

---

## 3. 模型能力对比表

| 模型 | 发布方 | 多镜头叙事 | 最大时长 | 最高分辨率 | 原生音频 | 参考图输入 | 最多参考图数 | 整体定位 |
|---|---|---|---|---|---|---|---|---|
| **Seedance 2.0** | 字节跳动 | ✅✅ 自动多镜头序列 | 15s | 2K | ✅ 音画同步 | character+scene+audio | 图×9 + 视频×3 + 音频×3 | 当前全球第一梯队 |
| **Veo 3.1** | Google | ✅ Multi-Shot Storytelling | 60s | 4K | ✅ 原生音频 | character+style | 最多 3 张 | 影院级 / 最长时长 |
| **Seedance 1.0 Pro** | 字节跳动 | ✅ 2-3 镜头无缝切换 | ~10s | 1080p | ❌ | character | 支持 | Artificial Analysis 全球第一 |
| **Seedance 1.5** | 字节跳动 | ✅（用户确认）效果差 | - | - | ❌ | character | 支持 | 过渡版本，整体国产垫底 |
| **Kling 3.0** | 快手 | ✅ AI Director 模式 | 2分钟 | 4K | ✅ 视听同步 | character | 支持 | 最强长视频 / 手部渲染最佳 |
| **Sora 2** | OpenAI | ✅ Extensions 分镜功能 | 20s | 1080p | ✅ | character（Cameo） | 有限 | 物理模拟最佳 |
| **Wan 2.6** | 阿里巴巴 | ⚠️ 未明确 | - | - | ❌ | style | 支持 | 开源最强 / 可自部署 |
| **Runway Gen-4.5** | Runway | ⚠️ 未明确 | - | - | ❌ | style | 支持 | 专业创意控制 |
| **Pika 2.x** | Pika Labs | ❌ 单镜头为主 | 5s | 1080p | ❌ | style | 支持 | 社交媒体快速内容 |

---

## 4. 模型能力结构化档案

以下为各模型的结构化能力字段，对应 `model_families.capabilityJson` 中 `videoCapability` 子字段的目标格式。

### Seedance 2.0

```json
{
  "supportsMultiShot": true,
  "maxShotsPerGeneration": 6,
  "timestampMeaning": "narrative-hint",
  "audioDescStyle": "inline",
  "referenceImageSupport": "full",
  "maxReferenceImages": 9,
  "maxReferenceVideos": 3,
  "maxReferenceAudios": 3,
  "cameraVocab": "chinese",
  "maxDurationSeconds": 15,
  "maxResolution": "2K",
  "promptStyle": "narrative"
}
```

### Veo 3.1

```json
{
  "supportsMultiShot": true,
  "maxShotsPerGeneration": 4,
  "timestampMeaning": "narrative-hint",
  "audioDescStyle": "inline",
  "referenceImageSupport": "character",
  "maxReferenceImages": 3,
  "maxReferenceVideos": 0,
  "maxReferenceAudios": 0,
  "cameraVocab": "english-cinematic",
  "maxDurationSeconds": 60,
  "maxResolution": "4K",
  "promptStyle": "narrative"
}
```

### Seedance 1.0 Pro

```json
{
  "supportsMultiShot": true,
  "maxShotsPerGeneration": 3,
  "timestampMeaning": "narrative-hint",
  "audioDescStyle": "none",
  "referenceImageSupport": "character",
  "maxReferenceImages": 1,
  "maxReferenceVideos": 0,
  "maxReferenceAudios": 0,
  "cameraVocab": "chinese",
  "maxDurationSeconds": 10,
  "maxResolution": "1080p",
  "promptStyle": "narrative"
}
```

### Seedance 1.5

```json
{
  "supportsMultiShot": true,
  "maxShotsPerGeneration": 2,
  "timestampMeaning": "narrative-hint",
  "audioDescStyle": "none",
  "referenceImageSupport": "character",
  "maxReferenceImages": 1,
  "maxReferenceVideos": 0,
  "maxReferenceAudios": 0,
  "cameraVocab": "chinese",
  "maxDurationSeconds": 8,
  "maxResolution": "1080p",
  "promptStyle": "narrative",
  "qualityNote": "过渡版本，整体质量差，不推荐用于多镜头场景"
}
```

### Kling 3.0

```json
{
  "supportsMultiShot": true,
  "maxShotsPerGeneration": 8,
  "timestampMeaning": "narrative-hint",
  "audioDescStyle": "inline",
  "referenceImageSupport": "character",
  "maxReferenceImages": 3,
  "maxReferenceVideos": 0,
  "maxReferenceAudios": 0,
  "cameraVocab": "both",
  "maxDurationSeconds": 120,
  "maxResolution": "4K",
  "promptStyle": "narrative"
}
```

### Sora 2

```json
{
  "supportsMultiShot": true,
  "maxShotsPerGeneration": 4,
  "timestampMeaning": "narrative-hint",
  "audioDescStyle": "inline",
  "referenceImageSupport": "character",
  "maxReferenceImages": 2,
  "maxReferenceVideos": 0,
  "maxReferenceAudios": 0,
  "cameraVocab": "english-cinematic",
  "maxDurationSeconds": 20,
  "maxResolution": "1080p",
  "promptStyle": "narrative",
  "knownIssues": ["background blur in multi-shot mode"]
}
```

### Wan 2.6

```json
{
  "supportsMultiShot": false,
  "maxShotsPerGeneration": 1,
  "timestampMeaning": "ignored",
  "audioDescStyle": "none",
  "referenceImageSupport": "style",
  "maxReferenceImages": 1,
  "maxReferenceVideos": 0,
  "maxReferenceAudios": 0,
  "cameraVocab": "chinese",
  "maxDurationSeconds": null,
  "maxResolution": null,
  "promptStyle": "single-shot",
  "openSource": true
}
```

### Pika 2.x

```json
{
  "supportsMultiShot": false,
  "maxShotsPerGeneration": 1,
  "timestampMeaning": "ignored",
  "audioDescStyle": "none",
  "referenceImageSupport": "style",
  "maxReferenceImages": 1,
  "maxReferenceVideos": 0,
  "maxReferenceAudios": 0,
  "cameraVocab": "english-cinematic",
  "maxDurationSeconds": 5,
  "maxResolution": "1080p",
  "promptStyle": "single-shot"
}
```

---

## 5. 分镜提示词生成规则

### 5.1 多镜头叙事模型（supportsMultiShot: true）

适用：Seedance 2.0 / Veo 3.1 / Seedance 1.0 Pro / Kling 3.0 / Sora 2

提示词原则：

1. 多个 shot 合并为单次生成描述，用景别词自然分段（无需硬分行）
2. 单个 shot 也可以在一条提示词内表达多次镜头切换，不要求先拆成多个 shot
2. 时间戳作为节奏提示，不作为硬约束
3. 使用景别词触发镜头切换：`全景`、`中景`、`近景`、`特写`、`大特写`
4. 运镜词（中文模型）：`推镜`、`拉镜`、`摇镜`、`移镜`、`环绕`、`跟拍`
5. 运镜词（英文模型）：`dolly in/out`、`pan`、`tilt`、`crane shot`、`rack focus`
6. 音效融入叙事文本（`audioDescStyle: inline`），不单独标注

当前重构口径补充：

1. `supportsMultiShot: true` 表示模型支持“单次生成内的多镜头叙事”
2. 这种能力既可以来源于“多个相邻 shot 合并”，也可以来源于“单个 shot 内部的多镜头提示词编排”
3. 当前 Phase 4 先通过提示词层支持，不要求先引入 `subShot` / `shotSegments` 数据结构

示例（Seedance 2.0）：

```
全景，马良背着柴草走在乡间小路上，脚步声轻快，伴随风吹草叶的沙沙声。
推镜至近景，马良抬起手，手指在空中流畅地画出线条，动作轻盈而自然。
切至特写，马良面露失落，眼神落在空旷的地面上，环境音渐弱。
```

### 5.2 单镜头模型（supportsMultiShot: false）

适用：Wan 2.6 / Runway Gen-4.5 / Pika 2.x

提示词原则：

1. 每个 shot 独立输出为一条提示词，不合并
2. 移除所有时间码
3. 移除音效描述
4. 单次只描述一个动作或场景状态
5. 保持简洁，避免多动作并列

示例（Wan 2.6，shot 1）：

```
一个身着古代粗布衣裳的少年背着一捆柴草，走在乡间小路上，画面静谧，光线柔和。
```

### 5.3 音效描述规则

| audioDescStyle | 处理方式 |
|---|---|
| `inline` | 将音效描述自然融入场景文本，避免单独标注 `[音效: xxx]` |
| `none` | 移除所有音效相关描述，不输出音效字段 |

---

## 6. 已知信息局限与更新机制

1. 部分模型参数（`maxShotsPerGeneration`、Seedance 1.5 详细参数）为估算值，待实测后更新
2. 模型版本迭代频繁，本文档应在引入新模型时同步更新
3. 结构化 JSON 字段最终以 `seed-model-registry.ts` 写入数据库为准，本文档为其设计参考
4. 多镜头能力边界（最多几个镜头、最长时长内实际可行镜头数）需通过实测积累
