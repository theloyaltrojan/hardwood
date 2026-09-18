// Hardwood Legends relay as a plain Node server - the same rooms and frames as worker.js, for running it
// yourself (behind anything that terminates TLS, so browsers get wss://) and for the test suite.
//   node relay/server.mjs [port]        needs the 'ws' package (npm install)
import { WebSocketServer } from 'ws';
import { MAX_GUESTS, MAX_FRAME, frameTarget, reframe, parseJoin } from './room.js';

export function startRelay(port = 0) {
  const rooms = new Map();   // room -> { host, guests: Map(id -> ws) }
  const wss = new WebSocketServer({ port, maxPayload: MAX_FRAME });
  wss.on('connection', (ws, req) => {
    const j = parseJoin('ws://relay' + req.url);
    if (!j) { ws.close(1008, 'bad room, role or id'); return; }
    let room = rooms.get(j.room);
    const refuse = (t, code) => { ws.send(JSON.stringify({ t })); ws.close(code, t); };
    // first come, first served, never replaced - the same rules as worker.js
    if (j.role === 'host' && room && room.host) return refuse('taken', 4001);
    if (j.role === 'guest') {
      if (!room || !room.host) return refuse('nohost', 1000);
      if (room.guests.size >= MAX_GUESTS) return refuse('full', 1000);
      if (room.guests.has(j.id)) return refuse('taken', 4001);
    }
    if (!room) rooms.set(j.room, (room = { host: null, guests: new Map() }));
    if (j.role === 'host') {
      room.host = ws;
      for (const id of room.guests.keys()) ws.send(JSON.stringify({ t: 'join', id }));
    } else {
      room.guests.set(j.id, ws);
      ws.send(JSON.stringify({ t: 'ready' })); room.host.send(JSON.stringify({ t: 'join', id: j.id }));
    }
    ws.on('message', (data, isBinary) => {
      if (!isBinary) {
        if (String(data) === '{"t":"ka"}') { ws.send('{"t":"ka"}'); return; }
        if (j.role !== 'host') return;
        let c; try { c = JSON.parse(String(data)); } catch (e) { return; }
        if (c && c.t === 'kick') { const g = room.guests.get(c.id); if (g) g.close(4002, 'kicked'); }
        return;
      }
      if (j.role === 'guest') { if (room.host && frameTarget(data) !== null) room.host.send(reframe(data, j.id)); return; }
      const to = frameTarget(data); const g = to && room.guests.get(to); if (g) g.send(reframe(data, 'host'));
    });
    ws.on('close', () => {
      if (j.role === 'host') {
        room.host = null;
        for (const g of room.guests.values()) { try { g.send(JSON.stringify({ t: 'hostgone' })); g.close(1000); } catch (e) { /* closing */ } }
        rooms.delete(j.room);
      } else if (room.guests.get(j.id) === ws) {
        room.guests.delete(j.id);
        if (room.host) room.host.send(JSON.stringify({ t: 'leave', id: j.id }));
      }
    });
  });
  return new Promise((res) => wss.on('listening', () => res({ port: wss.address().port, close: () => wss.close() })));
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const r = await startRelay(+(process.argv[2] || 8787));
  console.log('Hardwood Legends relay on ws://localhost:' + r.port);
}
