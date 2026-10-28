# 《变形钢姬》worldbook/locations 地点层

> 状态：**39 / 39 完成；FINAL QA PASS**

本目录是《变形钢姬》正式地点世界书源。地点条目只负责“当前身处某地时，AI应知道这里是什么、有哪些空间/阵营/风险/可互动资源，以及在当前剧情阶段哪些事实已经成立”。

地点条目不负责推进剧情，不替代 `<world_timeline>`，也不因为玩家抵达某地就自动宣告未来事件已经发生。

## 格式

每个正式地点正文使用：

`<核心设定:地点名> ... </核心设定:地点名>`

字段统一为：归属 / 类型 / 环境 / 正常功能 / 时代状态 / 势力 / 关联人物 / 剧情锚点 / 知识边界 / RP场景 / 互动约束。

## 灯色与触发

所有具体地点均为绿灯 / keyword_triggered：

- `always_on=false`
- `keyword_triggered=true`
- `prevent_recursion=true`
- `exclude_recursion=true`

正式装配时触发必须锚定 `<status>` 中的 `当前位置:`，不得使用普通聊天正文地点名作为独立触发源。

若当前位置已经是具体子地点，只加载子地点正文即可，不重复加载父级城市/大型地点全文。

## 分级

- A级：9条，长期核心/跨卷高频RP地点。
- B级：22条，电影主舞台/重要战区。
- C级：8条，设施子区域/交通空间/短时特殊地点/伏笔研究区。

总计：**39条**。

## 批次

- Batch 01：5条样板，PASS。
- Batch 02：20条，PASS。
- Batch 03：14条，PASS。

总审计：`qa/locations/location-layer-full-audit_v1_QA.md`。
当前状态清单：`manifest/location-layer-current.v1.json`。

**地点层已封版，可进入下一世界书层。**