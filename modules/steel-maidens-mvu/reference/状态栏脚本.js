// 角色脚本「变量状态栏」：把面板挂到每条 AI 回复的正文底部（楼层 .mes_text 的最后一个子元素），随楼层滚动。
// 开场白（0 楼和它的备选开场）、用户楼层、系统楼层不挂；变量还没有时面板藏着。
// 换成自己的面板：改 PANEL_HTML 里的结构和字段；把全文的 xx 换成自己的前缀（字母、数字、连字符）。其余照抄。
// 面板里 script 的结束标签必须写成「<\/script>」：酒馆助手把整段脚本塞进页面时，源码里出现原样的结束标签会把外面的标签提前关掉，整个脚本报语法错。这一行注释里也不能出现原样的。

const PANEL_HTML = `
<div class="xx-status" hidden>
  <div class="xx-status-row"><span>好感度：</span><b data-f="好感度"></b></div>
  <div class="xx-status-row"><span>心情：</span><b data-f="心情"></b></div>
  <div class="xx-status-row"><span>所持金：</span><b data-f="所持金"></b></div>
  <div class="xx-status-list" data-list="物品栏"><span>物品栏：</span><ul></ul></div>
  <script>
  (function () {
    var me = document.currentScript;
    var host = me && me.closest('.xx-status-host');
    var panel = host && host.querySelector('.xx-status');
    if (!panel) return;
    var id = Number(host.getAttribute('data-message-id'));
    // 旧版 MVU 的值可能是 [值, 说明]：只在第二项是字符串时剥一层
    var unwrap = function (v) { return Array.isArray(v) && v.length === 2 && typeof v[1] === 'string' ? v[0] : v; };
    var pick = function (o, path) { return String(path).split('.').reduce(function (c, k) { return c == null ? c : unwrap(c[k]); }, o); };
    var show = function (v) { return v === -1 || v === '' || v == null ? '待确定' : String(v); };
    function render() {
      if (!panel.isConnected) {
        if (window.__mvuStatusTicks && window.__mvuStatusTicks[id] === render) delete window.__mvuStatusTicks[id];
        return;
      }
      var d = {};
      try { d = (window.__mvuStatusRead && window.__mvuStatusRead(id)) || {}; } catch (e) {}
      var ready = d && typeof d === 'object' && Object.keys(d).length > 0;
      panel.hidden = !ready;
      if (!ready) return;
      panel.querySelectorAll('[data-f]').forEach(function (el) { el.textContent = show(pick(d, el.getAttribute('data-f'))); });
      panel.querySelectorAll('[data-list]').forEach(function (box) {
        var obj = pick(d, box.getAttribute('data-list')) || {}, keys = Object.keys(obj), ul = box.querySelector('ul');
        box.hidden = keys.length === 0;
        ul.textContent = '';
        keys.forEach(function (k) {
          var it = unwrap(obj[k]) || {}, li = document.createElement('li');
          li.textContent = k + (it.数量 != null ? ' ×' + it.数量 : '');
          ul.appendChild(li);
        });
      });
    }
    window.__mvuStatusTicks = window.__mvuStatusTicks || {};
    window.__mvuStatusTicks[id] = render;
    render();
  })();
  <\/script>
</div>`;

const HOST = 'xx-status-host';

function doc() { try { return window.parent.document; } catch (e) { return document; } }
function textBox(id) { try { return doc().querySelector('#chat > .mes[mesid="' + id + '"] .mes_text'); } catch (e) { return null; } }
function chatMessage(id) { try { const list = getChatMessages(id); return list && list[0] ? list[0] : null; } catch (e) { return null; } }
// 只挂 AI 回复。getChatMessages 给的是 role（assistant / user / system），没有 is_user
function shouldMount(id) {
  const m = chatMessage(id);
  if (!m || m.role !== 'assistant') return false;
  if (id === 0) return false;                                                        // 0 楼是开场白，备选开场是它的 swipe
  if (/<\/?opening>|\[(?:[A-Z_]+_)?OPENING_FLOW\]/i.test(String(m.message || ''))) return false;   // 自定义开场标记
  return true;
}
function hostOf(id) { try { return doc().querySelector('.' + HOST + '[data-message-id="' + id + '"]'); } catch (e) { return null; } }
function tickOne(id) { try { const f = (window.parent.__mvuStatusTicks || {})[id]; if (f) f(); } catch (e) {} }
function tickAll() { try { Object.values(window.parent.__mvuStatusTicks || {}).forEach(f => { try { f(); } catch (e) {} }); } catch (e) {} }

function mount(id) {
  id = Number(id);
  const box = textBox(id);
  if (!box) return;
  const old = hostOf(id);
  if (!shouldMount(id)) { if (old) old.remove(); return; }
  if (old && old.parentNode === box && box.lastElementChild === old) { tickOne(id); return; }   // 已经在正文底部：只重画
  if (old) old.remove();
  const d = doc(), host = d.createElement('div');
  host.className = HOST;
  host.setAttribute('data-message-id', String(id));
  host.innerHTML = PANEL_HTML;
  box.appendChild(host);
  // innerHTML 塞进去的 <script> 不执行：换成新建的 script 元素，它在酒馆页面里跑一次
  host.querySelectorAll('script').forEach(s => { const n = d.createElement('script'); n.textContent = s.textContent; s.replaceWith(n); });
}
function mountAll() {
  let last = -1;
  try { last = getLastMessageId(); } catch (e) {}
  for (let i = 0; i <= last; i++) mount(i);
}

$(async () => {
  try { await waitGlobalInitialized('Mvu'); } catch (e) {}
  const top = window.parent;
  // 面板读变量的入口：给楼层号，回这一楼的 stat_data
  top.__mvuStatusRead = function (id) {
    try { const m = Mvu.getMvuData({ type: 'message', message_id: id }); if (m && m.stat_data) return m.stat_data; } catch (e) {}
    try { const v = getVariables({ type: 'message', message_id: id }); if (v && v.stat_data) return v.stat_data; } catch (e) {}
    return {};
  };
  top.__mvuStatusTicks = top.__mvuStatusTicks || {};
  const ev = (typeof Mvu === 'object' && Mvu && Mvu.events) || {};
  const later = () => { setTimeout(tickAll, 0); setTimeout(tickAll, 800); };
  eventOn(ev.VARIABLE_UPDATE_ENDED || 'mag_variable_update_ended', later);
  eventOn(ev.VARIABLE_INITIALIZED || 'mag_variable_initiailized', later);          // 官方常量的字符串就是这么拼的
  eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, mount);
  eventOn(tavern_events.MESSAGE_UPDATED, mount);
  eventOn(tavern_events.MESSAGE_SWIPED, mount);
  eventOn(tavern_events.MESSAGE_DELETED, () => setTimeout(mountAll, 0));
  eventOn(tavern_events.CHAT_CHANGED, () => setTimeout(mountAll, 500));
  mountAll();
});

// 脚本停用、换卡时把挂上去的面板收走
$(window).on('pagehide', () => { try { doc().querySelectorAll('.' + HOST).forEach(h => h.remove()); } catch (e) {} });
