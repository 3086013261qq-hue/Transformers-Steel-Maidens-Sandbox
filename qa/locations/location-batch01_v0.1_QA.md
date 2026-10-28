# 《变形钢姬》地点层 Batch 01 QA v0.1

结论：**PASS**

## 1. 基线

- 时间线正式基线：`747384b0df5ed7685775d99d5b912fe3fad52c50`
- 9 卷时间线：FINAL QA PASS
- 地点正式源：`worldbook/locations/`
- 总名册：`docs/005_变形钢姬_地点总名册_v0.1.md`
- 触发清单：`manifest/location-production-batch01.v1.json`

## 2. 总名册

- A级：9
- B级：22
- C级：8
- 总计：39

收录检查：

- 不为普通街角、一次性道路单独建卡：PASS
- 城市与子地点允许并存但不复制：PASS
- 跨电影同地点采用“时代状态”合并：PASS
- Mission City保持电影内虚构名：PASS
- 山姆大学不把Princeton/UPenn拍摄地当剧情校名：PASS
- 中国KSI设施不硬锁电影冲突城市：PASS

## 3. Batch 01 五条样板

- LOC-A01 赛博坦：星球/母星模板，PASS
- LOC-A02 芝加哥：跨卷城市/时代状态模板，PASS
- LOC-A03 胡佛水坝·Sector 7地下设施：秘密设施模板，PASS
- LOC-A04 Diego Garcia NEST基地：联合军事基地模板，PASS
- LOC-A06 凯德·伊格尔废料场·赛博坦避难场：长期隐蔽据点模板，PASS

五条均使用：

`<核心设定:地点名> ... </核心设定:地点名>`

字段均覆盖：归属 / 类型 / 环境 / 正常功能 / 时代状态 / 势力 / 关联人物 / 剧情锚点 / 知识边界 / RP场景 / 互动约束。

## 4. 咩咩触发

- 灯色：绿灯 / keyword_triggered，PASS
- always_on=false，PASS
- prevent_recursion=true，PASS
- exclude_recursion=true，PASS
- 正式触发锚定 `<status>` 内 `当前位置:`，PASS
- 普通正文提及地点不应独立触发，PASS

推荐模板：

`/<status>[\s\S]*?当前位置:[^\n<]*(?:地点全称|简称|必要别名)[\s\S]*?<\/status>/s`

## 5. 事实核对

- 胡佛水坝作为Sector 7掩体、薇震天与火种源封存地：与第一卷时间线一致。
- Diego Garcia作为NEST安全基地、火种源碎片被盗地点：与第二卷时间线一致。
- 芝加哥第三卷大战、第四卷战后政治阴影、第五卷禁区状态按时代分离：一致。
- 凯德废料场位于南达科他州并作为第五部赛博坦避难点：一致。
- 赛博坦第三卷空间桥危机与第五卷残破母星/双星终局分阶段记录：一致。

## 6. token与递归

地点全部按需绿灯加载，不常驻；Batch 01单条正文维持短颗粒度，不复制整段电影剧情。PASS。

## 7. 下一步

继续生产其余A级：LOC-A05 / A07 / A08 / A09；通过后进入B级批量。
