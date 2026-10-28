// Native audio adaptation of the fullstack mount/refresh/pagehide lifetime.
// One injected element is retained throughout a chat; DOM renders never create it.
export function createPlayer(audio, manifest, changed = () => {}) {
  const tracks = manifest?.tracks || [];
  if (tracks.length !== 6 || new Set(tracks.map(t => t.id)).size !== 6 ||
      manifest.default_track_id !== 'crystal-heart' || !tracks.some(t => t.id === manifest.default_track_id)) {
    throw new Error('曲库配置无效');
  }
  let current = -1, status = '待播放', disposed = false, attempt = 0, blocked = false;
  const failures = new Set(), listeners = [];
  audio.preload = 'metadata';
  function emit() { if (!disposed) changed(snapshot()); }
  function snapshot() { return { current, track: tracks[current] || tracks[0], status, paused: audio.paused, failures: [...failures] }; }
  function validURL(track) {
    try {
      const u = new URL(track.url);
      return u.protocol === 'https:' && u.hostname === 'raw.githubusercontent.com' &&
        u.pathname.startsWith('/3086013261qq-hue/Transformers-Steel-Maidens-Sandbox/e5c9d07b12e8429f3a221e9f7eee12d899b12a40/media/music/');
    } catch { return false; }
  }
  function select(index) {
    if (disposed || !Number.isInteger(index) || index < 0 || index >= tracks.length) return false;
    if (!validURL(tracks[index])) { failures.add(index); status = '歌曲地址无效，请选择其他曲目'; emit(); return false; }
    if (current !== index) {
      attempt++; blocked = false; audio.pause(); current = index; audio.src = tracks[index].url;
      status = '加载中'; audio.load();
    }
    emit(); return true;
  }
  function play() {
    if (disposed) return;
    if (current < 0 && !select(tracks.findIndex(t => t.id === manifest.default_track_id))) return;
    if (audio.error) { failures.delete(current); audio.load(); }
    blocked = false;
    const token = ++attempt;
    // play() is invoked synchronously in the unlock/click gesture, before any await.
    try {
      const promise = audio.play();
      Promise.resolve(promise).catch(() => {
        if (!disposed && token === attempt) { blocked = true; status = '点击播放'; emit(); }
      });
    } catch { blocked = true; status = '点击播放'; emit(); }
  }
  function step(offset, skipFailed = false) {
    if (disposed) return;
    for (let count = 1; count <= tracks.length; count++) {
      const next = ((current < 0 ? 0 : current) + offset * count + tracks.length * count) % tracks.length;
      if (skipFailed && failures.has(next)) continue;
      if (select(next)) { play(); return; }
    }
    status = '暂无可播放曲目，请手动重试'; emit();
  }
  const on = (name, fn) => { audio.addEventListener(name, fn); listeners.push([name, fn]); };
  for (const name of ['loadedmetadata', 'canplay', 'play', 'pause']) on(name, () => {
    if (name === 'play') blocked = false;
    status = blocked ? '点击播放' : name === 'play' ? '播放中' : name === 'pause' ? '已暂停' : audio.paused ? '待播放' : '播放中'; emit();
  });
  on('ended', () => step(1, true));
  on('error', () => { if (current >= 0) failures.add(current); status = '加载失败，可重试或切歌'; emit(); });
  return {
    snapshot, select, play, step,
    enter() { if (current < 0) select(tracks.findIndex(t => t.id === manifest.default_track_id)); if (audio.paused) play(); },
    toggle() { if (audio.paused) play(); else { attempt++; audio.pause(); } },
    choose(index) { if (select(index)) play(); },
    destroy() {
      if (disposed) return; disposed = true; attempt++;
      listeners.forEach(([name, fn]) => audio.removeEventListener(name, fn));
      audio.pause(); audio.removeAttribute('src'); audio.load(); audio.remove();
    },
  };
}
