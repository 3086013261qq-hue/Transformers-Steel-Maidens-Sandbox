# 变形钢姬 · 独立 MVU

本模块按 docs/006→007→008→009 装配；音乐以 009 为准。单锁屏 → 单内页、双竖向好感计、六首仓库 MP3。主题曲固定为 **啃书 - Crystal Heart（水晶心）**。

独立交付供后续整卡装配使用。本轮没有生成整卡 Candidate，没有合并或改动业务世界书，也没有改动媒体原文件。

## 入口与装配

- 构建入口：`dist/steel-maidens-mvu.js`（自包含 runtime、CSS 和音乐元数据，无运行时 manifest 请求）。
- 可维护源码：`src/runtime.mjs`、`src/causality.mjs`、`src/player.mjs`、`src/styles.css`。
- 音乐唯一编辑源：仓库 `mvu/music-manifest.v1.json`；修改后重新构建，禁止只改 dist。
- 技术世界书：仓库 `mvu/technical-worldbook-fragment.json`，只有四条技术条目。
- 装配配置：`assembly-manifest.v1.json` 给出三脚本与固定 commit runtime loader，供绒绒后续装配。
- 卡级输出保险：`card-output-insurance.txt`，由后续整卡装配写入卡级指令。它没有被本轮写回业务世界书。
- 显示清理正则：`display-regex.json`，原样复用全栈两条原生正则。

后续装配顺序：酒馆助手中启用 `MVU` → `MVU ZOD` → `变形钢姬 · 独立MVU`。四条技术条目追加到内嵌 character_book，启用前三条，initvar 禁用。前三条为 @Depth 0，order=1000002/1000001/1000000（冻结业务书现有深度 0 最大 order=470），合并时检查 ID 不冲突并按需重编号。输出保险在卡级指令接入；不改预设本体。两个导入启用提示（脚本/正则）需要启用。

挂载沿用全栈 `.mes_text` 接线，007 将原本“每楼一份”覆盖为“最新可见模型消息末尾只有一份”，包括开场 #0。同一聊天中移动同一个 root；audio 独立于可重画楼层，挂在宿主文档中且 hidden。没有悬浮窗、PAGE2、iframe、地图或业务控制器。

## 原包复用与适配边界

实际读取来源：`咩咩制卡·全栈_v1.0.0.zip`，确切摘要和所读文件在 `reference/provenance.json`，原始技术骨架只读副本在 `reference/`。

| 原生成熟技术 | 本模块处理 |
|---|---|
| MVU core import | `src/MVU.js` 原样保留，不实现另一套 core |
| MVU ZOD registrar | 原 import 与 `$(() => registerMvuSchema(Schema))` 入口；空对象 `.loose().prefault({})`，使用原包 Zod 4 的 passthrough 等价语义，保留其他原生字段 |
| 四条技术世界书 | 从原空模板逐条复制全部原生字段，只改本模块内容和深度 0 order；initvar 为 `{}` 且禁用 |
| 宿主 DOM 与生命周期 | 复用 parent document、`.mes_text`、`eventOn`、`tavern_events`、`Mvu.events`、pagehide 接线；按 007 扩展单实例、消息角色兼容与 MutationObserver 兜底 |
| 单播放器生命周期 | 按 008 将“创建一次、刷新不销毁、chat change/pagehide 清理”迁移至单 audio；不引入播放器库或消息总线 |

所读原 ZIP 没有独立网易云播放器源码；本轮不宣称复制了不存在的播放器模块。008/009 已取消网易云，因此没有保留 URL/ID 解析或 iframe，也没有新增另一套 MVU 生命周期框架。

保留全栈实际拼写 `mag_variable_initiailized`，同时监听 `mag_variable_initialized`、`mag_variable_update_ended`；先取 Mvu 事件常量。编辑、swipe、删除、接收/渲染、chat change 均触发读取当前有效消息。`eventOn` 返回 handle.stop 时用它清理，旧版以 eventRemoveListener 清理。脚本重新执行先销毁旧全局实例，pagehide 撤销全部监听与 observer。

