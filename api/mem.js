// Vercel serverless — ingatan antar-sesi utk fitur AI Jadwal.
// Penyimpanan: Vercel KV (Upstash REST) via env KV_REST_API_URL / KV_REST_API_TOKEN
// (fallback nama lama UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
// Fallback dev: MEM_LOCAL_FILE (file JSON lokal, jangan dipakai di produksi).
// Proteksi: enable butuh password (env MEMORY_PASSWORD); setelah itu server kasih token acak
// yg dipakai utk save/load. Tanpa dependency: pakai fetch global (Node 18+).
var crypto = require('crypto');

function env(k){ return process.env[k] || ''; }
function kvUrl(){ return env('KV_REST_API_URL') || env('UPSTASH_REDIS_REST_URL'); }
function kvToken(){ return env('KV_REST_API_TOKEN') || env('UPSTASH_REDIS_REST_TOKEN'); }

function sendJson(res, code, obj){
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function storeOk(){
  return !!(kvUrl() && kvToken()) || !!env('MEM_LOCAL_FILE');
}

// --- store abstraction ---
var memCache = null; // hanya utk MEM_LOCAL_FILE dalam satu instance
function storeGet(key){ return new Promise(function (resolve){
  if (env('MEM_LOCAL_FILE')){
    var fs = require('fs');
    try { var raw = fs.readFileSync(env('MEM_LOCAL_FILE'), 'utf8'); memCache = JSON.parse(raw || '{}'); } catch (e){ memCache = {}; }
    return resolve(memCache[key] != null ? memCache[key] : null);
  }
  fetch(kvUrl().replace(/\/$/, '') + '/get/' + encodeURIComponent(key), {
    headers: { Authorization: 'Bearer ' + kvToken() }
  }).then(function (r){ return r.json(); })
    .then(function (j){ resolve(j && j.result != null ? j.result : null); })
    .catch(function (){ resolve(null); });
}); }
function storeSet(key, value){ return new Promise(function (resolve){
  if (env('MEM_LOCAL_FILE')){
    var fs = require('fs');
    try { var raw = fs.readFileSync(env('MEM_LOCAL_FILE'), 'utf8'); memCache = JSON.parse(raw || '{}'); } catch (e){ memCache = {}; }
    memCache[key] = value;
    try { fs.writeFileSync(env('MEM_LOCAL_FILE'), JSON.stringify(memCache)); } catch (e) {}
    return resolve(true);
  }
  fetch(kvUrl().replace(/\/$/, '') + '/set/' + encodeURIComponent(key), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + kvToken(), 'Content-Type': 'text/plain' },
    body: String(value)
  }).then(function(){ resolve(true); }).catch(function(){ resolve(false); });
}); }
function storeDel(key){ return new Promise(function (resolve){
  if (env('MEM_LOCAL_FILE')){
    var fs = require('fs');
    try { var raw = fs.readFileSync(env('MEM_LOCAL_FILE'), 'utf8'); memCache = JSON.parse(raw || '{}'); } catch (e){ memCache = {}; }
    delete memCache[key];
    try { fs.writeFileSync(env('MEM_LOCAL_FILE'), JSON.stringify(memCache)); } catch (e) {}
    return resolve(true);
  }
  fetch(kvUrl().replace(/\/$/, '') + '/del/' + encodeURIComponent(key), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + kvToken() }
  }).then(function(){ resolve(true); }).catch(function(){ resolve(false); });
}); }

function okToken(t){ return typeof t === 'string' && /^[a-f0-9]{48}$/.test(t); }
function okPassword(pw){
  var want = env('MEMORY_PASSWORD');
  if (!want) return false;
  var a = crypto.createHash('sha256').update(String(pw || '')).digest();
  var b = crypto.createHash('sha256').update(want).digest();
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function sanitizeHistory(h){
  if (!Array.isArray(h)) return null;
  var out = [];
  for (var i = 0; i < h.length && out.length < 20; i++){
    var m = h[i];
    if (!m || (m.role !== 'user' && m.role !== 'assistant' && m.role !== 'system')) continue;
    var c = String(m.content || '').slice(0, 3000);
    if (!c.length) continue;
    out.push({ role: m.role, content: c });
  }
  return out;
}

module.exports = async function (req, res){
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS'){ res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST'){ return sendJson(res, 405, { ok: false, error: 'Gunakan POST.' }); }
  if (!storeOk()){
    return sendJson(res, 501, { ok: false, error: 'Penyimpanan ingatan belum dikonfigurasi (butuh Vercel KV atau MEM_LOCAL_FILE).' });
  }
  var raw = '';
  req.on('data', function (c){ if (raw.length < 40000) raw += c; });
  await new Promise(function (resolve){ req.on('end', resolve); req.on('error', resolve); });
  var body;
  try { body = JSON.parse(raw || '{}'); } catch (e){ return sendJson(res, 400, { ok: false, error: 'Body bukan JSON valid.' }); }
  var action = body.action;
  if (action === 'enable'){
    if (!okPassword(body.password)) return sendJson(res, 403, { ok: false, error: 'Password salah.' });
    var token = crypto.randomBytes(24).toString('hex');
    return sendJson(res, 200, { ok: true, token: token });
  }
  if (!okToken(body.token)) return sendJson(res, 401, { ok: false, error: 'Token tidak valid. Aktifkan lagi dengan password.' });
  var key = 'aiMem:' + body.token;
  if (action === 'load'){
    var got = await storeGet(key);
    var hist = [];
    if (got){ try { var obj = JSON.parse(got); if (Array.isArray(obj.h)) hist = obj.h; } catch (e) {} }
    return sendJson(res, 200, { ok: true, history: hist });
  }
  if (action === 'save'){
    var h = sanitizeHistory(body.history);
    if (!h) return sendJson(res, 400, { ok: false, error: 'Format riwayat tidak valid.' });
    await storeSet(key, JSON.stringify({ h: h, t: Date.now() }));
    return sendJson(res, 200, { ok: true });
  }
  if (action === 'disable' || action === 'delete'){
    await storeDel(key);
    return sendJson(res, 200, { ok: true });
  }
  return sendJson(res, 400, { ok: false, error: 'Aksi tidak dikenal.' });
};
