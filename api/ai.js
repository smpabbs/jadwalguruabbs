// Vercel serverless proxy — fitur "AI Jadwal".
// Provider AI & kunci disimpan di sini (env), tidak pernah ke client.
// Client cukup mengirim { messages: [{role, content}] } (+ opsional model dari allowlist).
//
// Provider yang didukung:
//   1) Google Gemini  — dipakai bila env GOOGLE_API_KEY ada (model gratis: gemini-2.5-flash*)
//   2) OpenRouter     — dipakai bila env OPENROUTER_API_KEY ada (model :free allowlist)
// Jika keduanya ada, Gemini yang menang.
// Tanpa dependency: pakai fetch global (Node 18+).

// --- allowlist OpenRouter (model :free, di-verifikasi 2026-09-08) ---
var OR_ALLOWED = [
  'cohere/north-mini-code:free',
  'dots-studio/dots-3-note-preview:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'inclusionai/ling-3.0-flash-fin:free',
  'inclusionai/ling-3.0-flash-sante:free',
  'liquid/lfm-2.5-2.6b:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3.5-content-safety:free',
  'nvidia/nemotron-3.5-lightning:free',
  'poolside/laguna-s-2.1:free',
  'poolside/laguna-xs-2.1:free',
  'thinkingmachines/inkling-small:free',
  'thinkingmachines/inkling:free'
];
var OR_DEFAULT = 'google/gemma-4-31b-it:free';

// --- allowlist Google Gemini (model gratis/hemat) ---
var GG_ALLOWED = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite',
  'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3-flash-preview'];
var GG_DEFAULT = 'gemini-3.5-flash';
var GG_LITE = 'gemini-3.1-flash-lite';

function sendJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function originAllowed(origin) {
  if (!origin) return true; // non-browser (curl/test)
  if (origin === 'null') return false; // file:// — jangan layani
  var host = '';
  try { host = new URL(origin).hostname; } catch (e) { return false; }
  if (host === 'jadwalguruabbs.vercel.app') return true;
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (/\.vercel\.app$/i.test(host)) return true;
  return false; // capacitor://localhost ter-resolve ke hostname 'localhost'
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [], size = 0;
    req.on('data', function (c) {
      size += c.length;
      if (size > 20000) { reject(new Error('body_too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', function () { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', reject);
  });
}

function pickModel(bodyModel, provider) {
  if (provider === 'openrouter') {
    if (typeof bodyModel === 'string' && OR_ALLOWED.indexOf(bodyModel) !== -1) return bodyModel;
    var env = process.env.OPENROUTER_MODEL;
    if (typeof env === 'string' && OR_ALLOWED.indexOf(env) !== -1) return env;
    return OR_DEFAULT;
  }
  // google
  if (typeof bodyModel === 'string' && GG_ALLOWED.indexOf(bodyModel) !== -1) return bodyModel;
  return GG_DEFAULT;
}

function providerFor(rawModel, ggKey, orKey) {
  if (typeof rawModel === 'string') {
    if (GG_ALLOWED.indexOf(rawModel) !== -1) return ggKey ? 'google' : null;
    if (OR_ALLOWED.indexOf(rawModel) !== -1) return orKey ? 'openrouter' : null;
  }
  return ggKey ? 'google' : (orKey ? 'openrouter' : null);
}

function buildGeminiPayload(msgs) {
  var sysText = '';
  var contents = [];
  msgs.forEach(function (m) {
    if (m.role === 'system') { sysText += (sysText ? '\n' : '') + m.content; return; }
    contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
  });
  var payload = { contents: contents, generationConfig: { maxOutputTokens: 8192, temperature: 0.3, thinkingConfig: { thinkingBudget: 2048 } } };
  if (sysText) payload.system_instruction = { parts: [{ text: sysText }] };
  return payload;
}

async function callGemini(key, model, msgs) {
  var payload = buildGeminiPayload(msgs);
  return fetch('https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// Kirim ke OpenRouter (chat completions)
async function callOpenRouter(key, model, msgs) {
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://jadwalguruabbs.vercel.app',
      'X-Title': 'Jadwal Guru ABBS'
    },
    body: JSON.stringify({ model: model, messages: msgs, max_tokens: 800 })
  });
}

function extractText(provider, data) {
  if (provider === 'google') {
    return data && data.candidates && data.candidates[0] && data.candidates[0].content &&
      data.candidates[0].content.parts
      ? data.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join('').trim() : '';
  }
  return data && data.choices && data.choices[0] && data.choices[0].message
    ? String(data.choices[0].message.content || '').trim() : '';
}

module.exports = async function (req, res) {
  var origin = req.headers.origin || null;
  if (origin && !originAllowed(origin)) {
    return sendJson(res, 403, { ok: false, error: 'Asal permintaan tidak diizinkan.' });
  }
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') { return sendJson(res, 405, { ok: false, error: 'Gunakan POST.' }); }

  var ggKey = process.env.GOOGLE_API_KEY;
  var orKey = process.env.OPENROUTER_API_KEY;
  if (!ggKey && !orKey) {
    return sendJson(res, 500, { ok: false, error: 'Server AI belum dikonfigurasi (isi GOOGLE_API_KEY atau OPENROUTER_API_KEY).' });
  }

  var raw;
  try { raw = await readBody(req); } catch (e) {
    return sendJson(res, 413, { ok: false, error: 'Ukuran permintaan terlalu besar.' });
  }
  var body;
  try { body = JSON.parse(raw); } catch (e) {
    return sendJson(res, 400, { ok: false, error: 'Body bukan JSON valid.' });
  }
  var msgs = body && Array.isArray(body.messages) ? body.messages : null;
  if (!msgs || !msgs.length || msgs.length > 20) {
    return sendJson(res, 400, { ok: false, error: 'Format pesan tidak valid.' });
  }
  var totalLen = 0;
  for (var i = 0; i < msgs.length; i++) {
    var m = msgs[i];
    if (!m || (m.role !== 'system' && m.role !== 'user' && m.role !== 'assistant') ||
        typeof m.content !== 'string' || !m.content.length || m.content.length > 4000) {
      return sendJson(res, 400, { ok: false, error: 'Format pesan tidak valid.' });
    }
    totalLen += m.content.length;
  }
  if (totalLen > 12000) {
    return sendJson(res, 400, { ok: false, error: 'Percakapan terlalu panjang, mulai ulang.' });
  }

  var provider = providerFor(body.model, ggKey, orKey);
  if (!provider) {
    return sendJson(res, 200, { ok: false, error: 'Kunci utk model yang dipilih belum tersedia di server (perlu GOOGLE_API_KEY atau OPENROUTER_API_KEY).' });
  }
  var model = pickModel(body.model, provider);
  // Daftar model yg dicoba berurutan: model terpilih, lalu (khusus Gemini) versi lite sbg
  // cadangan saat 503/kuota — supaya pengguna jarang melihat error.
  var tries = provider === 'google' && model === GG_DEFAULT
    ? [model, GG_LITE] : [model];

  var lastUpstream = null;
  for (var t = 0; t < tries.length; t++) {
    try {
      lastUpstream = provider === 'google'
        ? await callGemini(ggKey, tries[t], msgs)
        : await callOpenRouter(orKey, tries[t], msgs);
    } catch (e) {
      return sendJson(res, 502, { ok: false, error: 'Gagal terhubung ke penyedia AI.' });
    }
    if (lastUpstream.ok) break;
    // retry hanya untuk status sibuk/transien (Gemini sering 503 di free tier)
    var retryable = lastUpstream.status === 503 || lastUpstream.status === 500 || lastUpstream.status === 429;
    if (!retryable || t === tries.length - 1) break;
    await new Promise(function (r) { setTimeout(r, 900); });
  }

  if (!lastUpstream.ok) {
    var friendly = 'Layanan AI error (' + lastUpstream.status + ').';
    var code = lastUpstream.status;
    if (code === 503 || code === 500) friendly = 'Model AI sedang sibuk, coba lagi beberapa saat, ya.';
    if (code === 429) friendly = 'Kuota/rate-limit model gratis sedang penuh. Coba lagi beberapa saat, ya.';
    if (code === 403 || code === 401) friendly = 'Kunci API AI bermasalah (' + code + '). Cek konfigurasi server.';
    if (code === 402) friendly = 'Kuota penyedia AI bermasalah (402).';
    return sendJson(res, 200, { ok: false, error: friendly });
  }

  var text = '';
  try {
    var data = await lastUpstream.json();
    text = extractText(provider, data);
  } catch (e) {
    return sendJson(res, 502, { ok: false, error: 'Respons penyedia AI tidak terbaca.' });
  }
  if (!text) {
    return sendJson(res, 502, { ok: false, error: 'Model tidak memberi jawaban. Coba lagi.' });
  }
  return sendJson(res, 200, { ok: true, text: text });
};
