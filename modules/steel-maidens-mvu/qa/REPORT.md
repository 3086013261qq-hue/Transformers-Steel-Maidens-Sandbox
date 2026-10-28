# MVU 独立模块与音乐 QA

日期：2026-10-29（Asia/Shanghai）。状态：实现完成，本地合同 / 布局 / 原生媒体验证通过；真实 Android / SillyTavern 待后续整卡装配验收。

基线：`34ef5280bfe875bff0a8ad0e60353cf6134a3689`。施工顺序为 007→008→009；音乐最终服从 009。

## 提交与交付

- 源码、原包复用证据、独立音乐 manifest、四条技术片段：`496822ac721071d34892ba83926288f1fcd1d758`
- 确定性构建产物：`77d446740a49a95ef0d6a493b88a6bf7153cb58c`
- QA 与装配入口为后续提交；该提交 SHA 以仓库提交历史 / 交付消息为准，避免自引用。

入口：`modules/steel-maidens-mvu/dist/steel-maidens-mvu.js`。

固定 runtime commit：`77d446740a49a95ef0d6a493b88a6bf7153cb58c`。

固定 loader、原 core / ZOD 脚本与 SHA256 均在模块 `assembly-manifest.v1.json`。

构建 JS SHA256：`35ae645e8c3eca22688884b938f866d6797a86bbbb22b22aa976b87c350dd982`。

## 验证环境与证据

| 层级 | 结果 | 证据 |
|---|---|---|
| Node 24 行为测试 | 10/10 通过 | `unit.test.mjs`、`unit-results.txt` |
| 原生模板字段 / Zod 4.6.7 / 源码隔离 | 通过 | `static.cjs`、`static-results.txt` |
| Chromium 151 / Playwright 1.62.1 手机触控模拟 | 21/21 通过 | `browser.cjs`、`browser-results.json` |
| 两张图片加载失败场景 | 同一完整套件 21/21 通过 | `fallback-browser-results.json` |
| 原生 HTMLAudioElement / 未改动 MP3 副本 | 9/9 通过 | `native-audio.cjs`、`native-audio-results.json` |
| 六个固定 raw 实际 HTTP 读取 | 6/6 成功，大小与仓库一致 | `media-probes.json` |
| 六首原始音频解码 | 6/6 MP3，均有有效时长 | `media-decode.json`（含每首 SHA256） |
| 所有原有文件保护 | 构建 tree 中 404/404 原 blob SHA 相等 | Git tree 比较；其中冻结文件逐项见 `frozen-files.v1.json`（293 项） |
| 构建与语法 | 重复构建摘要一致，runtime / core / ZOD 语法通过 | `build.py`、`node --check` |

浏览器合同测试对宿主 API、拒播、错误等使用 fixture，媒体事件/播放进度在该套件中可控。原生音频套件不覆盖 HTMLMediaElement 原型：使用下载后未改动的六首固定 MP3 字节，通过本地请求拦截（含 Range）验证解码与播放时间推进，不宣称已检查外放声音、Android WebView 策略、真实酒馆插件集或 CDN 在用户网络中的可达性。

视觉检查使用正式原图只读副本；没有上传替代图。检查过锁屏融合徽记与内页左右人物、中央细长双竖条、底部曲库；测试环境单独补 CJK 字体以便核对中文，不向 runtime 嵌字体或媒体。截图只作本地检查，不属于媒体改写或整卡产物。

## 按施工单验收

| 要求 | 验证结论 |
|---|---|
| 固定 raw 正式两图 / fallback | 图层加载成功或 error 后隐藏；渐变底与操作保留。两图 URL 完整列于模块 README，commit 固定 c618b59 |
| 单锁屏 → 单内页 | 中央进入、返回锁屏、单根 root；没有 PAGE2 / iframe / 多页 Tab |
| 首楼 / 新楼 / 重绘 | #0 即可挂载；最新模型楼正文末尾复用一份 root；普通重绘不重建播放器 |
| 0 / 0、+43 / -20、-100 / +100 | 正确显示；0 中线，正向上、负向下，极值与阶段边界全部通过 |
| 阵营详情 | 仅当前点击阵营，原因默认隐藏；再次点击、关闭按钮、空白、Escape、锁屏可关闭 |
| 最新合法完整块 | 最新消息、同消息末块；两行同时验证；越界 / 非整数 / 非法 delta / 缺行 / 标签污染整块回退 |
| 角色兼容 / 历史回退 | role 缺省可读；排除 user / system / tool；编辑、swipe、删除回退；无合法历史为双 0 |
| 实时事件 / 兜底 | Tavern 渲染、接收、编辑、swipe、删除、chat change；Mvu 常量与两种 initialized 拼写；observer 兜底；不重复订阅 |
| 唯一真值 / 原生变量 | 没有写 stat_data / JSONPatch，没有人物好感表；原生 affinity 继续独立 |
| 六首 / 顺序 / 主题 | crystal-heart 是唯一 theme=true，default_track_id 正确；order=1～6；全部 raw 固定 e5c9d07 |
| 用户手势播放 / 拒播 | 解锁同步调用 play；拒播被捕获并显示“点击播放”；canplay/metadata 不覆盖拒播提示；手动重试可用 |
| 单 audio / 当前曲加载 | 启动时无 MP3 src；仅当前曲加载；切歌只换同一个 src，旧轨停止；无并发整库预载 |
| 顺序切歌 / ended | 上下首循环、六首当前项高亮；原生第六首自然 ended 后回首曲；失败曲支持手动重试或换歌 |
| 状态保持 | 返回/再次进入不重置时间；详情、好感刷新、DOM 重绘继续同一音源；切歌后不强制回主题 |
| 加载失败 | 模拟 error / 404 同类媒体错误后 UI 正常，其他曲可播放，不重建 audio、不无限重试 |
| 手机宽度 / 触控 | 248、278、320、360、390、412、430、560、690、860px 全部无横向 overflow；可见按钮 >=44×44 |
| 曲库 / 层级 | overflow-y:auto；当前项清晰；不横滑；展开后不与双竖条主体重叠 |
| chat change / unload | 旧 audio 暂停、清 src、移除；根节点、监听、timer 与 observer 清理；重新初始化只有一份 |
| 技术四条 | 从原空模板复制字段：use_regex、scan_depth=null、递归双保护、@Depth 0；initvar={} 且禁用；原生变量列表宏保留 |
| core / ZOD / 框架复用 | core import 原样；相同 registrar 与 jQuery ready；空 loose schema 保留原生字段，幂等通过；无第二套 core / 消息总线 / 播放器库 |

## 复用说明与限制

`reference/provenance.json` 记录真实读取的全栈 v1.0.0 ZIP 摘要和四个原始技术文件摘要；`reference/` 保存只读参考副本。没有把“看过风格”当作复用。

原包实际没有独立网易云播放器源码。按 008 明确许可，将全栈成熟单实例 DOM / 生命周期模式迁移到原生 audio；009 的音乐行为作为业务适配实现。没有自行重造 MVU core、ZOD registrar 或另一套事件系统。

独立技术片段未写回业务世界书。未修改 worldbook、timeline、角色、能力、地点、蓝灯、绿灯、正式图片和 MP3；未生成完整角色卡 PNG / JSON Candidate；未改预设、未使用凭据。

后续整卡装配需要：使用固定 loader，追加四条技术条目并处理 ID 冲突，将 `card-output-insurance.txt` 接入卡级指令，启用脚本与显示清理正则。真实 Android / SillyTavern 用户环境中的触控、聊天切换与媒体网络策略仍需实测，当前报告不将其标为已通过。
