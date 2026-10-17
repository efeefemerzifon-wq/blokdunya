// BlokDünya çok oyunculu sunucu: node server.js  (PORT ortam değişkeni ile port seçilir)
const { WebSocketServer } = require('ws');
const fs = require('fs');
const PORT = process.env.PORT || 8080, FILE = 'world.json';
const W = 256, H = 48;
const edits = new Map();
try { for (const e of JSON.parse(fs.readFileSync(FILE))) edits.set(e[0] + ',' + e[1] + ',' + e[2], e); } catch (e) {}
const wss = new WebSocketServer({ port: PORT, maxPayload: 4096 });
let nid = 1, saved = true;
const send = (w, o) => w.readyState === 1 && w.send(JSON.stringify(o));
const all = (o, ex) => wss.clients.forEach(c => c !== ex && c.name && send(c, o));
const int = (v, a, b) => Number.isInteger(v) && v >= a && v < b;
wss.on('connection', ws => {
  ws.id = nid++;
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.t === 'join') {
      ws.name = String(m.name || 'Oyuncu').slice(0, 16);
      ws.color = /^#[0-9a-f]{6}$/i.test(m.color) ? m.color : '#cc4444';
      send(ws, { t: 'welcome', id: ws.id, edits: [...edits.values()].flat(),
        players: [...wss.clients].filter(c => c !== ws && c.name).map(c => ({ id: c.id, name: c.name, color: c.color, x: c.x, y: c.y, z: c.z, yaw: c.yaw })) });
      all({ t: 'join', id: ws.id, name: ws.name, color: ws.color }, ws);
    } else if (!ws.name) return;
    else if (m.t === 'pos') {
      if (![m.x, m.y, m.z, m.yaw].every(Number.isFinite)) return;
      ws.x = m.x; ws.y = m.y; ws.z = m.z; ws.yaw = m.yaw;
      all({ t: 'pos', id: ws.id, x: m.x, y: m.y, z: m.z, yaw: m.yaw }, ws);
    } else if (m.t === 'blk') {
      if (!(int(m.x, 0, W) && int(m.y, 1, H) && int(m.z, 0, W) && int(m.b, 0, 40))) return;
      edits.set(m.x + ',' + m.y + ',' + m.z, [m.x, m.y, m.z, m.b]); saved = false;
      all({ t: 'blk', x: m.x, y: m.y, z: m.z, b: m.b }, ws);
    }
  });
  ws.on('close', () => ws.name && all({ t: 'leave', id: ws.id }));
});
setInterval(() => { if (!saved) { fs.writeFileSync(FILE, JSON.stringify([...edits.values()])); saved = true; } }, 10000);
console.log('BlokDünya sunucusu çalışıyor, port ' + PORT);
 
