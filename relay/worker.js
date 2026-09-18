// Hardwood Legends relay on Cloudflare Workers - free plan, no card. One Durable Object per room, so everyone
// in a lobby lands on the same instance wherever they are. It uses the hibernation API: a room with nobody
// talking costs nothing and survives the object being evicted, because who is who lives on the sockets
// themselves (tags and attachments), not in memory. Deploy: see README.md in this folder.
import { MAX_GUESTS, MAX_FRAME, frameTarget, reframe, parseJoin } from './room.js';

export default {
  async fetch(req, env) {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Hardwood Legends relay. Games connect here over WebSocket.\n', { headers: { 'content-type': 'text/plain' } });
    const j = parseJoin(req.url);
    if (!j) return new Response('bad room, role or id', { status: 400 });
    return env.ROOMS.get(env.ROOMS.idFromName(j.room)).fetch(req);
  },
};

const JOINED = JSON.stringify({ t: 'ready' }), HOSTGONE = JSON.stringify({ t: 'hostgone' });

export class Room {
  constructor(ctx) {
    this.ctx = ctx;
    // Keepalives are answered by the runtime itself, without waking the object or counting as a request.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ka"}', '{"t":"ka"}'));
  }
  live(ws) { const a = ws.deserializeAttachment() || {}; return !a.gone && a.role !== 'refused'; }
  guests() { return this.ctx.getWebSockets().filter((ws) => this.live(ws) && (ws.deserializeAttachment() || {}).role === 'guest'); }
  host() { return this.ctx.getWebSockets('host').find((ws) => this.live(ws)) || null; }
  refuse(server, client, t, code) {
    // accept only to say why, then close: a refused upgrade tells the browser nothing
    this.ctx.acceptWebSocket(server, ['refused']); server.serializeAttachment({ role: 'refused' });
    server.send(JSON.stringify({ t })); server.close(code, t);
    return new Response(null, { status: 101, webSocket: client });
  }

  async fetch(req) {
    const { role, id } = parseJoin(req.url);
    const [client, server] = Object.values(new WebSocketPair());
    const host = this.host();
    // First come, first served, and never replaced: nobody gets to take over a host or a guest by connecting
    // with the same name. A host that dropped is gone before it can come back, so it loses nothing.
    if (role === 'host' && host) return this.refuse(server, client, 'taken', 4001);
    if (role === 'guest') {
      if (!host) return this.refuse(server, client, 'nohost', 1000);
      if (this.guests().length >= MAX_GUESTS) return this.refuse(server, client, 'full', 1000);
      if (this.ctx.getWebSockets(id).some((ws) => this.live(ws))) return this.refuse(server, client, 'taken', 4001);
    }
    this.ctx.acceptWebSocket(server, [role === 'host' ? 'host' : id]);
    server.serializeAttachment({ role, id });
    if (role === 'guest') { server.send(JOINED); host.send(JSON.stringify({ t: 'join', id })); }
    else for (const g of this.guests()) server.send(JSON.stringify({ t: 'join', id: g.deserializeAttachment().id }));
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, msg) {
    const a = ws.deserializeAttachment() || {};
    if (!this.live(ws)) return;
    if (typeof msg === 'string') {
      if (a.role !== 'host') return;
      let c; try { c = JSON.parse(msg); } catch (e) { return; }
      if (c && c.t === 'kick' && typeof c.id === 'string') for (const g of this.ctx.getWebSockets(c.id)) g.close(4002, 'kicked');
      return;
    }
    if (msg.byteLength > MAX_FRAME) return;
    if (a.role === 'guest') { const h = this.host(); if (h && frameTarget(msg) !== null) h.send(reframe(msg, a.id)); return; }
    const to = frameTarget(msg); if (!to || to === 'host') return;
    for (const g of this.ctx.getWebSockets(to)) if (this.live(g)) g.send(reframe(msg, 'host'));
  }

  webSocketClose(ws) { this.gone(ws); }
  webSocketError(ws) { this.gone(ws); }
  gone(ws) {
    const a = ws.deserializeAttachment() || {};
    if (!this.live(ws)) return;
    ws.serializeAttachment({ ...a, gone: true });
    if (a.role === 'host') for (const g of this.guests()) { try { g.send(HOSTGONE); g.close(1000, 'host left'); } catch (e) { /* already closing */ } }
    else if (a.role === 'guest') { const h = this.host(); if (h) h.send(JSON.stringify({ t: 'leave', id: a.id })); }
  }
}
