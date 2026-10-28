// docs/006 data contract. This reader never writes MVU variables.
export const FACTIONS = ['汽车人', '霸天虎'];
const DELTAS = new Set([0, 1, 3, 5, -1, -5, -10, -50]);
export function stage(value) {
  if (value <= -80) return '不死不休';
  if (value <= -50) return '敌视';
  if (value <= -20) return '对立';
  if (value < 0) return '警戒';
  if (value < 20) return '中立';
  if (value < 40) return '友善';
  if (value < 60) return '认可';
  if (value < 80) return '信赖';
  if (value < 100) return '同盟';
  return '生死与共';
}
export function isModelMessage(m) {
  return !!m && m.is_user !== true && m.is_system !== true &&
    !['user', 'system', 'tool', 'function', 'developer'].includes(String(m.role || '').toLowerCase());
}
export function messageText(m) {
  // Tavern Helper returns the active message; native ST also carries swipe_id.
  if (typeof m.message === 'string') return m.message;
  const swipe = m.swipes?.[m.swipe_id];
  return typeof swipe === 'string' ? swipe : String(m.mes || '');
}
export function parseBlock(body) {
  const lines = body.trim().split(/\r?\n/);
  if (lines.length !== 2) return null;
  const result = [];
  for (let i = 0; i < 2; i++) {
    const re = new RegExp('^' + FACTIONS[i] + '好感[:：]\\s*([+-]?\\d+)/100[｜|]本回合[:：]\\s*([+-]?\\d+)[｜|]原因[:：]\\s*([^<>\\r\\n]+)$');
    const match = lines[i].trim().match(re);
    if (!match) return null;
    const value = Number(match[1]), delta = Number(match[2]), reason = match[3].trim();
    if (!Number.isSafeInteger(value) || value < -100 || value > 100 || !DELTAS.has(delta) || !reason) return null;
    result.push({ name: FACTIONS[i], value, delta, reason });
  }
  return result;
}
export function latestCausality(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!isModelMessage(m)) continue;
    const blocks = [...messageText(m).matchAll(/<causality>\s*([\s\S]*?)\s*<\/causality>/g)];
    for (let b = blocks.length - 1; b >= 0; b--) {
      const factions = parseBlock(blocks[b][1]);
      if (factions) return { factions, messageId: m.message_id ?? i, found: true };
    }
  }
  return { factions: FACTIONS.map(name => ({ name, value: 0, delta: 0, reason: '无' })), messageId: null, found: false };
}
