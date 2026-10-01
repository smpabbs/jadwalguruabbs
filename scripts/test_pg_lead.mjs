// Uji aturan T2 Leadership (opsi A, 2026-10-01) — jalankan: node scripts/test_pg_lead.mjs
import { readFileSync } from 'fs';
const src = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// --- extractor statement "var NAME = {...};" dengan brace matching sadar-string ---
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
const pgBlock = src.slice(src.indexOf('var pgTL='), src.indexOf('function pgNorm('));
const aiTT = src.slice(src.indexOf('function aiTierText'), src.indexOf('function aiFactsPengganti'));

const prelude = dataStmt + '\n' + piketStmt + '\n' + guruGenderStmt + `
var order=DATA.order, teachers=DATA.teachers, days=DATA.days, dayId=DATA.day_id, validByDay=DATA.valid_lessons_by_day;
var pgAbsenPick={}, pgAbsenList=[], pgDSel=null, pgJamLst={}, pgBlok={}, pgSEL={};
` + '\n' + pgBlock + '\n' + aiTT;
// jalankan di scope global lalu ambil lewat globalThis
(0, eval)(prelude + `
globalThis.__T = { order, teachers, guruGender, pgGenderGuru, pgRecBlok, pgRecPenuh, pgChip, pgRowChips,
  pgBuildBlok, pgJamMengajar, pgIsLead, pgLonggar, aiTierText, pgLT, pgAbsenList, pgDSel, pgJamLst, pgBlok, pgSEL,
  set(absen,d){ pgAbsenList=absen.slice(); pgDSel=d;
    [pgJamLst,pgBlok,pgSEL].forEach(function(o){ Object.keys(o).forEach(function(k){ delete o[k]; }); }); },
  blokOf(g,d){ pgJamLst[g]=pgJamMengajar(g,d); pgBlok[g]=pgBuildBlok(g,d,pgJamLst[g]); pgSEL[g]={}; return pgBlok[g]; } };
`);
const T = globalThis.__T;
const { teachers, pgLT, pgRecBlok, pgRecPenuh, pgChip, pgIsLead, aiTierText } = T;
const G = T.guruGender;

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  GAGAL: ' + msg); } };
const SESI = { 'Leadership 7': 'Monday', 'Leadership 8': 'Tuesday', 'Leadership 9': 'Wednesday' };

// === UJI 1: 45 kasus absen tunggal — T2 tidak pernah kosong, list tak pernah kosong ===
console.log('UJI 1: absen tunggal semua guru Leadership');
for (const [kelas, day] of Object.entries(SESI)) {
  for (const g of pgLT[kelas]) {
    T.set([g], day);
    const bl = T.blokOf(g, day).find(pgIsLead);
    ok(!!bl, g + ' punya blok Leadership di ' + day);
    const rr = pgRecBlok(g, day, bl.jams, kelas, g, bl.key);
    const timSameGender = pgLT[kelas].filter(n => n !== g && G(n) === G(g));
    ok(rr.lead === true, g + ': flag lead');
    ok(rr.t2a.length === timSameGender.length, g + ': T2=' + rr.t2a.length + ' = tim segender=' + timSameGender.length);
    ok(rr.t2a.length > 0, g + ': T2 TIDAK kosong');
    ok(!rr.t2a.includes(g), g + ': dirinya tidak masuk T2');
    ok((rr.t1.length + rr.t2a.length) > 0, g + ': list total tidak kosong');
    ok(rr.t1.every(n => G(n) === G(g) && pgLT[kelas].indexOf(n) === -1), g + ': T1 semua segender & di luar tim');
    ok(rr.t2a.every(n => G(n) === G(g) && pgLT[kelas].includes(n)), g + ': T2 semua segender & anggota tim');
    const idxBusy = rr.t2a.findIndex(n => bl.jams.every(j => !!teachers[n].cells[day + '|' + j]));
    if (idxBusy > -1) ok(rr.t2a.slice(0, idxBusy).every(n => bl.jams.every(j => !teachers[n].cells[day + '|' + j])), g + ': sort longgar-duluan');
  }
}

// === UJI 2: batch Senin 6 putra — dulu KOSONG TOTAL utk 3 guru L7 ===
console.log('UJI 2: batch Senin 6 putra');
const batch = ['Mr Ifan', 'Mr Musfiq', 'Mr Sharih', 'Mr Amar', 'Mr Jack', 'Mr Hang'];
T.set(batch, 'Monday');
for (const g of batch.filter(x => pgLT['Leadership 7'].includes(x))) {
  const bl = T.blokOf(g, 'Monday').find(pgIsLead);
  const rr = pgRecBlok(g, 'Monday', bl.jams, 'Leadership 7', g, bl.key);
  ok(rr.t2a.length > 0, g + ': T2 tidak kosong (dulu KOSONG TOTAL) -> ' + rr.t2a.join(', '));
  ok(!rr.t2a.some(n => batch.includes(n)), g + ': sesama batch tidak masuk kandidat');
}

