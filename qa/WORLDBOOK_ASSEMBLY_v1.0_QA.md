# 《变形钢姬》咩咩全栈世界书装配 QA v1.0

结论：**PASS**

## 基线
- 源 HEAD：`b839ff62deefade9439ced65bd8ebf6c26a9142c`
- 技术口径：咩咩制卡·全栈 v1.0.0 / chara_card_v3 `character_book`
- 世界书成品：`build/worldbook/变形钢姬_worldbook_v1.0.0.json`

## 条目计数
- 总条目：283
- 分区起始/结尾标记：14
- 时间线：9（MAIN01 默认启用，其余8条默认禁用；手动切卷）
- 蓝灯设定：9
- 绿灯设定：46
- 角色能力：69
- 赛博坦角色：69
- 人类NPC：28
- 地点：39
- 触发型业务条目：251

## 三个历史坑的硬验收
1. **工程头禁止进正文：PASS**。运行时 `content` 不含 `# BLUE/GREEN`、`> 灯色`、`> 上位蓝灯`、`> 职责` 或时间线 HTML 工程注释。
2. **关键词格式：PASS**。所有触发型条目均 `keys=[单一正则]`、`secondary_keys=[]`、`use_regex=true`；角色/能力只扫 `<story_scene>`，地点只扫 `<status>` 的 `当前位置:`。
3. **绿灯双防递归：PASS**。全部触发型业务条目 `prevent_recursion=true` 且 `exclude_recursion=true`。

## ccv3 字段净化
- extensions 使用规范字段；不存在 `preventRecursion/excludeRecursion/displayIndex/scanDepth` 等与 snake_case 同义字段并存。
- `display_index` 与条目数组阅读顺序逐条一致。
- after_char 使用 extensions.position=1；时间线 @Depth 0 使用 position=`at_depth`、extensions.position=4、depth=0。

## 内容格式
- 55条设定运行时正文统一为 `<核心设定:...>...</核心设定:...>`；BLUE09原封版标签直接保留。
- 97条角色正文保留原人物 XML 标签，不重写人物内容。
- 69条能力正文保留 `<核心设定:角色·能力>`。
- 39条地点在装配层转换为全栈地点标签 `<地点:...>`，并保留原地点详情；追加 `介绍:` 入口字段。
- 9条时间线只保留完整 `<world_timeline>` 块，剥离源码 HTML 注释。

## 地点触发冲突
- 地点仍采用咩咩 `<status>` / `当前位置:` 正则面；本卡进一步把当前位置字段做精确值匹配，39×39 交叉测试无父子地点误触发。

## MVU边界
- 本轮只装业务世界书；MVU initvar/update/output/list 四条系统条目尚未加入，等轻量 MVU 施工时按全栈空模板原样接入，避免提前混线。
