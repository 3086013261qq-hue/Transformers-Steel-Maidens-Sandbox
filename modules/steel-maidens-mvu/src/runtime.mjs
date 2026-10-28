import { FACTIONS, latestCausality, stage, isModelMessage } from './causality.mjs';
import { createPlayer } from './player.mjs';

// Candidate2 visual pass. Lifecycle/data/player behavior stays on the fullstack-derived runtime.
export function boot(env, manifest, css, media) {
  const top = env.window.parent, d = top.document, KEY = '__steelMaidensMvu';
  top[KEY]?.destroy();
  let instance = null, disposed = false, queued = null;
  const subscriptions = [], timers = new Set();
  const later = (fn, delay = 0) => {
    const id = env.window.setTimeout(() => { timers.delete(id); if (!disposed) fn(); }, delay);
    timers.add(id); return id;
  };
  function messages() {
    try { return env.getChatMessages('0-' + env.getLastMessageId()); }
    catch (error) {
      const chat = top.SillyTavern?.getContext?.().chat;
      if (Array.isArray(chat)) return chat;
      throw error;
    }
  }
  function create() {
    const root = d.createElement('section');
    root.className = 'sm-mvu';
    root.setAttribute('aria-label', '变形钢姬');
    const style = d.createElement('style');
    style.textContent = css;
    root.appendChild(style);
    const content = d.createElement('div');
    content.innerHTML = `
      <div class="sm-scene sm-cover">
        <img class="sm-art" alt="汽车人与霸天虎融合徽记">
        <span class="sm-cover-vfx" aria-hidden="true"></span>
        <button class="sm-enter-surface" type="button" aria-label="进入变形钢姬"></button>
      </div>
      <div class="sm-scene sm-inner" hidden>
        <img class="sm-art" alt="何博玟与薇震天">
        <span class="sm-inner-shade" aria-hidden="true"></span>
        <button class="sm-lock" type="button" aria-label="返回锁屏" title="返回锁屏">↩</button>
        <div class="sm-gauges">
          ${FACTIONS.map((name, i) => `<button type="button" class="sm-gauge" data-faction="${i}" aria-label="${name}阵营详情" aria-expanded="false">
            <span class="sm-symbol" aria-hidden="true">${i ? '◆' : '◇'}</span>
            <span class="sm-faction">${name}</span>
            <b class="sm-value">0</b>
            <span class="sm-meter" role="meter" aria-label="${name}好感" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0"><span class="sm-fill"></span></span>
            <span class="sm-stage">中立</span><span class="sm-delta">+0</span>
          </button>`).join('')}
        </div>
        <div class="sm-detail" role="region" aria-label="阵营详情" hidden>
          <button class="sm-detail-close" type="button" aria-label="关闭详情">×</button>
          <b class="sm-detail-title"></b>
          <p class="sm-detail-values"></p>
          <p class="sm-detail-reason"></p>
        </div>
        <div class="sm-dock">
          <div class="sm-now"><span class="sm-note" aria-hidden="true">♪</span><span class="sm-track"></span><span class="sm-status" role="status" aria-live="polite"></span></div>
          <div class="sm-controls">
            <button type="button" data-music="prev" aria-label="上一首" title="上一首">‹</button>
            <button type="button" data-music="play" aria-label="播放">▶</button>
            <button type="button" data-music="next" aria-label="下一首" title="下一首">›</button>
            <button type="button" data-music="library" aria-expanded="false" aria-label="曲库" title="曲库">≡</button>
          </div>
          <div class="sm-library" aria-label="曲库" hidden></div>
        </div>
      </div>`;
    root.appendChild(content);
    const q = selector => root.querySelector(selector), all = selector => [...root.querySelectorAll(selector)];
    q('.sm-cover .sm-art').src = media.cover;
    q('.sm-inner .sm-art').src = media.inner;
    all('.sm-art').forEach(img => img.addEventListener('error', () => { img.hidden = true; }, { once: true }));
    const audio = d.createElement('audio');
    audio.dataset.steelMaidensAudio = 'true';
    audio.hidden = true;
    d.body.appendChild(audio);
    const library = q('.sm-library');
    manifest.tracks.forEach((track, index) => {
      const button = d.createElement('button');
      button.type = 'button';
      button.className = 'sm-song';
      button.dataset.track = String(index);
      const title = d.createElement('span');
      title.textContent = track.title + (track.theme ? ' · 主题曲' : '');
      const artist = d.createElement('small');
      artist.textContent = track.artist;
      button.append(title, artist);
      library.appendChild(button);
    });
    const setText = (el, text) => { if (el.textContent !== text) el.textContent = text; };
    const player = createPlayer(audio, manifest, updateMusic);
    function updateMusic(state) {
      setText(q('.sm-track'), state.track.title + ' · ' + state.track.artist);
      setText(q('.sm-status'), state.status);
      const play = q('[data-music="play"]');
      setText(play, state.paused ? '▶' : 'Ⅱ');
      play.setAttribute('aria-label', state.paused ? '播放' : '暂停');
      all('.sm-song').forEach((el, index) => {
        el.setAttribute('aria-current', String(index === state.current));
        el.title = state.failures.includes(index) ? '本次加载失败，可点击重试' : '';
      });
    }
    updateMusic(player.snapshot());
    let selected = null, state = latestCausality([]);
    function detail(index) {
      selected = index;
      q('.sm-detail').hidden = index === null;
      all('.sm-gauge').forEach((button, i) => button.setAttribute('aria-expanded', String(i === index)));
      if (index === null) return;
      const f = state.factions[index];
      setText(q('.sm-detail-title'), f.name);
      setText(q('.sm-detail-values'), `${f.value} / 100 · ${stage(f.value)} · ${f.delta >= 0 ? '+' : ''}${f.delta}`);
      setText(q('.sm-detail-reason'), f.reason);
    }
    function enterInner() {
      q('.sm-cover').classList.add('sm-cover-exit');
      later(() => {
        q('.sm-cover').hidden = true;
        q('.sm-cover').classList.remove('sm-cover-exit');
        q('.sm-inner').hidden = false;
      }, 130);
      player.enter();
    }
    const click = event => {
      const button = event.target.closest('button');
      if (button && root.contains(button)) {
        if (button.matches('.sm-enter-surface')) enterInner();
        else if (button.matches('.sm-lock')) {
          detail(null); library.hidden = true;
          q('[data-music="library"]').setAttribute('aria-expanded', 'false');
          q('.sm-inner').hidden = true; q('.sm-cover').hidden = false;
        }
        else if (button.matches('.sm-gauge')) {
          const index = Number(button.dataset.faction); detail(selected === index ? null : index);
        }
        else if (button.matches('.sm-detail-close')) detail(null);
        else if (button.matches('.sm-song')) {
          player.choose(Number(button.dataset.track)); library.hidden = true;
          q('[data-music="library"]').setAttribute('aria-expanded', 'false');
        }
        else if (button.dataset.music === 'prev') player.step(-1);
        else if (button.dataset.music === 'next') player.step(1);
        else if (button.dataset.music === 'play') player.toggle();
        else if (button.dataset.music === 'library') {
          library.hidden = !library.hidden;
          button.setAttribute('aria-expanded', String(!library.hidden));
        }
      } else if (!event.target.closest('.sm-detail')) detail(null);
    };
    root.addEventListener('click', click);
    const keydown = e => {
      if (e.key === 'Escape') {
        detail(null); library.hidden = true;
        q('[data-music="library"]').setAttribute('aria-expanded', 'false');
      }
    };
    root.addEventListener('keydown', keydown);
    return {
      root, audio, player,
      render(next) {
        state = next;
        all('.sm-gauge').forEach((button, i) => {
          const f = state.factions[i], meter = button.querySelector('.sm-meter'), fill = button.querySelector('.sm-fill');
          setText(button.querySelector('.sm-value'), String(f.value));
          setText(button.querySelector('.sm-stage'), stage(f.value));
          setText(button.querySelector('.sm-delta'), (f.delta >= 0 ? '+' : '') + f.delta);
          meter.setAttribute('aria-valuenow', String(f.value));
          fill.style.top = (f.value >= 0 ? 50 - f.value / 2 : 50) + '%';
          fill.style.height = Math.abs(f.value) / 2 + '%';
          fill.classList.remove('sm-pulse');
          void fill.offsetWidth;
          if (f.delta !== 0) fill.classList.add('sm-pulse');
        });
        if (selected !== null) detail(selected);
      },
      destroy() {
        root.removeEventListener('click', click);
        root.removeEventListener('keydown', keydown);
        player.destroy(); root.remove();
      },
    };
  }
  function refresh() {
    if (disposed) return;
    let list;
    try { list = messages(); if (!Array.isArray(list)) return; } catch { return; }
    let box = null;
    for (let i = list.length - 1; i >= 0; i--) {
      if (!isModelMessage(list[i])) continue;
      const id = Number(list[i].message_id ?? i);
      if (!Number.isSafeInteger(id)) continue;
      box = d.querySelector('#chat > .mes[mesid="' + id + '"] .mes_text');
      if (box) break;
    }
    if (!box) { instance?.root.remove(); return; }
    if (!instance) instance = create();
    if (instance.root.parentNode !== box || box.lastElementChild !== instance.root) box.appendChild(instance.root);
    instance.render(latestCausality(list));
  }
  function schedule() {
    if (queued !== null || disposed) return;
    queued = later(() => { queued = null; refresh(); });
  }
  function subscribe(event, fn) {
    if (!event || subscriptions.some(s => s.event === event && s.fn === fn)) return;
    const handle = env.eventOn(event, fn);
    subscriptions.push({ event, fn, handle });
  }
  function chatChanged() {
    instance?.destroy(); instance = null;
    if (queued !== null) { env.window.clearTimeout(queued); timers.delete(queued); queued = null; }
    later(refresh, 500);
  }
  const events = env.tavern_events || {}, mvuEvents = env.Mvu?.events || {};
  for (const key of ['CHARACTER_MESSAGE_RENDERED', 'MESSAGE_RECEIVED', 'MESSAGE_UPDATED', 'MESSAGE_SWIPED', 'MESSAGE_DELETED']) subscribe(events[key], schedule);
  subscribe(events.CHAT_CHANGED, chatChanged);
  for (const event of new Set([mvuEvents.VARIABLE_INITIALIZED, mvuEvents.VARIABLE_UPDATE_ENDED,
    'mag_variable_initiailized', 'mag_variable_initialized', 'mag_variable_update_ended'].filter(Boolean))) subscribe(event, schedule);
  const observer = new env.window.MutationObserver(records => {
    if (records.some(r => !instance?.root.contains(r.target) &&
      (r.target.closest?.('#chat') || [...r.addedNodes, ...r.removedNodes].some(n => n.id === 'chat' || n.querySelector?.('#chat'))))) schedule();
  });
  observer.observe(d.querySelector('#sheld') || d.body, { childList: true, subtree: true, characterData: true });
  function destroy() {
    if (disposed) return; disposed = true;
    observer.disconnect(); timers.forEach(id => env.window.clearTimeout(id)); timers.clear();
    subscriptions.forEach(({ event, fn, handle }) => {
      if (typeof handle?.stop === 'function') handle.stop();
      else env.eventRemoveListener?.(event, fn);
    });
    instance?.destroy(); instance = null;
    env.window.removeEventListener('pagehide', destroy);
    if (top[KEY] === api) delete top[KEY];
  }
  const api = { refresh, destroy, get instance() { return instance; } };
  top[KEY] = api; env.window.addEventListener('pagehide', destroy); refresh();
  return api;
}
