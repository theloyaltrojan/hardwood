# Hardwood Legends relay

Multiplayer connects players **directly** (WebRTC) whenever it can. Some networks don't allow that:

- **School and work networks** often block UDP entirely. A managed Chromebook with that policy can't make a
  single peer-to-peer connection. The multiplayer panel shows *"this network blocks peer-to-peer"* when this happens.
- **Phones on mobile data** sit behind carrier NAT. Two of those, or one plus a strict home router, usually
  can't reach each other directly. Across ordinary networks roughly 1 connection in 5 needs a relay.

Anyone in those situations needs their traffic relayed. Every free, keyless relay on the internet was dead
as of September 2026, so you host your own. This folder is that relay. It is a Cloudflare Worker that runs
on the free plan, and the game switches to it automatically, for just the players who need it.

## Set it up (about 5 minutes)

Cloudflare's terms say the account holder must be 18 or older. **A parent or guardian should create and own the account.**

1. Create a free account at <https://dash.cloudflare.com/sign-up>. No card is needed for Workers.
2. From this folder, sign in and deploy:
   ```bash
   cd relay
   npx wrangler login
   npx wrangler deploy
   ```
   It prints a URL such as `https://hardwood-relay.yourname.workers.dev`.
3. In `index.html`, find `relay: null` under `CONFIG.net` and set it to that URL, changing `https` to `wss`:
   ```js
   relay: 'wss://hardwood-relay.yourname.workers.dev',
   ```
4. Commit and push. Everyone who loads the game after that has the relay.

### What the free plan covers

Only players who can't connect directly use the relay. Everyone else still plays peer-to-peer and costs
nothing. Each relayed player sends about 50 messages a second through it (their inputs plus the host's
snapshots to them). The free plan's 100,000 Durable Object requests a day, with WebSocket messages counted
20 to 1, works out to roughly **11 player-hours of relayed play per day**. That could be one blocked player
for 11 hours, or three for about 3½. Past that, the relay stops accepting for the rest of the day and those
players see the usual "no direct connection" message.

### Try it locally first

```bash
cd relay
npx wrangler dev          # no account needed
```
Then set `relay: 'ws://127.0.0.1:8787'` in `CONFIG.net` while testing.

## The other options

**TURN instead of the relay.** A TURN server is the standard WebRTC relay. [Metered](https://www.metered.ca/tools/openrelay/)
has a free tier (account holder 18+; check its current free data allowance on its dashboard). Create a credential in its dashboard and set:
```js
turn: [{ urls: 'turns:standard.relay.metered.ca:443?transport=tcp', username: '…', credential: '…' }],
```
Use the `turns:` URL on port 443. It's the only form that gets through strict networks, and Metered's plain TCP on 443 does not answer.
Alternatively, set `turnApi` to Metered's per-credential URL (`https://<app>.metered.live/api/v1/turn/credentials?apiKey=…`)
and the game fetches fresh credentials itself. You can use TURN together with the relay.

**Your own Node server.** `node relay/server.mjs 8787` runs the same relay anywhere Node runs. Put it behind
something that provides HTTPS, so browsers can reach it as `wss://`.

## A note on school networks

The relay is for networks that block the *kind* of traffic multiplayer uses, which is common and harmless.
It won't help if a school filter blocks the game itself. That is the school's decision, and the way to change
it is to ask their IT.

## How it works

- **Finding a lobby.** The code never goes to a server of ours. It becomes a topic, and host and guest swap
  encrypted connection offers through several public nostr relays at once. Those only pass messages along.
  The topic comes out of PBKDF2 (150,000 rounds), so it can't be worked back to the 8-character code, and
  without the code the offers can't be read.
- **Joining.** The guest tries a direct connection. If its network blocks UDP, or the connection doesn't
  open within 9 seconds, and the host has a relay, the guest switches to the relay.
- **The relay itself.** It knows rooms, one host and up to 16 guests. A room's name is derived from the code
  and never published anywhere. The relay passes frames between them and rewrites the sender, so nobody can
  pose as someone else. It refuses a second host and a reused guest name rather than replacing anyone. The code is in `room.js`, shared
  by `worker.js` (Cloudflare) and `server.mjs` (Node).
