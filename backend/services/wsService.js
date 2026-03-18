const { WebSocketServer, WebSocket } = require('ws');
const { verifyToken } = require('../middleware/auth');

const clients = new Map(); // userId -> Set<ws>

function initWS(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws, req) => {
    let userId = null;
    try {
      const token = new URL(req.url, 'http://x').searchParams.get('token');
      const p = verifyToken(token);
      userId = Number(p.sub);
      if (!clients.has(userId)) clients.set(userId, new Set());
      clients.get(userId).add(ws);
      ws.send(JSON.stringify({ type: 'connected', userId }));
    } catch { ws.close(1008, 'Unauthorized'); return; }

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('close', () => {
      if (userId && clients.has(userId)) {
        clients.get(userId).delete(ws);
        if (!clients.get(userId).size) clients.delete(userId);
      }
    });
    ws.on('error', () => {});
  });

  const hb = setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false; ws.ping();
    });
  }, 25000);
  wss.on('close', () => clearInterval(hb));
  console.log('✅ WebSocket server ready on /ws');
}

function pushToUser(userId, event) {
  const set = clients.get(Number(userId));
  if (!set) return;
  const msg = JSON.stringify({ ...event, ts: Date.now() });
  set.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
}

function pushToRole(role, event, allUsers) {
  for (const [uid] of clients) {
    const u = allUsers.find(x => x.id === uid);
    if (u && u.role === role) pushToUser(uid, event);
  }
}

function getOnlineCount() { return clients.size; }

module.exports = { initWS, pushToUser, pushToRole, getOnlineCount };