// === UJI 3: chip — sibuk vs longgar ===
console.log('UJI 3: pgChip tandai sibuk/longgar');
T.set(['Mr Ifan'], 'Tuesday');
const blI = T.blokOf('Mr Ifan', 'Tuesday').find(pgIsLead);
const rrI = pgRecBlok('Mr Ifan', 'Tuesday', blI.jams, 'Leadership 8', 'Mr Ifan', blI.key);
const sibuk = rrI.t2a.find(n => blI.jams.every(j => !!teachers[n].cells['Tuesday|' + j]));
ok(!!sibuk, 'ada anggota tim yg sibuk utk dites');
const chipBusy = pgChip('Mr Ifan', sibuk, blI.key);
ok(chipBusy.includes('· sibuk'), 'chip sibuk ada "· sibuk" -> ' + chipBusy);
ok(!chipBusy.includes('pg-free'), 'chip sibuk tanpa ✓');
ok(chipBusy.includes('pg-selected') === false, 'chip belum terpilih');
const chipT1 = pgChip('Mr Ifan', rrI.t1[0], blI.key);
ok(chipT1.includes('pg-free'), 'chip T1 ada ✓ -> ' + chipT1);
// ✓ T1 harus berbasis jam blok (bukan semua jam guru absen)
ok(chipT1.includes(blI.jams.join(',') ), 'chip T1 menampilkan jam blok -> ' + chipT1);

// === UJI 4: reservasi lintas guru dihormati di T1 ===
console.log('UJI 4: reservasi lintas-guru');
T.set(['Mr Ifan', 'Mr Jack'], 'Tuesday');
T.blokOf('Mr Ifan', 'Tuesday'); T.blokOf('Mr Jack', 'Tuesday');
const blJ = T.pgBlok['Mr Jack'].find(pgIsLead);
const rrJ1 = pgRecBlok('Mr Jack', 'Tuesday', blJ.jams, 'Leadership 8', 'Mr Jack', blJ.key);
if (rrJ1.t1.length > 0) {
  const dipilih = rrJ1.t1[0];
  T.pgSEL['Mr Jack'][blJ.key] = dipilih;
  const blK = T.pgBlok['Mr Ifan'].find(pgIsLead);
  const rrJ2 = pgRecBlok('Mr Ifan', 'Tuesday', blK.jams, 'Leadership 8', 'Mr Ifan', blK.key);
  ok(!rrJ2.t1.includes(dipilih), dipilih + ' yang sudah direservasi tidak masuk T1 guru lain');
}

// === UJI 5: regresi blok KBM biasa ===
console.log('UJI 5: regresi blok KBM biasa');
T.set(['Mr Hang'], 'Saturday');
const bloks = T.blokOf('Mr Hang', 'Saturday');
ok(bloks.length > 0, 'Mr Hang Sabtu punya blok');
let semuaBiasa = true;
bloks.forEach(b => { const rr = pgRecBlok('Mr Hang', 'Saturday', b.jams, pgIsLead(b) ? b.kelas : null, 'Mr Hang', b.key); if (rr.lead) semuaBiasa = false; });
ok(semuaBiasa, 'blok Sabtu Mr Hang tidak salah terdeteksi lead');
// self-exclusion batch pada blok biasa
T.set(['Mr Hang', 'Mr Amar'], 'Saturday');
T.blokOf('Mr Hang', 'Saturday'); T.blokOf('Mr Amar', 'Saturday');
T.pgBlok['Mr Hang'].forEach(b => {
  const rr = pgRecBlok('Mr Hang', 'Saturday', b.jams, null, 'Mr Hang', b.key);
  ok(!rr.t1.includes('Mr Amar') && !rr.t2a.includes('Mr Amar') && !rr.t2b.includes('Mr Amar') && !rr.t3.includes('Mr Amar'), 'Mr Amar (absen) tidak jadi kandidat Mr Hang');
});

// === UJI 6: aiTierText menandai (sibuk) ===
console.log('UJI 6: aiTierText (sibuk)');
T.set(['Mr Ifan'], 'Tuesday');
const bl6 = T.blokOf('Mr Ifan', 'Tuesday').find(pgIsLead);
const rr6 = pgRecBlok('Mr Ifan', 'Tuesday', bl6.jams, 'Leadership 8', 'Mr Ifan', bl6.key);
const txt = aiTierText(rr6, 'Tuesday', bl6.jams);
ok(/\(sibuk\)/.test(txt), 'teks AI memuat (sibuk) -> ' + txt.split('\n').find(l => l.startsWith('T2')));
T.set(['Ms Dila'], 'Monday');
const txtBiasa = aiTierText(pgRecPenuh('Ms Dila', 'Monday', [4], 'Ms Dila', null), 'Monday', [4]);
ok(!txtBiasa.includes('(sibuk)'), 'teks AI blok biasa tanpa (sibuk)');

// === UJI 7: chip ALL (kartu emas) ===
console.log('UJI 7: chip ALL (kartu emas)');
T.set(['Mr Hang'], 'Saturday');
T.blokOf('Mr Hang', 'Saturday');
const pf = pgRecPenuh('Mr Hang', 'Saturday', T.pgJamLst['Mr Hang'], 'Mr Hang', null);
if (pf.t1.length) { const c = pgChip('Mr Hang', pf.t1[0], 'ALL'); ok(c.includes("'ALL'"), 'chip ALL memakai kunci ALL'); }

console.log('\nHASIL: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
