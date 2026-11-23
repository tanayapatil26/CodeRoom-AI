const PALETTE = ['#2A55F5', '#D9480F', '#0B8A5F', '#9333EA', '#C2255C', '#0C8599', '#B7791F', '#4C6EF5'];

export function colorFor(id = '') {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
