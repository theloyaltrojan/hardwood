// Hardwood Legends relay - the part both hosts share: what a room is and how frames move through it.
//
// A room is one lobby, named by the lobby's topic (a hash of the code - the relay never sees the code).
// It holds one host and up to MAX_GUESTS guests. Every game message is a binary frame:
//
//   [kind: 1 = text, 2 = binary] [id length] [id bytes] [payload]
//
// From a guest the id is ignored and rewritten to that guest's own id before the host gets it, so a guest
// cannot pretend to be anyone else. From the host the id names the guest it is for, and is rewritten to
// 'host' on the way out. The relay itself only ever speaks small JSON text messages:
//   to a guest: {t:'ready'} joined · {t:'nohost'} no such lobby · {t:'full'} · {t:'hostgone'} the host left
//   to the host: {t:'join', id} · {t:'leave', id}
//   to anyone asking for a name already in use: {t:'taken'} - a host or guest is never replaced by a newcomer
//   from the host: {t:'kick', id} · from anyone: {t:'ka'} keepalive, answered with the same
// The room name is derived from the lobby code and never published, so only people with the code find it.
export const MAX_GUESTS = 16;
export const MAX_FRAME = 64 * 1024;

export const validRoom = (room) => typeof room === 'string' && /^[0-9a-f]{40}$/.test(room);
export const validId = (role, id) => (role === 'host' ? id === 'host' : role === 'guest' && typeof id === 'string' && /^g[0-9a-f]{16}$/.test(id));

const te = new TextEncoder(), td = new TextDecoder();
const bytes = (data) => (data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength));

// The id a frame is addressed to, or null when it is not a well-formed frame.
export function frameTarget(data) {
  const u = bytes(data);
  if (u.length < 2 || (u[0] !== 1 && u[0] !== 2) || u.length < 2 + u[1]) return null;
  return td.decode(u.subarray(2, 2 + u[1]));
}

// The same frame with its id replaced.
export function reframe(data, id) {
  const u = bytes(data), idb = te.encode(id), body = u.subarray(2 + u[1]);
  const out = new Uint8Array(2 + idb.length + body.length);
  out[0] = u[0]; out[1] = idb.length; out.set(idb, 2); out.set(body, 2 + idb.length);
  return out;
}

// Parse the query a client connects with. Returns null for anything that is not a valid room, role and id.
export function parseJoin(url) {
  const q = new URL(url).searchParams;
  const room = q.get('room'), role = q.get('role'), id = q.get('id');
  return validRoom(room) && validId(role, id) ? { room, role, id } : null;
}