## 数据与播放行为

`<causality>` 是两方阵营好感唯一真值源。两行顺序固定、完整验证、整数及范围验证、离散 delta 验证（006：0/+1/+3/+5/-1/-5/-10/-50）；任一行损坏整块丢弃，向历史回退。没有合法历史时两方为 0。角色缺省时也识别模型消息，排除用户、系统、工具消息。无 stat_data / JSONPatch 写入，无人物好感表。原因经 textContent 显示，禁止作为 HTML 执行。

正值从中线向上、负值向下；阶段由 UI 本地计算。原因只在点击详情时显示。背景采用 contain 保留两侧人物与融合徽记；图片失败隐藏图层，保留渐变底和可操作控件。所有按钮 >=44×44，竖条视觉细、实际热区宽，支持键盘与 reduced-motion。

一个 audio、preload=metadata；点击锁屏立即在同一用户手势链中 play。拒播保留选择并显示“点击播放”，不重建、不循环重试。返回锁屏、再进入、详情、消息刷新均保留 src/进度。手动切歌后不强制回主题曲，上一首/下一首顺序循环，ended 自动下一首；单曲失败标记并允许手动重试/换歌。音乐状态仅存客户端，不写世界书、MVU 或凭据。

## 固定正式媒体

锁屏：

https://raw.githubusercontent.com/3086013261qq-hue/Transformers-Steel-Maidens-Sandbox/c618b59f6f2eeb9999d50231352bcabd28b08d1e/media/%E5%8F%98%E5%BD%A2%E9%92%A2%E5%A7%AC_MVU%E9%94%81%E5%B1%8F%E5%B0%81%E9%9D%A2_%E6%9C%80%E7%BB%88%E7%89%88.png

内页：

https://raw.githubusercontent.com/3086013261qq-hue/Transformers-Steel-Maidens-Sandbox/c618b59f6f2eeb9999d50231352bcabd28b08d1e/media/%E5%8F%98%E5%BD%A2%E9%92%A2%E5%A7%AC_MVU%E5%86%85%E9%A1%B5%E8%83%8C%E6%99%AF_%E4%BD%95%E5%8D%9A%E7%8E%9F_vs_%E8%96%87%E9%9C%87%E5%A4%A9_%E6%9C%80%E7%BB%88%E7%89%88.png

音频全部固定 `e5c9d07b12e8429f3a221e9f7eee12d899b12a40`，六首顺序严格按 009：Crystal Heart → Soft Universe → New Divide → What I've Done → 빌런 (Villain) → VEM MEU AMOR (Slowed)。原始图片和 MP3 均未改动，无媒体 Base64、下载器、离线缓存或浮动 main 依赖。

## 构建与验证

在仓库根目录：

```sh
python3 modules/steel-maidens-mvu/build.py
node --check modules/steel-maidens-mvu/dist/steel-maidens-mvu.js
node --test modules/steel-maidens-mvu/qa/unit.test.mjs
```

扩展 QA 需要 Node、Playwright Chromium 和 Zod 4（仅测试依赖，不打包进 runtime）。运行 `qa/static.cjs`、`qa/browser.cjs`。`SM_CHROMIUM` 可指定浏览器可执行文件。`SM_MEDIA_DIR` 可指定只读下载的 cover.png、inner.png、六个 `<track id>.mp3`；`SM_QA_OUTPUT` 指定本地结果目录。`qa/native-audio.cjs` 需要上述完整 MP3 副本，验证原生解码/播放，测试不会修改它们。图像缺失时 browser.cjs 验证 fallback；真实视觉 QA 使用原图副本。测试可用 `NODE_PATH` 指向依赖目录。

完整结果见 `qa/REPORT.md`。本地合同测试与原生 Chromium 媒体测试不等于真实 Android / SillyTavern 用户环境验收；后者仍需在后续装配后实测。没有制作整卡 Candidate。
