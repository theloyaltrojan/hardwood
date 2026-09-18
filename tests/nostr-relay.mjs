// Just enough of a nostr relay (NIP-01: EVENT, REQ, CLOSE) for the suite to find lobbies without the
// public relays - so a test measures the game, not somebody else's server.
import { WebSocketServer } from 'ws';
export function startNostrRelay() {
  const subs = new Map();   // ws -> Map(subId -> filter)
  const wss = new WebSocketServer({ port: 0 });
  const matches = (f, ev) => (!f.kinds || f.kinds.includes(ev.kind)) && (!f['#x'] || ev.tags.some((t) => t[0] === 'x' && f['#x'].includes(t[1])));
  wss.on('connection', (ws) => {
    subs.set(ws, new Map());
    ws.on('message', (raw) => {
      let m; try { m = JSON.parse(String(raw)); } catch (e) { return; }
      if (m[0] === 'REQ') subs.get(ws).set(m[1], m[2] || {});
      else if (m[0] === 'CLOSE') subs.get(ws).delete(m[1]);
      else if (m[0] === 'EVENT' && m[1] && m[1].id) {
        ws.send(JSON.stringify(['OK', m[1].id, true, '']));
        for (const [c, s] of subs) for (const [id, f] of s) if (matches(f, m[1])) c.send(JSON.stringify(['EVENT', id, m[1]]));
      }
    });
    ws.on('close', () => subs.delete(ws));
  });
  return new Promise((res) => wss.on('listening', () => res({ url: 'ws://127.0.0.1:' + wss.address().port, close: () => wss.close() })));
}
