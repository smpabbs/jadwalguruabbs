// Uji alur UI "Cari Guru Pengganti" di jsdom — fokus regresi bug v5.9.0:
// picker #pgPick ganda saat 'Ganti hari' / 'Ganti jam' (picker baru kosong, tak bisa dilanjut).
// Jalankan: node scripts/test_pg_ui.mjs  (butuh jsdom)
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// --- ekstraksi statement data (sama dgn test_pg_lead.mjs) ---
function extractStmt(s, startMarker) {
  const i = s.indexOf(startMarker);
  if (i < 0) throw new Error('marker tidak ketemu: ' + startMarker);
  const b0 = s.indexOf('{', i);
  let depth = 0, inStr = null;
  for (let j = b0; j < s.length; j++) {
    const c = s[j];
    if (inStr) { if (c === inStr && s[j - 1] !== '\\') inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return s.slice(i, s.indexOf(';', j) + 1); }
  }
  throw new Error('tidak ketemu akhir statement: ' + startMarker);
}
const dataStmt = extractStmt(src, 'var DATA =');
const piketStmt = extractStmt(src, 'var PIKET =');
const gi = src.indexOf('function guruGender');
const guruGenderStmt = src.slice(gi, src.indexOf('\n', gi));
// seluruh blok fungsi pg: dari var pgTL sampai sebelum seksi AI
const pgAll = src.slice(src.indexOf('var pgTL='), src.indexOf('// ===== AI JADWAL'));

// --- DOM stub dgn elemen yg dipakai modul pg ---
const dom = new JSDOM(`<!DOCTYPE html><body>
<div id="pgChat"></div><div id="pgAC"></div><div id="pgChips"></div>
<div id="pgStatus" style="display:none"><span class="pg-s-text"></span><button class="pg-btn-ok"></button></div>
<div id="pgGuruStrip"></div><input id="pgInput"><button id="pgSend"></button>
</body>`);
global.document = dom.window.document;
global.window = dom.window;

const prelude = dataStmt + '\n' + piketStmt + '\n' + guruGenderStmt + `
var order=DATA.order, teachers=DATA.teachers, days=DATA.days, dayId=DATA.day_id, validByDay=DATA.valid_lessons_by_day;
var pgAbsenPick={}, pgAbsenList=[], pgDSel=null, pgJamLst={}, pgBlok={}, pgSEL={}, pgParsial={}, pgOff={};
var pgInitDone=false, pgACEl=null, pgChatEl=null, pgHURRUF=['A','B','C','D','E','F'], pgPickEl=null;
`;
(0, eval)(prelude + '\n' + pgAll + `
globalThis.__UI = { pgHandle, pgPilihHari, pgJamToggle, pgJamLanjut, pgJamPenuh, pgReset, pgCommitAbsen, initPengganti,
  pgJamMengajar, pgBuildBlok, order,
  pickRef(){ return pgPickEl; },
  setAbsen(list){ pgAbsenPick={}; list.forEach(function(n){ pgAbsenPick[n]=true; }); pgCommitAbsen(); } };
`);
const UI = globalThis.__UI;

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  GAGAL: ' + msg); } };
const w = ms => new Promise(r => setTimeout(r, ms));
const pickers = () => document.querySelectorAll('.pg-pick-wrap');

// pilih fixture: guru + 2 hari dgn blok >=2 di hari pertama (agar bisa uncentang 1 blok)
let g1 = null, d1 = null, d2 = null;
outer:
for (const d of days) {
  for (const g of UI.order) {
    const bl = UI.pgBuildBlok(g, d, UI.pgJamMengajar(g, d));
    if (bl.length >= 2) { g1 = g; d1 = d;
      d2 = days.find(x => x !== d && UI.pgBuildBlok(g, x, UI.pgJamMengajar(g, x)).length >= 1) || null;
      break outer; }
  }
}
ok(!!g1 && !!d2, 'fixture guru 2 hari: ' + g1 + ' ' + d1 + ' & ' + d2);

console.log('ALUR: pilih guru -> pilih hari -> picker -> uncentang 1 blok -> lanjut -> Ganti jam -> Ganti hari');
UI.initPengganti(); await w(1100);            // sambutan (typing)
UI.setAbsen([g1]); await w(1100);             // commit absen -> quiz hari
UI.pgPilihHari(days.indexOf(d1)); await w(2300); // pilih hari -> typing -> picker
ok(pickers().length === 1, 'satu picker tampil (d1)');
ok(document.querySelectorAll('.pg-pk-item').length >= 2, 'picker berisi >=2 baris blok');
const key0 = UI.pgBuildBlok(g1, d1, UI.pgJamMengajar(g1, d1))[0].key;
UI.pgJamToggle(g1, key0);                      // uncentang blok pertama
ok(!UI.pickRef().querySelector('.pg-btn-go').disabled, 'tombol Lanjut aktif setelah uncentang');
UI.pgJamLanjut(); await w(1100);               // -> hasil rekomendasi
ok(document.getElementById('pgHasil') !== null, 'hasil rekomendasi tampil');

UI.pgHandle('Ganti jam'); await w(2300);       // buka ulang picker (jalur pgPickEl=null + pesan lama masih ada)
ok(pickers().length === 1, 'Ganti jam: tetap TEPAT satu picker di DOM (bug: bisa 2)');
ok(UI.pickRef() !== null && UI.pickRef().querySelectorAll('.pg-pk-item').length >= 2, 'Ganti jam: picker baru TERISI');
ok(UI.pickRef() === document.getElementById('pgPick'), 'referensi pgPickEl menunjuk picker yang benar');

UI.pgHandle('Ganti hari'); await w(1100);      // balik ke quiz hari
UI.pgPilihHari(days.indexOf(d2)); await w(2300);
ok(pickers().length === 1, 'Ganti hari: tetap TEPAT satu picker di DOM (bug: bisa 2)');
ok(UI.pickRef() !== null && UI.pickRef().querySelectorAll('.pg-pk-item').length >= 1, 'Ganti hari: picker baru TERISI');
UI.pgJamLanjut(); await w(1100);
ok(document.getElementById('pgHasil') !== null, 'alur selesai: hasil tampil setelah Ganti hari');

console.log('\nHASIL: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
