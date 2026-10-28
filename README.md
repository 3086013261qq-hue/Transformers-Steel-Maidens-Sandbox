# 变形钢姬 / Transformers: Steel Maidens

基于「咩咩制卡·全栈 v1.0.0」组织的《变形金刚》真人电影 Bayverse 同人世界角色卡 / 世界书工程。

## 分支策略

- `main`：唯一正式基线分支。
- 不设长期业务分支；设定、时间线、角色、地点、MVU、运行时、构建与 QA 通过目录分层与原子提交管理。

## 原作时间线基线

- 主骨架：Bayverse 真人电影五部曲。
- 《变形金刚》(2007) → 《变形金刚2：卷土重来》 → 《变形金刚3：月黑之时》 → 《变形金刚4：绝迹重生》 → 《变形金刚5：最后的骑士》。
- 《大黄蜂》《变形金刚：超能勇士崛起》《变形金刚：起源》不并入本项目主时间线，除非后续明确作为 AU 扩展处理。

## 咩咩全栈分层

- `docs/`：设计规范、施工单、冻结说明
- `manifest/`：条目顺序、触发、灯色、冻结与构建索引
- `worldbook/settings/`：核心规则与核心设定
- `worldbook/characters/main/`：主要角色
- `worldbook/characters/other/`：其他角色
- `worldbook/abilities/`：角色能力与专属武装条目
- `worldbook/locations/`：地点条目
- `timeline/`：Bayverse 五部电影正式 `<world_timeline>` 时间线
- `mvu/`：MVU 九件套与前端 UI
- `runtime/`：运行时桥接、变量与状态逻辑
- `media/`：封面、头像、UI 素材与媒体清单
- `build/`：Candidate JSON/PNG 与构建脚本
- `qa/`：结构、世界书、时间线、MVU、打包与实机 QA
- `source/original/`：只读咩咩制卡·全栈工具包 / 母版
- `source/reference/`：只读 Bayverse 电影时间线、角色、地点等资料底稿与来源索引

## 世界书正式层级

装配顺序遵循咩咩制卡·全栈：

记忆基础设施 → 输出规则 / 时间线 → 核心规则 → 核心设定 → 主要角色 → 其他角色 → 地点。

角色正文使用 `chara-v1` 骨架；能力另拆为对应核心设定条目；最终成卡采用 `chara_card_v3 + 内嵌 character_book + MVU`。

## 当前阶段

仅建立全栈仓库骨架与 Bayverse 时间线基线；正式娘化、扶她化、武装器官、角色、地点与 MVU 设定尚未写入。
